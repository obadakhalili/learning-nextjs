
## Next.js and High Traffic

Prerequisites: caching layers (notes.md), deployment architecture (deployment-architecture.md).

---

### The core insight

A server rendering the same HTML for 100,000 users is doing the same work 100,000 times. The goal of high-traffic architecture is to do work *once* and reuse the result.

Everything in this guide is a variation of that idea.

---

### Chapter 1: Static routing scales infinitely

If a route is prerendered (static or ISR), the response is cached at the CDN. The CDN has copies in 100+ locations worldwide:

```
100,000 users → CDN (cached) → cached HTML → response
                      ↑
         origin server: 0 requests, 0 DB queries
```

Dynamic routes cannot be CDN-cached (`Cache-Control: private, no-cache`). Every request goes through your server:

```
100,000 users → origin server → render → DB query → response
                      ↑
              50,000 requests dying here
```

**The practical implication:** at high traffic, the question "should this route be static or dynamic?" is a load question, not just an architectural preference. A route that's dynamic unnecessarily is burning server capacity on identical work.

---

### Chapter 2: ISR and the stale-while-revalidate guarantee

"But my content changes — I can't use static forever."

ISR (`next.revalidate: 3600`) handles this. After the TTL expires, the cache entry is marked **stale but not deleted**. Requests still hit CDN and get the stale response. One background refresh fires on the origin.

```
Cache expires at t=60min
10,000 users arrive simultaneously
  → ALL 10,000 get stale response from CDN (cache entry still exists)
  → ONE background rebuild fires on origin
  → t=60min + 2s: fresh HTML stored
  → next requests get fresh content
```

Nobody waits. The origin sees exactly one request regardless of concurrent traffic. This is the stale-while-revalidate guarantee — the thundering herd problem (all users hitting origin at expiry) simply cannot happen with SWR.

---

### Chapter 3: When thundering herd IS a risk

Stale-while-revalidate avoids the thundering herd. **Purge-based invalidation does not.**

`updateTag` and `revalidatePath` immediately delete the cache entry. The period between purge and re-cache is a window of guaranteed misses:

```
updateTag('products') fires
  → cache entry deleted
  → next 10,000 requests → all miss → all hit origin → all DB queries
  → DB overloads
```

This is the correct tool when a user needs to see their own change immediately (one user, one request, one miss). Using it for background content updates at scale is dangerous.

**The right tool per use case:**

- Background content update (CMS publishes post) → `revalidateTag('posts', 'max')` (SWR, no misses)
- User mutated something, must see result immediately → `updateTag('cart')` (purge, one miss)

**The other mitigation: granular tags.**

Coarse tags amplify purge impact:

```ts
// bad: one product updates → all product pages become misses simultaneously
cacheTag('products')
updateTag('products')
```

Granular tags limit it:

```ts
// good: one product updates → only that product's pages become misses
cacheTag(`product:${id}`)
updateTag(`product:${id}`)
```

At high traffic, the blast radius of a purge is proportional to how broad your tags are. Per-resource tags mean an invalidation affects one page, not ten thousand.

---

### Chapter 4: DB connection pooling under load

See deployment-architecture.md for full context. Short version:

On serverless (Vercel), concurrent requests mean concurrent function instances, each with their own DB connection. 1,000 concurrent requests → 1,000 connection attempts → DB refuses → crash.

Fix: connection pooler (PgBouncer, Neon, Prisma Accelerate). Functions connect to the pooler, pooler shares a bounded set of real connections.

Reducing DB calls also helps: `use cache` on DB queries means fewer actual hits:

```ts
async function getProducts() {
  'use cache'
  cacheLife('hours')
  return db.query('SELECT * FROM products')
}
// 1,000 concurrent requests → 1 DB query (first), 999 cache hits
```

This is separate from the connection pool — it reduces how often you need a connection at all.

---

### Chapter 5: The edge as a pre-filter

Expensive requests that never should have reached your origin are wasted capacity.

Proxy.ts runs at CDN nodes globally, before your origin server. Cheap operations here cost almost nothing at any scale:

**Auth redirect at edge:**

```ts
// proxy.ts
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')
  if (!token) return NextResponse.redirect(new URL('/login', request.url))
  return NextResponse.next()
}
```

Unauthenticated users never reach your origin. At 10,000 bot requests per second, your origin sees 0 of them.

**Rate limiting at edge:**

```ts
export async function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anon'
  const { success } = await ratelimit.limit(ip)  // Upstash Redis (edge-compatible)
  if (!success) return new NextResponse('Too Many Requests', { status: 429 })
  return NextResponse.next()
}
```

Requires an edge-compatible key-value store (Upstash Redis, Vercel KV) — standard Redis clients won't work in edge runtime.

**What can't go at the edge:** DB queries, Prisma/Drizzle, complex business logic, any Node.js package. Edge runtime is constrained to Web standard APIs only. Proxy is for cheap checks, not application logic.

---

### Chapter 6: PPR for mixed pages

ISR is all-or-nothing per page — the entire page is static, or the entire page is dynamic. A product page with mostly static content (name, images, description) but one dynamic widget (current stock) must either:

- Be fully static (stale stock data), or
- Be fully dynamic (re-render everything for every user)

PPR breaks this. The static shell serves from CDN. Only the dynamic holes compute per request:

```tsx
export default async function ProductPage({ params }) {
  const { id } = await params
  const product = await getProduct(id)  // static — same for everyone

  return (
    <article>
      <h1>{product.name}</h1>           {/* static shell — CDN */}
      <img src={product.image} />       {/* static shell — CDN */}
      <p>{product.description}</p>      {/* static shell — CDN */}

      <Suspense fallback={<StockSkeleton />}>
        <StockAvailability id={id} />   {/* dynamic hole — per request */}
      </Suspense>

      <Suspense fallback={<CartSkeleton />}>
        <CartCount />                   {/* dynamic hole — per user */}
      </Suspense>
    </article>
  )
}
```

At high traffic:

```
100,000 requests to /products/42
  → shell (h1, img, p): CDN serves all 100,000, origin: 0 requests
  → StockAvailability: origin handles 100,000 (small, targeted)
  → CartCount: origin handles 100,000 (small, per-user)
```

Without PPR, all 100,000 requests would trigger a full page render including all the static content. With PPR, the static majority never touches the origin. Server load is proportional only to the dynamic holes.

**ISR vs PPR for a mixed page:** ISR re-renders the entire page every N minutes. PPR re-renders only the dynamic holes on every request but never re-renders the static shell (it's prerendered once and stays).

---

### The cost hierarchy

Think of serving a request as a stack of cost levels. At high traffic, you want to push requests as far up the stack as possible:

```
1. CDN hit (static HTML from Full Route Cache)
   cost: near zero, latency: ~5ms, scales to billions

2. Edge function (proxy.ts — auth check, rate limit, redirect)
   cost: very cheap, latency: ~10ms, globally distributed, no cold start

3. Origin server render, no DB calls
   cost: compute only, latency: ~100ms

4. Origin server render + cached DB query (use cache / Data Cache hit)
   cost: compute + cache lookup, latency: ~150ms

5. Origin server render + real DB query
   cost: compute + DB connection + query time, latency: ~300ms+
   limited by connection pool
```

At low traffic: most requests live at level 5 and nobody notices. At high traffic: level 5 is where things die.

The architecture work of high-traffic Next.js is pushing requests up this stack:

- Static/ISR pages → level 1
- Proxy auth redirects → level 2 (instead of level 5)
- PPR static shell → level 1, dynamic holes → level 4–5
- `use cache` on DB queries → level 4 (instead of level 5)

---

### Interview framing

> "How would you handle high traffic on a Next.js app?"

1. **Make as much static as possible.** Static routes are CDN-served — origin load is zero.
2. **Use ISR for content that changes.** `next.revalidate` gives you freshness without server load, using stale-while-revalidate to avoid thundering herds.
3. **Use PPR for mixed pages.** Static shell from CDN, dynamic holes streamed per request.
4. **Design cache tags at the resource level.** Coarse tags cause cascading invalidations under load. Per-resource tags limit blast radius.
5. **Use `use cache` for expensive sub-operations.** Even dynamic routes can cache DB-heavy work.
6. **Put cheap checks at the edge.** Auth redirects and rate limiting in proxy.ts never reach the origin.
7. **Use a connection pooler on serverless.** Required if deployed to Vercel or any serverless platform.

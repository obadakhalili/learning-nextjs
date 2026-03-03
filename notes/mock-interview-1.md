# Mock Technical Interview — Next.js (CDON)

Context: simulated technical interview for a Next.js role at CDON, a Nordic e-commerce marketplace (30k orders/day). Format mirrors the real interview brief: technical questions + discussions + live coding.

---

## Q1 — Rendering Strategies

**Q:** Categorize different parts of a CDON product page by rendering strategy: product title, stock level, cart icon in the header, reviews section.

**Answer:** Static-first rule of thumb. Layout/navbar → SSG (render once at build time, cached). Product info → ISR with granular cache tags per resource type (tag for title/images, separate tag for stock). Revalidating a data cache tag cascades to invalidate the full route cache. Cart icon → dynamic (needs user-specific request-time data).

**Feedback:**

- Solid. The cascade from data cache → full route cache on tag invalidation is the key insight.
- Good catch on granular tags: title/images change rarely (long revalidation or pure SSG fine), stock can change every few minutes (short revalidation or on-demand invalidation). Treat them separately.
- PPR: the cart icon doesn't require the whole page to be dynamic. Enable with `experimental: { ppr: 'incremental' }` in `next.config.js` and `export const experimental_ppr = true` on the page. Most of the page stays static, dynamic "holes" render on each request.

---

## Q2 — Server Components vs Client Components

**Q:** Difference between Server and Client Components. Can a Client Component render a Server Component as a child?

**Answer:** Two module graphs: server and client. Server Components run on the server only, can use Node APIs, never ship to the client. Client Components render on the server during initial SSR for HTML, then their runtime is the browser (hooks, event listeners, browser APIs). You can pass a Server Component into a Client Component via props/children — the Server Component renders on the server, its output (React elements) is passed as props. If a Client Component imports a Server Component directly, it pulls it into the client module graph and it becomes a client component.

**Feedback:**

- Correct. The children/props pattern works because the Server Component runs first and produces already-rendered React elements — the client never needs the function itself, just the serialized output.

---

## Q3 — Caching Layers

**Q:** Walk through Next.js App Router caching layers. What happens when two Server Components call the same `fetch()` URL? Where does the full route cache fit?

**Answer:**

- **Request memoization (React cache):** per-request, server memory only. Deduplicates identical `fetch` calls (or any function wrapped in `React.cache`) within a single request.
- **Data cache:** KV store on the filesystem, persists across requests and deployments. Stores return values of functions using `use cache` directive (or fetch with cache options). Tag-based invalidation cascades to the full route cache.
- **Full route cache:** stores rendered output (HTML + RSC payload) of static routes on the filesystem. Populated at build time, grows at runtime for new dynamic slugs. Only applies to statically rendered routes — dynamic routes bypass it entirely.
- **Router cache:** browser memory, stores RSC payloads of visited routes. Clears on page refresh.

**Feedback:** All four layers correct. Key addition: full route cache only stores _static_ routes. A route that reads cookies or calls `noStore()` never enters the full route cache.

---

## Q4 — Streaming & Suspense

**Q:** A product page has: product info (fast, own DB), seller reviews (~800ms, external), recommendations (~600ms, external). What happens without streaming, and how does Suspense streaming improve UX?

**Answer:** Without streaming — sequential fetches: page takes sum of all fetch times. Parallel: bottlenecked by the slowest fetch. With streaming: static parts + Suspense loading fallbacks sent in initial HTML chunk. As each suspended component resolves, its RSC payload is flushed as a new chunk over the open connection.

**Feedback:**

- Correct mechanics.
- Sibling components kick off fetches independently — parallelism is natural. For parent-child nesting, use the data preloading pattern: initiate the fetch high in the tree (without awaiting) so it's already in-flight before the child renders.
- Product info is fast and is primary content — `await` it at the page level rather than wrapping in a Suspense boundary (skeleton flash for 50ms is worse UX, and it's in the initial HTML for SEO).

---

## Q5 — Live Coding: Server Action + Optimistic UI

**Q:** Build an `AddToCartButton` that calls a Server Action and optimistically updates a cart count immediately.

**Solution:** [`src/app/user-cart/`]

**Architecture:**

- Server Component (`page.tsx`) fetches products and cart in parallel with `Promise.all`, passes to Client Component
- `useOptimistic(userCart.length, (current, delta) => current + delta)` for the count
- `useTransition` wraps the server action call — `setOptimisticCartCount(1)` fires immediately inside the transition
- `revalidatePath` in the server action resyncs real state after settlement
- `disabled={isPending}` prevents double-clicks

**Score: 8/10**

**Gap:** `optimisticCartCount` updates immediately but the `"(In Cart)"` label per product only appears after `revalidatePath` triggers a full rerender. Fix: use `useOptimistic` on the full cart array (not just the count) so both the count and per-item state derive from a single optimistic source.

**Note on rollback:** `useOptimistic` automatically reverts to the real value when the transition ends if the server didn't confirm — no manual rollback needed.

---

## Q6 — Middleware & Locale Routing

**Q:** CDON operates in Sweden, Norway, Denmark, Finland. How do you use Next.js Middleware for locale detection and routing?

**Answer:** Read `Accept-Language` header in middleware, match against supported locales, redirect to `/<lang>/<path>`. Define app routes under `app/[lang]/` so `lang` is available in `params`. Use `generateStaticParams` to pre-render all locale variants at build time.

**Feedback:**

- Correct. Middleware runs in Edge Runtime (V8 + Web APIs only, no Node.js APIs), deployed to edge nodes geographically close to users on platforms like Vercel.
- **Always configure a `matcher`** to exclude static assets — without it, middleware runs on every `_next/static/`, `_next/image`, and favicon request:
  ```ts
  export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  };
  ```
- After detecting locale, store it in a cookie so subsequent requests use the cookie instead of re-running header detection. Also lets users override their locale without being overridden back.

---

## Q7 — URL-driven Search

**Q:** Product search page that is SEO-friendly, URL-driven (shareable), and instant on typing.

**Solution:** [`src/app/products-list/`]

**Architecture:**

- Server Component passes all products to a Client Component
- Client Component uses `useSearchParams()` to filter — during SSR, `useSearchParams` reads the actual request URL, so the initial HTML contains the correctly filtered list (SEO covered)
- `window.history.pushState(null, "", `?name=${value}`)` updates the URL without triggering a Next.js server request
- `useSearchParams` reacts to `pushState` and re-renders client-side only (instant, no server trip)

**Score: 8/10**

**Gap:** input is uncontrolled — if you navigate directly to `?name=keyboard`, the input is empty even though the list is filtered. Fix: `defaultValue={searchParams.get("name") ?? ""}` on the input.

**Note:** `window.history.pushState` is explicitly supported by Next.js as a lighter alternative to `router.replace`. `useSearchParams`, `usePathname`, and `useRouter` all stay in sync with native history calls.

---

## Q8 — Error Handling

**Q:** `error.tsx`, `not-found.tsx`, `global-error.tsx` — what each does, when it triggers, and what to put in each for CDON.

**Answer:**

- `not-found.tsx`: rendered when `notFound()` is explicitly called — not for unmatched routes. Used for resource-not-found cases (e.g., product ID doesn't exist, route matches but resource doesn't).
- `error.tsx`: the component rendered by the error boundary wrapping the page. Has a `reset()` callback to clear the boundary and retry. Key set to route path so navigating away resets the boundary. Ignores Next.js signal errors (thrown by `notFound()`, `redirect()`).
- `global-error.tsx`: final catch-all boundary, catches errors in the root layout that `error.tsx` can't reach.

**Feedback:**

- `error.tsx` wraps the page but NOT the layout. If an error throws in the layout, you need an `error.tsx` one level up. `global-error.tsx` at the root handles root layout errors — and must render its own `<html>` and `<body>` tags since the layout is gone.
- In production: log to Sentry/Datadog inside `useEffect(() => { Sentry.captureException(error) }, [error])`. Never render `error.message` directly to users — log it, don't display it.
- Segment-specific error messages: an error boundary inside `/account` can render a different message than the global one.

---

## Q9 — Authentication & Protected Routes

**Q:** Implementing auth and route protection in App Router — where does session checking happen, what mechanism, how do Server vs Client Components access user data?

**Answer:**

- Middleware: intercept requests to protected routes, redirect if no valid session
- Data access layer: every function that reads or modifies data verifies auth before proceeding (defense in depth)
- Client Components: a Server Component calls `getUser()`, passes result to a Client Component context provider. Context consumers can read the user object.

**Feedback:**

- Three-layer defense is the recommended Next.js pattern (they call it Data Access Layer).
- Middleware validates session using cookies + Web Crypto API (JWT decryption/verification). Works at the edge because it's pure cryptography — no DB lookup needed.
- Tradeoff: middleware can't check if a session was revoked (no DB access). Short-lived tokens reduce the window. For sensitive operations (checkout, account changes), the data access layer does full validation including a DB lookup.

---

## Q10 — Cache Invalidation in Production

**Q:** Product manager updates a price in the CMS. Price appears on product detail page, 3 category pages, homepage featured section. Full strategy to propagate the change.

**Answer:** Granular tags derived from product metadata:

- `product-id-{id}` — invalidates the product detail page
- `product-cat-{category}` for each category the product belongs to — invalidates category listing pages
- `products-featured` — invalidates homepage featured section

CMS sends a webhook to a Next.js Route Handler. The handler verifies a shared secret token, then calls `revalidateTag` for all relevant tags.

**Feedback:**

- Correct and complete.
- SWR vs immediate purge for pricing: price _increases_ → use `revalidateTag('tag')` (immediate purge, deprecated form but correct choice here — can't show a lower price than you'll charge). Price _decreases_ → `revalidateTag('tag', 'max')` (SWR is fine — showing a slightly higher price briefly is just a pleasant surprise).

---

## Q11 — Performance & Images

**Q:** Category listing page, LCP is 4.5s. Images are suspected. Diagnosis and fix.

**Answer:** Use `next/image` for automatic optimizations (format conversion, responsive resizing). Diagnose with Chrome DevTools profiler.

**Feedback — key techniques:**

- **`priority` prop** is the most impactful LCP fix. `Image` lazy-loads by default — above-the-fold images should have `priority={true}`, which injects a `<link rel="preload">` so the browser fetches them immediately. Apply to roughly the first row of products.
- **`sizes` prop** — tells Next.js the display size per viewport so it generates and serves the right resolution (no 2000px image for a 200px thumbnail).
- **Format** — `Image` automatically serves WebP/AVIF. Make sure you're not bypassing it with raw `<img>` tags.
- **Lighthouse** identifies the LCP element directly so you know exactly which image to target.

---

## Q12 — Testing (skipped — answer provided)

- **Unit:** plain functions and data access layer — standard Jest/Vitest
- **Component:** Client Components with React Testing Library. Server Components are async and need Node environment + DB — awkward to unit test directly; test the underlying data functions instead.
- **Integration/E2E:** Playwright or Cypress. Best layer for testing Server Components, routing, middleware, and server actions end-to-end.
- **Practical approach:** unit test the data access layer and business logic; E2E test critical user journeys (search → product → add to cart → checkout).

---

## Q13 — SEO & Metadata

**Q:** Dynamic metadata for a product page. `metadata` vs `generateMetadata`.

**Answer:** `metadata` for static metadata known at build time. `generateMetadata` is an async function called with request context for dynamic metadata (e.g., product name from DB).

**Feedback:**

- `generateMetadata` can `await` data fetches. If the page component fetches the same data, wrap the fetch function in `React.cache` — Next.js deduplicates the call so it runs once despite being called from both `generateMetadata` and the page component.

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.slug); // deduplicated via React.cache
  return {
    title: `${product.name} — CDON`,
    description: product.description,
    openGraph: { title: product.name, images: [product.imageUrl] },
  };
}
```

---

## Q14 — Live Coding: Product Detail Page

**Q:** `/products/[id]` with `generateStaticParams`, on-demand generation for unknown slugs, `notFound()` for missing products, `generateMetadata`, show name and price.

**Solution:** [`src/app/products/[id]/`]

**Score: 8.5/10**

**What was correct:**

- `generateStaticParams` returning `{ id }` objects
- `generateMetadata` with async `params` (Next.js 15 pattern where params is a Promise)
- `notFound()` call for missing products
- Co-located `not-found.tsx`

**Gap:** `fetchProduct` is a plain async function called in both `generateMetadata` and the page component — runs twice. Fix with `React.cache`:

```ts
import { cache } from "react";

const fetchProduct = cache(async (id: string) => {
  return products.find((p) => p.id === id);
});
```

---

## Q15 — Architecture Under Load (Flash Sale)

**Q:** 10x traffic spike during a flash sale. What absorbs the load, what are the weak points, how do you harden before the sale?

**Answer:** Static content + PPR → full route cache → CDN (infinitely scalable, geographically distributed). Granular cache tags minimize recomputation on revalidation. Data cache reduces DB hits. Middleware at the edge reduces origin trips.

**Feedback — weak points not covered:**

**Weak points:**

- **Cart and checkout are fully dynamic** — user-specific, can't be CDN-cached, every request hits origin and DB. Solutions: DB connection pooling (PgBouncer), read replicas, per-user rate limiting on checkout.
- **ISR thundering herd** — when a cache entry is invalidated mid-sale, many requests can simultaneously trigger fresh fetches before the cache repopulates. SWR strategy (`revalidateTag('tag', 'max')`) mitigates this: stale content serves while one background revalidation happens.

**Hardening before the sale:**

- **Pre-warm the cache** — crawl all product and category pages before the sale starts so the full route cache is fully populated. No cold-start misses when traffic spikes.
- **Rate limiting in middleware** — enforce per-user rate limits at the edge before requests reach the server.
- **Raise revalidation intervals** during the sale window — less cache churn when traffic is highest.

---

## Areas to Review

- `React.cache` for request memoization / deduplication across `generateMetadata` + page component
- `window.history.pushState` is supported by Next.js — `useSearchParams`, `usePathname`, `useRouter` all stay in sync with native history calls (no server RSC fetch triggered)
- ISR thundering herd and SWR strategy as mitigation
- DB connection pooling and rate limiting as the last line of defense for dynamic routes under load
- `priority` prop on `next/image` as the primary LCP fix
- `global-error.tsx` must render its own `<html>` and `<body>` tags

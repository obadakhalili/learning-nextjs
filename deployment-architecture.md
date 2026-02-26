
## Next.js Deployment Architecture

---

### The three deployment models

**1. `next start` — persistent Node.js server (self-hosted)**

`next build` produces a build artifact. `next start` runs a Node.js process that serves it. That process stays alive and handles all incoming requests.

```
User → Node.js process (always running) → response
```

One process, one connection pool, shared across all requests. Traditional server model — what you probably picture when you think "web server."

**2. Vercel — serverless + CDN**

Vercel compiles each dynamic route and Route Handler into a separate self-contained bundle called a serverless function. When a request comes in, Vercel spins up an instance of that function to handle it.

```
User → Vercel infrastructure → function instance handles request → response
```

No long-running process. Each function instance handles one request. 50 concurrent requests → up to 50 instances running simultaneously. Instances are isolated — they don't share memory or connections.

**3. Other cloud platforms**

You can run Next.js as a Docker container (persistent server, same as `next start`) or as serverless functions on AWS Lambda / GCP Cloud Run via adapters like [OpenNext](https://opennext.js.org/). The behavior follows the model you choose.

---

### Serverless: what "cold start" and "warm instance" mean

Spinning up a new function instance from scratch takes time — downloading the bundle, initializing the runtime, running module-level code. This is a **cold start** (~few hundred ms to a few seconds depending on bundle size).

Platforms reuse instances when possible. After a request completes, the instance stays alive briefly waiting for another request. If a new request arrives before it's killed, it reuses the same instance without cold start overhead. This is a **warm instance**.

You cannot rely on warm instance state. Under load, Vercel scales out to many instances, and you can't predict which one handles your request. Any in-memory state (like a module-level variable) might be there from a previous request or might not exist at all. This is why Next.js caches persist to external storage (disk, Vercel KV) rather than process memory — process memory isn't shared across instances.

---

### The DB connection problem (serverless-specific)

Traditional server: one process, one connection pool of ~20 connections, shared across all requests.

```
1,000 concurrent requests → same process → same 20 connections (queued)
```

Serverless: each instance creates its own connections. Under load:

```
1,000 concurrent requests → up to 1,000 instances → up to 1,000 DB connections
```

PostgreSQL has a `max_connections` limit (typically 100–500). Exceeded → DB refuses connections → app crashes. This doesn't happen on a persistent server.

**Fix: connection pooler**

A pooler (PgBouncer, Prisma Accelerate, Neon's built-in pooler) sits between your functions and the DB. Functions connect to the pooler, the pooler manages a bounded set of real DB connections:

```
1,000 function instances → pooler → 20 actual DB connections → DB
```

Each function "checks out" a connection, uses it for one query, returns it — never holding it while waiting. The pooler makes serverless and DBs compatible.

HTTP-based DB clients (Neon, PlanetScale) avoid the problem entirely — each query is a stateless HTTP request, no persistent connection.

---

### The edge runtime

**What "runtime" means:** the environment that executes your JavaScript. Different runtimes expose different APIs.

| Runtime | Available APIs |
|---|---|
| Node.js | Everything: `fs`, DB clients, native modules, Web APIs |
| Browser | DOM, `window`, `fetch`, `localStorage` |
| Edge (V8 Isolate) | Web standard APIs only: `fetch`, `Request`, `Response`, `crypto`, cookies |

The edge runtime is a stripped-down V8 (Chrome's JS engine) with no Node.js built-ins. No Prisma, no Drizzle, no `fs`. Only APIs defined in web standards.

**What "the edge" means geographically:** CDN providers have servers in 100+ cities worldwide. Traditionally CDNs served only static files. "Edge computing" means running actual code at those CDN nodes — code that executes close to the user, before the request reaches a central origin.

```
User in Berlin
     ↓
Frankfurt CDN node (the "edge") ← code runs here
     ↓ (only if needed)
Origin server in US Virginia
```

Without edge: every request travels to the origin regardless of where the user is. With edge: cheap, stateless operations (auth check, redirect) run in the user's region with ~5ms latency instead of crossing an ocean.

**Where edge runtime appears in a Next.js app:**

`proxy.ts` runs in edge runtime by default — this is a deliberate framework design decision. It's intended for cheap pre-request logic (auth redirect, rate limiting, URL rewriting) that benefits from global distribution and zero cold start.

Route Handlers can opt in: `export const runtime = 'edge'`.

Everything else (pages, Server Components, Server Actions) runs in Node.js runtime.

**How Next.js controls which environment runs what:**

`next build` produces different output bundles for each runtime. Edge code is compiled into lightweight bundles compatible with V8 isolates. Node.js code is compiled into standard Node.js-compatible bundles. Vercel reads this and deploys accordingly — edge bundles to CDN nodes, Node.js bundles as serverless functions.

On self-hosted (`next start`): middleware still runs in the edge runtime, but on your single server — no global distribution. "Edge runtime" here just means the code is constrained to Web APIs, not that it runs at CDN nodes.

---

### Cache-Control headers and CDN interaction

HTTP responses carry headers alongside the body. `Cache-Control` tells anyone holding the response (browser, CDN, proxy) how to cache it.

**Static route response:**

```
Cache-Control: public, s-maxage=31536000, stale-while-revalidate
```

- `public` — shared caches (CDNs, proxies) are allowed to store this
- `s-maxage=31536000` — CDNs should keep this for 1 year
- `stale-while-revalidate` — if stale, serve the old copy while refreshing in background

**Dynamic route response:**

```
Cache-Control: private, no-cache
```

- `private` — only the end user's browser may cache this, CDNs must not
- `no-cache` — don't serve from cache without checking origin first

Next.js sets these headers automatically based on rendering mode. The CDN reads them and decides whether to cache.

**Physical flow for a static route:**

```
First request to /posts
  → request hits CDN
  → CDN has nothing (cache miss) → forwards to origin
  → Next.js renders, responds with Cache-Control: public, s-maxage=...
  → CDN stores the response
  → user gets HTML

All subsequent requests to /posts
  → CDN serves cached copy — origin never involved
```

On Vercel: build-time prerendered pages (Full Route Cache) are uploaded to the CDN during deployment. There is no "first request" cache miss — the CDN has the pages before any user arrives.

On self-hosted: the CDN primes on first request. You need to put your own CDN (Nginx, CloudFront, Cloudflare) in front. Next.js sets the headers correctly, but whether a CDN reads them is your infrastructure choice.

---

### Where each cache layer lives per deployment model

| Cache Layer | Vercel | Self-hosted |
|---|---|---|
| Request Memoization | Server process memory (same in both — scoped to one request) | Same |
| Data Cache | Vercel's persistent KV store | `.next/cache` on disk (or Redis adapter) |
| Full Route Cache | Vercel Edge CDN (global) | `.next/server` on disk |
| Router Cache | Browser memory (same in both — client-side) | Same |

"Across deployments" for Data Cache on Vercel: Vercel's KV store is separate from your deployment artifact. You deploy new code → KV entries remain. The Data Cache outlives deploys. On self-hosted, `.next/cache` is on disk — if you redeploy by replacing the directory, you lose the cache.

---

### Deployment model comparison

| | `next start` (self-hosted) | Vercel |
|---|---|---|
| Server model | Persistent Node.js process | Serverless functions |
| DB connection pooling | Not needed (one pool) | Required (many instances) |
| CDN | Manual setup | Automatic, global |
| Middleware global distribution | No — runs on your server | Yes — runs at CDN nodes |
| Cold starts | No | Yes (warm instances mitigate) |
| Horizontal scaling | Manual (load balancer + multiple instances) | Automatic |
| Full Route Cache | `.next/` on disk | CDN edge network |
| Data Cache | `.next/cache` on disk | Vercel KV (persistent across deploys) |

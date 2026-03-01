# Next.js Revision Notes — Things to Get Right

This document is generated from exam-1 grading. It covers only the concepts where the answers were incomplete, imprecise, or outright wrong. It explains each concept mechanistically and concretely — the goal is to understand how things work, not to memorize facts.

---

## 1. The Two-Pass Server Rendering Model

### Pass 1: The RSC Pass

The server traverses the component tree and serializes it into the RSC Payload, which is React's wire format (the Flight protocol). This pass has specific rules:

- **Server components** are executed fully. Their return value (JSX tree) is serialized.
- **Client components** are NOT executed. They are left as references in the payload: something like `["$", "ClientComp", null, { props }]`. The actual client component code is not run here.
- **Suspended async server components** are NOT replaced with their fallback in this pass. They are marked as PENDING references in the payload. This is important — the fallback is handled in Pass 2, not here.
- Props passed between server components are serialized using the Flight protocol, which can handle Maps, Sets, JSX, and Promises in addition to normal JSON values.

### Pass 2: The SSR Pass

The SSR pass takes the RSC Payload as input and produces HTML. This is where:

- PENDING references (suspended components) are rendered as their fallback HTML. So the fallback the user sees in the initial HTML comes from this pass.
- Client components ARE executed here — but with strict limitations: `useState` returns initial values only, `useEffect` is skipped entirely, event handlers produce no output. They run just enough to produce the static HTML structure. This is necessary so the client gets real HTML for client components instead of empty slots.

### The Two Outputs and Their Consumers

The two outputs serve completely different consumers at completely different points in time:

- **HTML** → consumed by the browser's built-in HTML parser. This fires before any JavaScript downloads or runs. The browser renders pixels immediately from this.
- **RSC Payload** → consumed by React's reconciler after React's JS bundle finishes downloading. React uses it to attach event handlers, initialize state, and take over interactivity. This is hydration.

They are not "the same information in two formats." They serve different systems at different times. The HTML gives you the visual structure immediately; the RSC payload gives React the virtual DOM structure to reconcile against the live DOM.

---

## 2. `'use client'` is a Module Graph Boundary, Not a Component Tag

The most common misunderstanding: `'use client'` is described as marking a component as "client-side." That's imprecise in a way that causes real bugs.

What `'use client'` actually does: it marks a **module graph boundary**. Any file that has `'use client'` at the top is a boundary file. Everything that gets imported from that file — directly or transitively — joins the client module graph.

The practical consequence: if you write a server component in `server-thing.tsx` and then import it from a `'use client'` file, `server-thing.tsx` is no longer a server component. Its code will be bundled and shipped to the browser. If it contains server-only code (database calls, secrets), you'll get runtime errors — or worse, secret leaks.

The only safe way to render a server component inside a client component is to pass it as a prop (typically `children`), from a server parent that sits outside the client module graph:

```tsx
// page.tsx — this is a server component, outside the client graph
import CartModal from "./cart-modal"; // client component
import CartItems from "./cart-items"; // server component

export default function Page() {
  // CartModal can render CartItems because Page (server) is passing it as children
  // CartItems is never imported by cart-modal.tsx, so it stays in the server graph
  return (
    <CartModal>
      <CartItems />
    </CartModal>
  );
}

// cart-modal.tsx
"use client";
export default function CartModal({ children }: { children: React.ReactNode }) {
  return <div className="modal">{children}</div>;
}
```

The module graph is determined statically at build time from import chains. The app tree is runtime. These are different things.

---

## 3. The Four Cache Layers — Full Picture

### Request Memoization

- **What it is:** For the duration of a single request, identical function calls are deduplicated. The second call returns the cached result instead of re-executing.
- **How to activate it:**
  - For `fetch` calls: automatic. Next.js deduplicates identical fetch calls within a request without you doing anything.
  - For DB/ORM calls: you must manually wrap the function with `React.cache()`. Without this, every server component that calls `getUser()` makes a separate DB query.
- **Scope:** One request only. Cleared automatically between requests. Not persisted anywhere.
- **Why it matters for DAL:** If your layout, page, and a child component all call `getUser()`, wrapping it in `React.cache` means the cookie is read and the DB is queried exactly once per request.

### Data Cache

- **What it is:** Persistent storage (server filesystem by default, KV store on Vercel) for the results of `fetch` calls and `use cache` functions.
- **Scope:** Across requests and deployments.
- **When cleared:**
  - Time-based: `revalidate` option expires entries, then stale-while-revalidate serves the old data while background regeneration happens.
  - Event-based: `revalidateTag` immediately purges entries — this is NOT stale-while-revalidate. The next request gets no cached result and fetches fresh data as part of that request. `updateTag` also purges immediately but is Server Action only (not available in Route Handlers).

### Full Route Cache

- **What it is:** Cached HTML + RSC Payload for entire static routes. Stored on the server filesystem (or CDN on some platforms).
- **When populated:** At build time for static routes; on first request for on-demand static routes (dynamic routes with `generateStaticParams` and `dynamicParams = true`).
- **When cleared:** By `revalidatePath` OR by `revalidateTag` — when a tag is invalidated, any route that depends on that tag gets cleared too. Both paths invalidate the Full Route Cache.

### Router Cache

- **What it is:** Client-side cache in the browser's memory. Stores RSC payloads for routes the user has visited or that were prefetched.
- **Stale times (Next.js 15):**
  - Static routes: 5 minutes stale time.
  - Dynamic routes: 0 seconds — every forward navigation re-fetches.
- **Important nuance — back/forward navigation:** Back and forward button navigation ALWAYS restores from the Router Cache regardless of staleness. This is by design — it gives instant back/forward behavior. Only forward navigation (Link click, `router.push`) respects the staleness window.
- **Automatic clearing:** When a Server Action completes (e.g., form submit), Next.js automatically invalidates the Router Cache for affected routes. Also: cookie mutations inside a Server Action clear the Router Cache.

---

## 4. `self.__next_f.push` — Why the Array Push Pattern

When you view the HTML source of a Next.js page, you see inline scripts like:

```html
<script>self.__next_f.push([1, "...RSC payload chunk..."])</script>
<script>self.__next_f.push([1, "...another chunk..."])</script>
```

Why this pattern instead of just `<script>window.__payload = {...}</script>`?

**Reason 1: Streaming.** The RSC payload doesn't arrive all at once. As Suspense boundaries on the server resolve (async components finish their work), new chunks get streamed as additional script tags appended to the HTML. Each one calls `.push()` to add to the array. A single JSON object cannot be incrementally appended to. The array accumulates chunks as they stream in, giving React a complete picture once it reads the array.

**Reason 2: React hasn't loaded yet.** When the browser parses those inline `<script>` tags, React's JavaScript bundle hasn't downloaded yet. The push calls execute immediately during HTML parsing and store the data. React only reads from the array later, after its bundle finishes downloading and runs. The array is a mailbox — data arrives during parsing, React collects it when ready.

If it were a simple assignment like `window.__payload = {...}`, it would require: (1) the full payload to be available all at once, and (2) React to magically know the variable name. The push array model handles both streaming delivery and async consumption.

---

## 5. Soft Navigation Internals — Client State and Layouts

### What the server does during soft navigation

The server receives the request along with the **Router State Tree header** — a header Next.js sends that describes which layouts are already rendered on the client. Using this, the server skips those layouts in its RSC response. It only returns the RSC payload for the changed parts.

Critically: during soft navigation, **client components are not executed on the server at all**. There's no SSR pass. The server returns only the RSC payload, and client components appear as references in it, to be reconciled by React on the client.

### How client component state is preserved

React on the client diffs the old virtual tree against the new RSC payload by **tree position**. If a component occupies the same position in the old and new trees, React keeps it mounted and preserves its state. The server knows nothing about this — it just sends RSC payloads. React's diffing algorithm on the client is entirely responsible for deciding what to keep.

### How layouts stay mounted

Layouts don't unmount on sub-route navigation because React's diff sees them in the same position in both trees and keeps them mounted. The Router State Tree header tells the server which layouts are already rendered so the RSC response is smaller — but it's React's client-side diffing that actually prevents layouts from unmounting, not the header itself.

---

## 6. Security: Why Layout Auth Checks Are Insufficient

Two separate failure modes for putting auth checks only in a layout:

**Failure mode 1: Soft navigation skips layout re-renders.**

Layouts don't re-render when you click a `<Link>` to navigate within the same segment. The layout stays mounted. If a user's session expires after they've loaded the dashboard, they can keep clicking sub-routes via Link and the `verifySession()` in the layout never fires again. The session expiry is invisible to them.

**Failure mode 2: Server Actions and Route Handlers are plain HTTP endpoints.**

Hiding a button in the UI is completely irrelevant to security because Server Actions and Route Handlers are callable directly, independent of any rendered UI:

```bash
curl -X POST https://myapp.com/admin \
  -H "Next-Action: abc123" \
  -d '["target-user-id"]'
```

This calls the Server Action. The fact that the button didn't render for this user is irrelevant.

**The correct pattern:** `verifySession()` must be called inside every data access function and every Server Action, unconditionally. Not in layouts (rendering concern). Not in UI conditionals. In the data functions themselves, which always run fresh per-request regardless of navigation type. Wrap `verifySession()` in `React.cache()` so that multiple calls within one request don't re-read the cookie and re-query the DB multiple times.

---

## 7. `use cache` — The Two Modes and Their Differences

`use cache` is not just a caching directive — it behaves fundamentally differently depending on context.

### Mode 1: No runtime dependencies

If a `use cache` function doesn't access any request-scoped data (no `cookies()`, no `headers()`, no `searchParams`), it runs at **build time**. The result is baked into the static output. Every request gets the same precomputed result. There's one cache entry. The result is refreshed on a schedule via `cacheLife`.

### Mode 2: Receives runtime values as arguments, inside Suspense

If a `use cache` function is called from inside a Suspense boundary and receives runtime values as arguments (e.g., a `userId`), it runs at **request time** for the first call with a given set of inputs. The result is cached **keyed by those inputs**. Future requests with the same inputs skip the function entirely. Different inputs = different cache entry.

This is the important distinction from `React.cache`: `React.cache` resets with every request (Request Memoization scope). `use cache` in Mode 2 persists **across requests**, stored in the Data Cache.

### The constraint that applies to both modes

`cookies()`, `headers()`, and `searchParams` cannot be called directly inside a `use cache` function. The reason: `use cache` produces a deterministic cached result for given inputs, but these APIs return different values for different requests — they're request-scoped, not input-scoped. At build time there's no request at all, so calling them throws immediately. At runtime, calling them inside `use cache` also throws because their output can't be part of a cache key.

The fix: read the dynamic values outside the cached function and pass them as plain arguments:

```ts
// WRONG
async function getUserData(userId: string) {
  "use cache";
  const token = cookies().get("auth"); // throws
  return db.users.findById(userId);
}

// CORRECT
async function getUserData(userId: string, token: string) {
  "use cache"; // token is now part of the cache key
  return db.users.findById(userId);
}

// In the component (outside use cache):
const token = cookies().get("auth")?.value;
const user = await getUserData(userId, token);
```

---

## 8. Parallel Routes — `page.tsx` vs `default.tsx` in Slots

This is specific to the slot context (`@slotName/`), not to general routing.

Inside a slot like `@preview/`:

- **`@preview/page.tsx`** renders when the slot has a matching route for the current URL — i.e., you're navigating to a path that the slot explicitly defines a page for.
- **`@preview/default.tsx`** is the fallback that renders when the current URL has **no matching branch in this slot**. For example, if you navigate to `/editor/settings` but `@preview` only has a page at `/editor`, the `default.tsx` renders instead of the slot throwing a 404.

These are not interchangeable. If you rename `default.tsx` to `page.tsx`:

- You gain: the slot renders at the root URL (`/editor`).
- You lose: the unmatched fallback. When the user navigates to any sub-route without a matching slot branch, Next.js has nothing to render for that slot and throws a 404 or error. There's no safety net.

---

## 9. Intercepting Routes — Complete Rules

### When interception applies vs when canonical wins

The rule is purely about navigation type, not about "initial page load" specifically:

- **Soft navigation** (clicking a `<Link>`, calling `router.push`) → interception applies. The intercepting route renders instead of the canonical.
- **Hard navigation** (direct URL entry, browser refresh, opening in a new tab) → the canonical route wins. No interception.

### The notation

- `(.)segment` — intercepts a route at the same level.
- `(..)segment` — intercepts a route one level up in the directory tree.
- `(...)segment` — intercepts a route from the app root.

This matters for the correct file structure. If you're in `/gallery` and want to intercept `/photos/[id]` (a top-level route), you need `(..)photos/[id]` inside the gallery folder, not `(.)photos/[id]`. Using `(.)` would only work if `/gallery/photos/[id]` existed as a sibling.

### The parallel slot pairing pattern

Intercepting routes almost always pair with a `@modal` parallel slot. Here's why: without a slot, the intercepted route replaces the gallery page content entirely. With a `@modal` slot, the gallery page stays visible in `{children}` and the modal renders in `{modal}`.

```
app/
  gallery/
    @modal/
      (..)photos/[id]/
        page.tsx        ← renders as modal overlay on soft nav
      default.tsx       ← returns null (no modal showing by default)
    layout.tsx          ← receives { children, modal }
    page.tsx            ← the gallery grid
  photos/
    [id]/
      page.tsx          ← canonical full-page view on hard nav
```

On soft nav from gallery: `@modal/(..)photos/[id]/page.tsx` renders in the modal slot, gallery stays in `children`. On hard nav to `/photos/[id]`: `app/photos/[id]/page.tsx` renders, no interception.

---

## 10. Route Handlers vs Server Actions — The Precise Differences

| Property | Route Handler | Server Action |
|---|---|---|
| HTTP method | Any (GET, POST, PUT, DELETE, PATCH, etc.) | Always POST |
| Available at build time? | GET handlers CAN be statically cached (if no dynamic APIs used) | N/A (mutation-focused) |
| Callable from | External systems, third parties, webhooks | Client components within the app |
| Primary use case | Public API surface, webhooks, OAuth callbacks | Internal data mutations |
| Request type | Normal HTTP | POST with `Next-Action` header |

The antipatterns:

**Calling a Route Handler from a Server Component** is wrong for two reasons: (1) at build time, Route Handlers aren't running, so the call fails during prerendering. (2) Even at runtime, you're making an HTTP round trip to your own server — adding network latency to call yourself. The fix is to extract the shared logic into a plain TypeScript function and call it directly.

**Using a Server Action for data fetching** is wrong because Server Action calls are scheduled through React's transition system. The fix is the same: extract to a plain function and call it from the server component directly. No HTTP, no scheduling, just a function call.

---

## 11. ISR Stale-While-Revalidate — The Two-Request Sequence

After a cached route's revalidation window expires, the next two requests behave differently:

- **Request 1 (after expiry):** The user gets the **stale cached page** (served immediately from Full Route Cache). In the background, Next.js regenerates the page by re-running the server component and storing the fresh result.
- **Request 2:** The user gets the **fresh page** that was generated during Request 1's background task.

So it takes two requests after expiry for any user to see fresh content. If you need immediate freshness after a specific event (like a CMS publish), use on-demand revalidation with `revalidateTag` or `revalidatePath` instead of relying on the time window.

---

## 12. Next.js Middleware (Proxy) — Runtime Precision

### What runtime it uses

Middleware always runs in the **Edge Runtime** regardless of where you deploy. The Edge Runtime is not the same as deploying to an edge network — these are two separate concepts:

- **Edge Runtime:** A restricted JavaScript environment based on V8. No Node.js APIs. No file system, no native modules, no `child_process`. This is always what middleware uses.
- **Edge network (Vercel-specific):** A globally distributed infrastructure where your middleware code runs close to users. This is a deployment topology, not a runtime feature. You can use the Edge Runtime without deploying to Vercel's edge network.

### What APIs are available

The Edge Runtime does NOT have Node.js APIs, but it DOES have Web Platform APIs:

- `fetch`, `Request`, `Response`, `Headers` — full web fetch API
- `cookies()`, `NextRequest.cookies` — cookie access
- `URL`, `URLSearchParams` — URL manipulation
- `TextEncoder`, `TextDecoder`, `Blob` — standard encoding

What it lacks: anything Node-specific (file system, `crypto` module, native addons, etc.).

### Why middleware alone cannot fully authorize users

Middleware can decode a JWT and check its signature locally without any network call. But it cannot verify whether the token has been revoked. Revocation requires a lookup in a session store or database — which requires Node.js APIs or a network call to a service that has them. Since middleware can't access the DB directly, it can only catch invalid signatures and expired tokens, not revoked-but-still-valid tokens. That's why middleware acts as a first-line filter, and the actual authorization check must happen in the Data Access Layer where DB access is available.

---

## 13. `generateStaticParams` + `dynamicParams`

`generateStaticParams` returns an array of parameter values that Next.js should prerender at build time. But what happens when a user visits a path that wasn't in that array?

That's where `dynamicParams` comes in:

- **`dynamicParams = true` (the default):** If a path isn't prerendered, Next.js renders it on-demand at first request and stores the result in the Full Route Cache. Subsequent requests for the same path get the cached version. This is on-demand static generation.
- **`dynamicParams = false`:** Any path not returned by `generateStaticParams` returns a 404. No on-demand generation happens.

```ts
// pages that aren't in generateStaticParams will 404:
export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ slug: "hello-world" }, { slug: "getting-started" }];
}
```

---

## 14. Streaming at the HTTP Level

Streaming works via **chunked transfer encoding** (`Transfer-Encoding: chunked` in HTTP/1.1, or streams in HTTP/2). The connection stays open and the server sends chunks as they become available, rather than buffering the entire response.

When a Suspense boundary resolves on the server (the async component finishes its work), the server streams a new chunk that contains:
1. The HTML for the resolved content.
2. An **inline `<script>` tag** that swaps the fallback DOM node with the real content. This script executes in the browser as the chunk arrives, replacing the loading spinner in-place without a React re-render.

The difference between streaming and prefetching:
- **Streaming** = progressively deliver the current page as async parts resolve on the server, while the connection stays open.
- **Prefetching** = speculatively load future pages (routes the user hasn't navigated to yet) while they're looking at the current page.

---

## 15. Hydration Mismatches — Three Concrete Causes

A hydration mismatch happens when the HTML the server sent doesn't match what React produces when it runs on the client and tries to reconcile. React compares the expected virtual DOM (from the RSC payload) to the actual DOM in the browser. If they differ, React throws a hydration error in development.

Three real causes with fixes:

**Cause 1: Time or random values in render**

```tsx
// Wrong — server renders one value, client renders a different one
function TimeStamp() {
  return <p>Rendered at: {new Date().toLocaleTimeString()}</p>;
}

// Fix: generate the value only after mount
function TimeStamp() {
  const [time, setTime] = useState("");
  useEffect(() => setTime(new Date().toLocaleTimeString()), []);
  return <p>Rendered at: {time}</p>;
}
```

**Cause 2: Browser-only APIs used during render**

```tsx
// Wrong — window doesn't exist on the server
function ScreenSize() {
  return <p>Width: {window.innerWidth}px</p>; // throws on server
}

// Fix: guard with typeof check or move to useEffect
function ScreenSize() {
  const [width, setWidth] = useState(0);
  useEffect(() => setWidth(window.innerWidth), []);
  return <p>Width: {width}px</p>;
}
```

**Cause 3: Invalid HTML nesting**

```tsx
// Wrong — <div> inside <p> is invalid HTML; browsers auto-correct the DOM
// in ways React doesn't expect
function Card() {
  return (
    <p>
      <div>content</div> {/* invalid nesting */}
    </p>
  );
}

// Fix: use valid HTML nesting
function Card() {
  return (
    <div>
      <span>content</span>
    </div>
  );
}
```

---

## 16. Error Boundaries — What `error.tsx` Does NOT Handle

Two non-obvious cases that `error.tsx` doesn't catch:

**1. Errors in the same-segment layout**

`error.tsx` in a segment catches errors from that segment's `page.tsx` and its children. It does NOT catch errors thrown by the `layout.tsx` file at the same level. To catch errors in a layout, you need the parent segment's `error.tsx`, or `global-error.tsx` for the root layout.

```
app/
  dashboard/
    layout.tsx      ← errors here are NOT caught by dashboard/error.tsx
    error.tsx       ← catches errors from dashboard/page.tsx and its children
    page.tsx
  error.tsx         ← catches errors from dashboard/layout.tsx
```

**2. Next.js signal throws**

`redirect()` and `notFound()` work by throwing special signals that Next.js intercepts. Error boundaries deliberately don't catch these — they're not errors, they're control flow. They propagate up the tree until Next.js handles them.

---

## 17. PPR and the Static Shell — What Can and Cannot Be in It

### What the static shell is

With `cacheComponents` enabled, the static shell is everything Next.js can compute at build time without knowing who the user is or what they requested. It's prerendered HTML + RSC payload, stored and served immediately on every request. Dynamic parts are represented as Suspense holes — the shell contains the loading fallback HTML where the dynamic content will eventually go.

### Client components CAN be in the static shell

This is a common misconception. Client components are included in the static shell. Their HTML is prerendered at build time just like server components. The fact that they hydrate on the client (JS bundle loads, event handlers attach) is a separate step that happens after the shell is served — it doesn't prevent the component from being in the shell.

A navigation bar written as a client component (for `usePathname`) can be in the static shell. Its HTML renders at build time. The issue isn't whether it's a client component — the issue is whether it accesses request-time data. `usePathname` during the prerender has no pathname to return (no request exists), so there's a visible flash. The fix is wrapping it in Suspense, which makes it a dynamic hole rather than excluding client components from the shell generally.

### What forces a component into a dynamic hole

A server component becomes a dynamic hole (must be Suspense-wrapped) when it accesses:
- `cookies()`
- `headers()`
- `searchParams`
- Any uncached async operation that varies per-request

A client component that accesses these during render (via hooks like `useSearchParams`) also becomes dynamic.

### Build-time enforcement

If `cacheComponents` is enabled and a component calls a dynamic API without being inside a Suspense boundary, the build throws. This is not a warning — it's a hard error. Dynamic holes must be explicitly wrapped.

---

## 18. `use()` Hook vs `await` — Why `await` Can't Do the Same Things

`use(promise)` in a client component has two distinct advantages over awaiting in a server component and passing the resolved value:

**Advantage 1: The server component renders immediately.**

When you `await` inside a server component, that entire component blocks until the promise resolves. Nothing below it in the tree renders until the data is ready. If you instead pass the unawaited promise to a client component, the server component renders immediately and streams its output. Only the specific client component calling `use(promise)` suspends at its own Suspense boundary. The server component's output is already in the stream.

```tsx
// BLOCKS the server component entirely:
async function Page() {
  const user = await getUser(); // page doesn't render until this resolves
  return <UserCard user={user} />;
}

// Server component renders immediately, client suspends independently:
async function Page() {
  const userPromise = getUser(); // not awaited
  return (
    <Suspense fallback={<Skeleton />}>
      <UserCard userPromise={userPromise} />
    </Suspense>
  );
}
```

**Advantage 2: Prop drilling avoidance for multiple consumers.**

If you `await` the data in a server component, you have a resolved value. To share it across many client components, you'd have to prop-drill it (or use a server-side solution that still requires resolving first). By passing the Promise through Context, each consumer can call `use(promise)` and suspend independently at its own Suspense boundary — fine-grained loading states for different parts of the tree, without one centralized await.

---

## 19. Prefetching — Dynamic Routes Are Not Entirely Skipped

Next.js prefetching has two levels, and the distinction matters:

**Level 1 (default behavior, no configuration needed):**
- Static routes: fully prefetched when their Link enters the viewport. The full RSC payload is cached in the Router Cache. Navigation is instant.
- Dynamic routes: NOT fully prefetched, but also not entirely skipped. Next.js prefetches the shared layout segments up to the first `loading.tsx` boundary. So on click, the user sees the loading state immediately (from the cached layout + loading.tsx fallback) rather than a raw freeze waiting for the server.

**Level 2 (with `cacheComponents`/PPR):**
- Dynamic routes now have a precomputed static shell. Next.js prefetches this shell. On click, the user sees the actual static content of the page immediately, with dynamic holes showing their Suspense fallbacks while data loads. This is meaningfully better than just showing loading.tsx.

The practical difference: without PPR, clicking a dynamic link shows your loading.tsx spinner immediately (not a blank freeze). With PPR, it shows the actual static parts of the destination page immediately, with spinners only where the dynamic content will go.

---

## 20. `useActionState` Return Order

The return value of `useActionState` is `[state, action, isPending]` — in that order. Not `[pending, state, action]`.

```ts
const [state, action, isPending] = useActionState(serverAction, initialState);
//     ↑ result  ↑ wrapped fn  ↑ loading bool
```

Why `prevState` is passed to the action: the action runs on the server, which has no access to React state. React state only exists in the browser. So the current state must be serialized and sent as an argument alongside the form data. The server uses `prevState` to know what state to diff against or extend.

Timing: the state update happens inside a transition. `isPending` is `true` from when the action is triggered until `setActionState(nextState)` fires after the action resolves. The UI stays in its current state (not committed to the new state) for the duration of the async call.

---

## 21. Flight Protocol — How Promises Stream

The Flight protocol can serialize Promises. In the payload, a pending Promise is represented as a reference: something like `$L1` (a lazy reference). This reference is a placeholder in the payload.

As each Promise resolves on the server, the server sends a new chunk in the same stream containing the resolved value. The reference `$L1` in the original payload is then resolved to this value client-side.

This is the mechanism behind progressive rendering: the client renders immediately with the reference as a placeholder (which triggers Suspense), and fills it in as each chunk arrives without a full re-render of unrelated parts of the tree.

---

## 22. `next/image` — What It Actually Does

`next/image` is an `<img>` wrapper that applies several automatic optimizations you'd otherwise have to set up manually:

1. **Automatic format conversion:** Serves WebP or AVIF to browsers that support them, falling back to the original format. Smaller files, same visual quality.
2. **Responsive `srcset` generation:** Based on the `sizes` prop, Next.js generates multiple resized versions of the image and sets `srcset` so the browser downloads only the size it needs.
3. **Lazy loading by default:** Images below the fold don't download until the user scrolls toward them (`loading="lazy"` by default). Add `priority` to override for LCP images.
4. **CLS prevention:** Requires `width` and `height` props (or `fill` mode with a positioned parent) to reserve the right amount of space in the layout before the image loads, preventing content shift.

Trade-off: external image domains must be explicitly whitelisted in `next.config.js` under `images.remotePatterns`. Images from non-whitelisted domains will return a 400. Also, using `fill` mode requires the parent element to have `position: relative` (or `absolute`/`fixed`) — otherwise the image has nothing to fill.

---

## 23. ISR vs PPR — When Each Makes Sense

ISR is better when:
- The entire page can tolerate the same level of staleness.
- There's no meaningful split between static and dynamic content.
- Time-based or event-based regeneration of the whole page is acceptable.

PPR is designed for when:
- Part of the page is static (same for all users, cacheable forever) and part is dynamic (per-user, per-request).
- You want to serve the static parts instantly from cache while the dynamic parts load.

If you reach for PPR for a page where all content has uniform staleness tolerance, you're adding the complexity of Suspense boundaries and the static/dynamic split for no gain. ISR caches the whole page uniformly, which is simpler and correct for that case.

---

## 24. `revalidateTag` is a Purge, Not a Stale-Mark

`revalidateTag` immediately purges the Data Cache entries mapped to that tag. This means the next request to need that data will find an empty cache and fetch fresh data synchronously as part of serving the request. There is no stale version served.

Stale-while-revalidate only applies to **time-based revalidation** (`revalidate: 3600` or `cacheLife('hours')`). When the time window expires, the next request gets the stale cache entry while regeneration happens in the background. These are different behaviors:

- Time-based expiry → stale-while-revalidate → background regeneration
- `revalidateTag` / `revalidatePath` → immediate purge → next request fetches fresh synchronously

If you use `updateTag` (Server Action only) instead of `revalidateTag`, the behavior is the same — immediate purge — but the limitation is that `updateTag` is only callable from inside a Server Action, not a Route Handler.

---

## 25. The Preloading Pattern — Exact Mechanics and Limits

Without preloading, fetches in a parent-then-child structure are sequential:

```
Parent renders → parent awaits fetchA() → parent renders → child renders → child awaits fetchB()
Total time: A + B
```

With preloading, the parent fires `fetchB()` without awaiting it, starting it in parallel:

```
Parent starts fetchA() and fetchB() simultaneously → awaits fetchA() → child calls memoized fetchB() (already resolved or in-flight)
Total time: max(A, B)
```

The `React.cache` wrapper is essential: it ensures that when the child calls `fetchB()`, it gets the same Promise that's already in flight — not a new fetch request. Without `React.cache`, the child's call would be a separate DB query.

The explicit `preload` helper function is the named abstraction for this pattern:

```ts
const getProduct = React.cache(async (id: string) => {
  return db.products.findById(id);
});

// The named preload helper — allows callers to fire the fetch early
// without needing to know the implementation
export function preload(id: string) {
  void getProduct(id);
}

// In the parent:
preload(id); // fires the fetch, doesn't await
const available = await checkAvailability(id);
if (!available) return null;
return <ProductDetails id={id} />;

// In ProductDetails:
const product = await getProduct(id); // hits the React.cache, no second fetch
```

**When this pattern does NOT apply:** If the blocking work depends on the result of the data you want to preload, you cannot preload it. If you need the product ID from an API call to then fetch product details, you can't preload the details — you don't have the ID yet.

---

## 26. Parallel Route Slots — Independent Sub-Route Trees, Loading, and Error States

Each slot (`@slotName`) has its own independent sub-route tree. This means:

- **Independent loading:** Each slot has its own `loading.tsx`. If `@sidebar` is still loading data, it shows its own spinner while `@main` has already finished and shows content.
- **Independent error boundaries:** Each slot has its own `error.tsx`. An error in `@sidebar` doesn't affect `@main`.
- **`default.tsx` is mandatory:** When you navigate to a sub-route that only one slot has a matching branch for, the other slots must have a `default.tsx` to render as a fallback. Without it, Next.js throws a 404 because it can't find what to render in that slot.

Real-world use case: a dashboard with a filter sidebar and a data grid. Navigating from `/dashboard/filters/a` to `/dashboard/filters/b` updates the sidebar while the grid might still be showing data from the previous filter. They're independent sub-route trees with independent loading states.

---

*End of revision notes.*

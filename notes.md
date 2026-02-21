- Route wrappers: `layout.tsx` vs `template.tsx`
  - `layout.tsx` is the persistent wrapper for a segment.
  - `template.tsx` is the reset wrapper; it remounts on child-route navigation.
  - Important correction:
    - `layout.tsx` is not "never re-render".
    - It is usually reused across child-route transitions, but can still update/re-enter/reload.
  - Drawing:

    ```text
    navigate /dashboard/a -> /dashboard/b

    layout.tsx   stays mounted (usually reused)
    template.tsx remounts
    page.tsx     remounts
    ```

- Why `params` is a Promise
  - Promise here is a rendering signal, not a URL parsing cost issue.
  - It marks: "request-scoped data is consumed here."
  - Request data includes:
    - `params`
    - `searchParams`
    - `cookies`
    - `headers`
    - session/user-request-specific values

- Tree mental model
  - Next builds:
    - segment tree -> component tree -> render work tree
  - A page is not treated as one indivisible block.
  - Rendering decisions happen per subtree/boundary.
  - Drawing:
    ```text
    Segment tree
      -> Component tree
        -> Render work tree
           (static-safe regions vs request-dependent regions)
    ```

- What makes a subtree dynamic
  - Dynamic-ness comes from data access, not from Suspense itself.
  - Useful framing:
    - calls inside components make subtree data-dependent
    - nearest parent Suspense is usually where the streaming cut happens
  - Drawing:
    ```text
    Parent
    ├─ Static UI
    └─ Suspense(fallback)
       └─ Subtree reads cookies()/request data
    ```

- Dynamic holes (key correction)
  - Dynamic hole does NOT mean client component.
  - `cookies()` is server-only and request-dependent.
  - Using `cookies()` creates request-time server rendering for that subtree.
  - Client rendering only happens with `'use client'`.

- Prerender + request timeline
  - Prerender is a real server render pass (not only compile-time static analysis).
  - It runs at build/revalidation time for eligible routes.
  - On request:
    - ready shell/fallback can be sent first
    - dynamic boundary results are streamed later
  - Drawing:
    ```text
    t0: shell + fallback
    t1: dynamic subtree chunk arrives
    t2: browser swaps fallback -> resolved UI
    ```

- Cache layers
  - Full Route Cache:
    - reusable prerendered route output artifacts
  - Data Cache:
    - cached `fetch` results based on policy (`revalidate`, etc)
  - Router Cache:
    - client-side cache of RSC payload for navigations
  - Dynamic subtree can still benefit from Data Cache.

- Preloading data pattern
  - Problem: you need data eventually (when a component renders), but there's blocking work before it that's completely unrelated to that data.
  - Without preloading: fetch starts only when the component renders — after all the blocking work finishes. Sequential: X + Y.
  - With preloading: call the fetch function fire-and-forget before the blocking work. Fetch runs in parallel with the blocking work. By the time the component renders, the fetch has a head start. Parallel: max(X, Y).
  - `React.cache` is what makes it valid: without it, the component's call to the same function would start a second duplicate request. With `React.cache`, the second call returns the same Promise — already resolved if the fetch finished, still in-flight if not. Either way, no second request.
  - For `fetch`-based functions, automatic request memoization handles deduplication. For ORM/DB functions, wrap explicitly with `React.cache`.
  - The pattern only applies when the blocking work is completely independent of the preloaded data. If the blocking work depends on the fetch result, you can't preload.

  ```tsx
  import { cache } from "react";

  // React.cache ensures the second call is free (same Promise)
  const getItem = cache(async (id: string) => {
    return db.query.items.findFirst({ where: eq(items.id, id) });
  });

  const preload = (id: string) => {
    void getItem(id); // fire-and-forget — starts the fetch, doesn't block
  };

  export default async function Page({ params }) {
    const { id } = await params;
    preload(id); // fetch starts now
    const isAvailable = await checkIsAvailable(); // unrelated blocking work runs in parallel
    return isAvailable ? <Item id={id} /> : null;
  }

  async function Item({ id }) {
    const item = await getItem(id); // React.cache: same Promise, no second DB call
    return <div>{item.name}</div>;
  }
  ```

- Deduplicating fetch requests
  - `fetch` calls are automatically deduplicated within a single render pass (same request lifetime) — same URL + same options → only one actual HTTP request, result shared across all callers. This is request memoization, and it behaves exactly like `React.cache` applied automatically to `fetch`.
  - For across-request deduplication, use the Data Cache: `{ cache: 'force-cache' }` stores the fetch response persistently. Future requests reuse the stored response without hitting the external API.
  - For ORM/DB calls (not `fetch`), request memoization doesn't apply automatically — wrap with `React.cache` manually for the same within-request deduplication effect.

  | Mechanism           | Scope             | How                        |
  | ------------------- | ----------------- | -------------------------- |
  | Request memoization | Same request only | Automatic for `fetch`      |
  | Data Cache          | Across requests   | `{ cache: 'force-cache' }` |
  | `React.cache`       | Same request only | Manual, for ORM/DB calls   |

- `fetch` caching behavior and `{ cache: 'no-store' }`
  - In Next.js 14, `fetch` was cached in the Data Cache by default (`force-cache`).
  - In Next.js 15, that default was flipped — `fetch` is no longer cached in the Data Cache.
  - But this doesn't matter for static routes: the fetch still runs at build time during prerendering, its result gets baked into the prerendered HTML output, and that output is stored in the Full Route Cache. Every request gets the cached prerendered output. Data Cache is a separate, uninvolved layer.
  - `{ cache: 'no-store' }` does two things at once:
    1. Skips the Data Cache (fetch response not stored separately)
    2. Signals to Next.js "this fetch must run fresh on every request" → Next.js skips prerendering for this route → route becomes dynamic → fetch runs on every request
  - So `no-store` opts the route out of the Full Route Cache entirely. The second effect (opting out of prerendering) is what actually makes it "opt into dynamic rendering" as the docs say.

- ISR + invalidation
  - ISR = Incremental Static Regeneration.
  - Cached prerendered output can be refreshed when stale/invalidated.
  - Static does not mean forever; it means reusable until revalidated/invalidated.

- Why not every route is build-prerendered
  - Some routes render first at request time (request-dependent/dynamic behavior).
  - Dynamic tracking works in both prerender mode and request mode.

- AsyncLocalStorage mental model
  - AsyncLocalStorage is request/render-local context storage across async execution.
  - Deep code can read current mode/context without manually passing args everywhere.
  - "Async" matters because context survives across `await`.
  - Drawing:
    ```text
    set context (mode=request/prerender/cache)
      -> render tree
        -> deep helper
          -> await
            -> deep helper still sees same context
    ```

- Mode-dependent behavior
  - The same API access can produce different behavior depending on mode:
    - `request`: allow per-request rendering
    - `prerender`/PPR: postpone/suspend and create dynamic holes
    - cache scope: error for forbidden dynamic reads
    - legacy/static contexts: bailout behavior

- Parallel routes and slot mental model
  - App Router is a tree of route segments.
  - Some special route-tree nodes do not map to URL path segments.
  - `@slot` is one of those special nodes:
    - it creates a parallel rendering branch under the same route
    - it does not appear in the URL
  - Layout receives:
    - main branch as `props.children`
    - each slot as `props.slotName` (example: `@inspector` -> `props.inspector`)
  - "Got it" framing:
    - slots are a way to render multiple branches under the same route
    - layout gets main branch + slot branches as props

- `template.tsx` vs slot content
  - `template.tsx` belongs to the segment level.
  - It is not only for `children`; it applies at that segment boundary where parallel branches are rendered.
  - This is why slot area can show template wrapper content too.
  - Drawing:
    ```text
    /lab segment
    ├─ children  -> wrapped by lab/template.tsx
    └─ inspector -> wrapped by lab/template.tsx
    ```

- `default.tsx` vs `page.tsx` inside a slot
  - `@inspector/page.tsx`:
    - matched slot content when slot has a route match at that URL level
  - `@inspector/default.tsx`:
    - fallback for that slot when no matching slot branch exists for current URL
  - Not equivalent:
    - renaming `default.tsx` to `page.tsx` changes behavior
    - you gain root match behavior but lose unmatched fallback behavior
  - Scope clarification:
    - `app/lab/@inspector/default.tsx` is "global" only within `/lab` for the `inspector` slot
    - it is not global for `children` or other slots

- Terminology precision that avoids confusion
  - Broad conversational use:
    - "segment" can refer to route-tree pieces
  - Precise use:
    - URL/path segment: URL-matching part (`lab`, `demo`, `[slug]`)
    - non-URL structural node: `@slot`, `(group)`
  - Final wording that clicked:
    - `@slot` is part of the route tree, but not a URL path segment

- Intercepted routes mental model (paired with slots)
  - Canonical route still exists and is the default truth for that URL.
  - Interceptor is an alternative implementation of the same URL, chosen on soft nav from the right context.
  - Hard refresh/direct enter uses canonical route (no interception context exists).
  - Interception is not tied to slots:
    - interceptor under normal branch -> renders in `children`
    - interceptor under `@slot` -> renders in that slot prop (common modal/sidebar pattern)
  - Compact rule:
    - same destination URL, but on soft navigation Next may choose a context-local intercepted branch if one exists in the currently mounted route tree
    - on hard/direct navigation (no prior tree context), Next always uses the canonical branch

- Dynamic segment syntax that clicked
  - `[slug]` = one required segment.
  - `[...slug]` = required catch-all (1+ segments).
  - `[[...slug]]` = optional catch-all (0+ segments).
  - `[[slug]]` is not valid syntax in App Router.
  - There is no "optional single non-catch-all" bracket form.
    - model it with route structure (for example `page.tsx` + `[slug]/page.tsx`).
  - Route props helper wording clarification:
    - "Static routes resolve params to {}" means static route pattern (no `[segment]` in pathname).
    - It does NOT mean static rendering mode.

- `[slug]` params vs `searchParams` rendering model
  - `[slug]` by default is request-time dynamic server rendering.
  - If slug values are known in advance with `generateStaticParams()`, those paths can be prerendered.
  - `searchParams` in a Server Page opts into request-time dynamic server rendering.
  - Dynamic here still means server rendering, not client rendering.
  - Example in project:
    - `src/app/lab/static-slug/[slug]/page.tsx` uses `generateStaticParams()` (`alpha`, `beta`)
    - `src/app/lab/query/page.tsx` reads `searchParams`

- `(group)` vs `_folder`
  - `(group)` is a non-URL route-tree segment.
  - Children under it get shared routing behavior from group-level files:
    - `layout.tsx`, `template.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
  - Example in project:
    - `src/app/lab/(workspace)/account/page.tsx` -> `/lab/account`
    - `src/app/lab/(workspace)/billing/page.tsx` -> `/lab/billing`
    - both share `src/app/lab/(workspace)/layout.tsx` and `src/app/lab/(workspace)/template.tsx`
  - `_folder` (like `_components`, `_data`) is just filesystem colocation.
    - router ignores it for matching
    - useful for shared code/modules near the routes

- Server layout + client-only dynamic extraction
  - Active tab highlighting needed `usePathname()` (client hook).
  - Instead of making all of `/lab/layout.tsx` client-side, only nav was extracted:
    - `app/lab/_components/lab-nav.tsx` (Client Component)
  - Result:
    - `/lab/layout.tsx` stays server-side
    - only nav logic runs on client
    - less client JS shipped

- Slug-to-slug loading behavior + fix
  - Observed:
    - first visit to `/lab/demo/slow` showed loading
    - after it resolved, navigating to `/lab/demo/missing` waited ~1200ms
    - during that wait, loading did not show again
  - Why this happens:
    - this is slug -> slug inside the same route branch
    - Next keeps current UI visible during transition instead of flashing fallback
  - Fix applied:
    - `app/lab/demo/[slug]/loading.tsx`
    - `app/lab/demo/[slug]/template.tsx`
  - Mental model after fix:
    - slug changes
    - `[slug]/template.tsx` remounts that subtree
    - subtree is pending again
    - `[slug]/loading.tsx` is shown
    - new slug page replaces loading when ready

- Why template remount does not automatically show loading
  - Key phrasing:
    - `template` = when remount should happen
    - `loading` = what can be committed while remount target is still pending
  - A/B model for navigation:
    - `A` = current committed UI (still visible)
    - `B` = next tree built in background
  - Example:
    - `/lab/account` -> `/lab/billing` inside `(workspace)`
    - template key changes in `B`
    - if no loading boundary at that cut, `B` cannot commit an intermediate fallback there
    - so `A` stays visible until `B` resolves
    - then one commit swaps `A -> B`

- `not-found.tsx` mental model (route 404 vs resource 404)
  - `notFound()` from `next/navigation` throws a special internal 404 signal.
  - Next catches that signal and renders nearest segment `not-found.tsx`.
  - Important distinction:
    - route 404 (URL does not match any route at all) -> root/global 404
    - resource 404 inside matched route -> nearest segment `not-found.tsx`
  - Why `/lab/x` and `/lab/demo/missing` behave differently:
    - `/lab/x`:
      - no route match
      - `app/lab/not-found.tsx` is not used
      - global Next/root 404 is shown
    - `/lab/demo/missing`:
      - route matches `app/lab/demo/[slug]/page.tsx`
      - page calls `notFound()`
      - `app/lab/not-found.tsx` is shown
  - Key takeaway:
    - segment `not-found.tsx` is for "matched route, missing resource/data"
    - it is not for "URL does not exist in route tree"

- `error.tsx` mental model
  - `error.tsx` is a segment error boundary fallback UI.
  - Next wraps each segment subtree with an internal ErrorBoundary and passes:
    - `error` (the thrown error)
    - `reset` (retry function)
  - `reset` behavior:
    - clears boundary error state
    - rerenders that segment subtree
    - if error is gone -> normal UI appears
    - if error still throws -> `error.tsx` shows again
  - Auto-reset behavior:
    - boundary also resets when pathname changes (navigation away)
  - Important distinction:
    - `error.tsx` handles normal render errors
    - router control signals like `notFound()` / `redirect()` are handled by different boundaries
  - In this app:
    - `/lab/demo/error` throws in `app/lab/demo/[slug]/page.tsx`
    - nearest boundary `app/lab/error.tsx` renders
    - "Try again" calls `reset()`

- React Server Components (RSC)
  - RSC is a protocol defined by React, not a Next.js invention. Next.js implements it.
  - The main idea: components in the app tree live in two module graphs -- server and client.
  - By default, components are server components. `'use client'` marks the boundary into the client graph.
  - Server components can use DB calls, file system, secrets. They never ship code to the browser.
  - Client components can use state, effects, event handlers, browser APIs.
  - `'use client'` is a module-graph boundary: everything imported from a `'use client'` file is in the client graph.

  - Example app tree used throughout:

    ```tsx
    // Page (server component, async)
    export default async function Page() {
      const product = await db.getProduct(42) // DB call
      return (
        <h1>{product.name}</h1>
        <p>${product.price}</p>
        <AddToCartButton productId={42} price={99} />   // client component
        <Suspense fallback={<p>Loading reviews...</p>}>
          <Reviews productId={42} />                      // server component, async, slow
        </Suspense>
      )
    }

    // AddToCartButton ('use client')
    'use client'
    export default function AddToCartButton({ productId, price }) {
      const [qty, setQty] = useState(1)
      return <button onClick={() => setQty(qty+1)}>Add {qty} to cart</button>
    }

    // Reviews (server component, async)
    export default async function Reviews({ productId }) {
      const reviews = await db.getReviews(productId) // slow DB call
      return reviews.map(r => <div>{r.text}</div>)
    }
    ```

  - What happens on initial page load (hard navigation):
    - Two rendering passes happen on the server, always together.
    - Pass 1 -- RSC render:
      - React walks the tree top-down, calls server component functions, resolves their JSX.
      - When it hits a `'use client'` component, it does NOT call it. It emits a reference:
        "load chunk `add-to-cart-button.js`, pass it `{productId: 42, price: 99}`."
      - When an async server component inside a `<Suspense>` suspends (awaiting slow data),
        React marks that boundary as pending and moves on. It does NOT wait.
      - When an async server component is NOT inside a `<Suspense>`, React blocks and waits.
      - This is why Page (no Suspense wrapper) blocks the stream, but Reviews (inside Suspense) doesn't.
      - Output: the RSC payload.
    - RSC payload looks like (simplified):

      ```
      ["$","h1",null,{"children":"Keyboard"}]
      ["$","p",null,{"children":"$99"}]
      ["$","$Ladd-to-cart-button",null,{"productId":42,"price":99}]  <- reference, not rendered
      ["$","$Suspense",null,{"fallback":"Loading reviews...","children":"$pending"}]
      ```

      - Server components are fully resolved -- only their output (h1, p, div) appears, not component code.
      - Client components appear as references with serialized props.

    - Pass 2 -- SSR render:
      - Takes the RSC payload from pass 1.
      - For server component output: converts resolved JSX to HTML strings. No re-execution.
      - For client component references: imports the actual component code and runs it on the server.
        This works because: `useState(1)` returns initial value, `useEffect` is skipped,
        event handlers are ignored in HTML output. No browser APIs are called during render.
      - For pending Suspense boundaries: outputs the fallback HTML.
      - Output: HTML string.
    - Server streams the response (chunked):

      ```html
      <!-- first chunk -->
      <h1>Keyboard</h1>
      <p>$99</p>
      <button>Add 1 to cart</button>
      <!-- client component HTML from SSR pass -->
      <p>Loading reviews...</p>
      <!-- Suspense fallback -->

      <script>
        self.__next_f.push([...])
      </script>
      <!-- RSC payload stored for React -->
      <script src="/add-to-cart-button.js"></script>
      <!-- client component JS bundle -->
      ```

    - `self.__next_f.push` explained:
      - React hasn't loaded yet when the browser starts parsing HTML.
      - Next.js embeds RSC payload in inline `<script>` tags that push data into a global array.
      - These run immediately and just store data. They don't render anything.
      - When React loads later, it reads from `self.__next_f` to get the RSC payload.
      - It's a mailbox: HTML stream drops off messages, React picks them up when ready.
    - Browser receives the HTML and paints it instantly (built-in HTML parser, no JS needed).
      The button shows "Add 1 to cart" but clicking it does nothing yet.
    - Why two passes instead of one?
      - HTML is for instant visual display (browser paints it before any JS runs) and SEO.
      - RSC payload is for React to understand the tree structure (where client components are,
        what their props are). HTML alone can't carry this information.
      - Both arrive in the same response. The point isn't that HTML arrives first over the network.
        It's that the browser can act on HTML instantly, while the RSC payload is useless until
        React's JavaScript downloads and executes.

  - Hydration (what happens after JS loads):
    - Step 1: React reads `self.__next_f`. Builds a virtual tree in memory from RSC payload:
      ```
      ServerOutput: <h1>Keyboard</h1>
      ServerOutput: <p>$99</p>
      ClientComponent: AddToCartButton { module: "add-to-cart-button.js", props: {productId:42, price:99} }
      SuspenseBoundary: (pending, fallback: <p>Loading reviews...</p>)
      ```
    - Step 2: React calls client component functions for real.
      `useState(1)` sets up real state tracking. Produces virtual DOM: `<button>Add 1 to cart</button>`.
    - Step 3: React walks the real DOM and virtual tree side by side:
      ```
      Real DOM (from HTML):                  Virtual tree:
      <h1>Keyboard</h1>                 ↔   ServerOutput: <h1>Keyboard</h1>      ✓ match
      <button>Add 1 to cart</button>    ↔   ClientComponent output: <button>...   ✓ match
      ```
      Every node matches. React does NOT create new DOM nodes. It adopts existing ones.
    - Step 4: React attaches `onClick` handler to the existing `<button>` DOM node.
      Clicking it now calls `setQty`. The button is alive.
    - Step 5: `useEffect` callbacks run for the first time.
    - That's hydration: React walks already-painted DOM and wires up interactive parts.
      If real DOM and virtual tree don't match, React logs a warning and force-replaces that subtree (bad for perf).

  - Deferred server content (streaming in later):
    - While all the above happened, the server was still awaiting `db.getReviews()`.
    - When it finishes, server runs RSC + SSR for that boundary, streams another chunk:
      ```html
      <script>
        $RC("reviews-boundary", "<div>Great keyboard!</div><div>Love it</div>");
      </script>
      <script>
        self.__next_f.push([
          /* RSC payload update */
        ]);
      </script>
      ```
    - Browser executes the script. React swaps "Loading reviews..." for the actual reviews.
    - This is the same streaming model from earlier notes: t0 shell, t1 chunk, t2 swap.

  - Soft navigation (clicking a `<Link>` to `/shop/99`):
    - React Router intercepts the click. No full page request. Starts a transition.
    - Sends a fetch with `RSC: 1` header: "give me just the RSC payload, no HTML."
      ```
      GET /shop/99
      RSC: 1
      Next-Router-State-Tree: ...  <- tells server what layouts are already mounted
      ```
    - Server does RSC pass only. No SSR. No HTML. Returns raw RSC payload:
      ```
      ["$","h1",null,{"children":"Mechanical Keyboard"}]
      ["$","p",null,{"children":"$149"}]
      ["$","$Ladd-to-cart-button",null,{"productId":99,"price":149}]
      ```
    - React on the client builds new virtual tree, diffs against current tree:
      - Layout: unchanged -> DOM untouched, state preserved.
      - `<h1>`: "Keyboard" -> "Mechanical Keyboard" -> DOM text updated.
      - `AddToCartButton`: new props -> React re-renders it on the client (normal React render).
      - Reviews: pending Suspense -> shows fallback, streams in later.
    - Key difference from initial load: no HTML anywhere. No SSR pass.
      Client components render directly on the client, like normal React.
    - If RSC payload for a previously visited route is in Router Cache, no network request at all.

  - When do the two passes happen?
    - Both passes are always paired. You never get RSC at build time and SSR at request time.
    - Static route (no dynamic data): both passes at build time. Cached. Served as-is on request.
    - Dynamic route (cookies, searchParams, etc.): both passes at request time.
    - PPR: both passes at build for static shell. Both passes at request for dynamic holes only.
    - This is a Next.js scheduling decision, not an RSC protocol concern.

  - Server components inside client components:
    - You cannot import a server component inside a `'use client'` file.
      The import makes it join the client module graph -- it stops being a server component.
    - The only way is through props (not just `children` -- any prop works):

      ```tsx
      // page.tsx (server component -- the orchestrator)
      import Modal from "./modal"; // client
      import CartItems from "./cart-items"; // server
      import CartTotal from "./cart-total"; // server

      export default function Page() {
        return (
          <Modal
            header={<CartItems />} // server component rendered first, passed as prop
            footer={<CartTotal />} // same -- any prop works, not just children
          >
            <p>Your cart</p>
          </Modal>
        );
      }
      ```

    - The server component that imports both is the orchestrator.
      It renders server components on the server, passes their output as serialized JSX to the client component.
      The client component receives them as opaque React elements and renders them wherever it wants.
    - Serialized JSX can cross any boundary because it's just data.

- Prefetching behavior
  - `<Link>` prefetches routes when they enter the viewport (or on hover).
  - How much is prefetched depends on whether the route is static or dynamic:
    - Static route: full RSC payload is prefetched. It's just serving a cached file, basically free.
    - Dynamic route: only the static shell is prefetched (layouts + `loading.tsx` fallback).
      The actual page content is NOT prefetched because that means running server code (DB calls, etc).
  - Why not prefetch dynamic routes fully?
    - It's a cost trade-off. Imagine a category page with 30 product links in the viewport.
      Prefetching all 30 means 30 server renders and 30 DB calls for routes the user may never visit.
  - What "partial prefetching" means concretely:
    - Layouts and the loading skeleton are prefetched (they're static, no request-time data needed).
    - On click: layouts + loading fallback commit instantly, dynamic page content streams in after.
    - The loading fallback does NOT replace the layout. It sits inside the layout's `{children}` slot.
    - Drawing:

      ```text
      /shop/[id] with ShopLayout (sidebar) + loading.tsx + page.tsx (dynamic)

      ┌────────────────────────────────┐
      │  Header (RootLayout)           │  ← prefetched, shows instantly
      ├──────────┬─────────────────────┤
      │ Sidebar  │  ░░ skeleton ░░░░░  │  ← loading.tsx in {children} slot
      │ (Shop    │  ░░░░░░░░░░░░░░░░░  │
      │  Layout) │  ░░░░░░░░░░░░░░░░░  │  ← prefetched, shows instantly
      ├──────────┴─────────────────────┤
      │  Footer (RootLayout)           │  ← prefetched, shows instantly
      └────────────────────────────────┘

      then: server finishes page.tsx → skeleton swaps for real content
      ```

  - Without `loading.tsx` on a dynamic route: nothing committable is prefetched.
    Old page stays visible until server finishes everything. Then one big swap.
  - Override with `<Link prefetch={true}>` to force full prefetch even for dynamic routes
    (opts into the server cost).

- Streaming
  - The server sends parts of the response as they're ready instead of waiting for everything.
  - When rendering a route, fast parts (layouts, loading fallbacks) are sent first.
    Slow parts (page with DB call behind a Suspense boundary) stream in later.
  - This is independent of prefetching. Prefetching is about WHEN the request is made (before vs after click).
    Streaming is about HOW the response is sent (in chunks vs all at once).

- Client-side transitions (soft navigation)
  - Unlike traditional server-rendered pages where route changes cause a full page reload,
    after initial load, navigating within the app uses client transitions.
  - Only the changed content is dynamically replaced on screen. Shared layouts stay mounted.
  - How it works under the hood:
    - Next.js sends a request for the RSC payload of the target route.
    - The request includes the Router State Tree (which layouts/segments are currently mounted)
      so the server skips re-rendering layouts that are already on screen.
    - Server does only 1 pass (RSC), no SSR, no HTML. Returns raw RSC payload.
    - React on the client parses the new RSC payload, diffs the current virtual tree
      against the new one, and patches the DOM accordingly.
  - Client component state is preserved purely by React's diffing:
    if a component is in the same tree position in old and new trees, React keeps its state.
    The server knows nothing about client state.

- Router Cache stale time for dynamic routes
  - In Next.js 15, dynamic pages have stale time = 0 in the Router Cache by default.
  - Every soft navigation to a dynamic route re-fetches from the server, even if just visited.
  - Back/forward (browser buttons) still restores from cache.
  - Configurable via `staleTimes.dynamic` in `next.config.js` (e.g. 30 seconds).

- `useLinkStatus` hook
  - Shows navigation feedback on the link itself while a transition is in progress.
  - Must be used inside a child component of `<Link>`. Returns `{ pending: boolean }`.
  - How it works: `<Link>` wraps navigation in `startTransition()` and provides the
    transition's pending state via React context. `useLinkStatus` reads from that context.
  - Different from `loading.tsx`: `loading.tsx` replaces the page content area.
    `useLinkStatus` gives feedback on the link the user clicked, before any navigation happens visually.

- Native History API (`pushState`/`replaceState`) vs `<Link>`/`router.push`
  - `<Link>`/`router.push` trigger actual navigation: server request, RSC render, tree diff.
  - `pushState`/`replaceState` just update the URL without triggering navigation. No server request.
  - Use case: URL changes that don't affect what's rendered (sorting, filters, locale).
    The URL is used purely as state storage (bookmarking, sharing, browser history)
    while the UI update is handled client-side.
  - Next.js integrates these with its router so `usePathname`/`useSearchParams` still reflect the update.

## Cache Components (`cacheComponents` flag)

- Without `cacheComponents`: Next.js makes a per-route decision — static or dynamic. If any component in the route reads runtime data (`params`, `cookies()`, `searchParams`, etc.), the **entire route** renders at request time. No build-time prerendering of any part of it. Even purely static parts (headings, layout chrome) are re-rendered on every request. Build output: `ƒ` (Dynamic).

- With `cacheComponents`: the decision becomes per-component. Next.js walks the tree at build time and prerenders whatever it can. Parts that need runtime data must be explicitly handled — wrapped in `<Suspense>` or `use cache` — or the build throws. Static parts are frozen into a shell at build and served instantly. Only the dynamic holes compute at request time. Build output: `◐` (Partial Prerender).

  Example — `/lab/query` reads `searchParams`:
  - Without flag: `ƒ` — entire page re-rendered on every request, heading included
  - With flag: `◐` — heading baked into static shell at build, only the `searchParams`-dependent part streams in at request time (behind the Suspense from `loading.tsx`)

- Parts that need runtime data must be explicitly handled — wrapped in `<Suspense>` or `use cache` — or the build throws:

  ```
  Error: Uncached data was accessed outside of <Suspense>
  ```

- The "static shell" is everything Next.js can resolve at build time without knowing who the user is or what they're requesting. At request time, only the dynamic holes stream in.

- Client components are also subject to this. "Client component" doesn't mean "only runs in browser". Client components still run on the server during the SSR pass to produce HTML. With `cacheComponents`, that SSR pass happens at build time. So if a client component calls `usePathname()` or any runtime API, it fails at build time too — unless it's behind a `<Suspense>`.

- The difference `cacheComponents` makes for runtime APIs in client components (like `usePathname()`):
  - Without `cacheComponents`: `usePathname()` runs at build time, returns whatever value is available (or null), no error. The incorrect value gets patched during hydration on the client. Next.js tolerates this.
  - With `cacheComponents`: `usePathname()` is actively tracked as runtime data access. Accessing it outside `<Suspense>` is a build error — the static shell must be correct upfront, not fixed later by hydration.

- `loading.tsx` at a segment level wraps `{children}` in a Suspense boundary — it covers the page content passed into the layout, NOT components rendered directly inside the layout itself (like a `<LabNav />` in the layout JSX).

- `loading.tsx` is a coarse Suspense boundary. If a page reads `searchParams`, a `loading.tsx` above it prevents the build error, but the entire `{children}` area shows the fallback at request time — including any static parts of the page (headings, descriptions, etc.).

- The optimization track with `cacheComponents`: extract truly dynamic parts into dedicated components, wrap only those in `<Suspense>`. Everything else — headings, static UI, layout chrome — gets prerendered into the static shell and appears instantly. The tighter the Suspense boundaries, the more content in the static shell.

  ```tsx
  // coarse — entire page area shows fallback
  // (just having loading.tsx at segment level)

  // fine — only the dynamic part shows fallback
  export default function QueryPage({ searchParams }) {
    return (
      <article>
        <h1>searchParams demo</h1> {/* static — in shell */}
        <Suspense fallback={<p>Loading...</p>}>
          <SearchResults searchParams={searchParams} /> {/* dynamic only */}
        </Suspense>
      </article>
    );
  }
  ```

- When runtime data (e.g. cookies) is needed across many client components, the promise-to-context pattern is more surgical than a coarse `<Suspense>` boundary. A `<Suspense>` wrapper hides an entire subtree behind a fallback. With the promise-to-context pattern, the layout passes the Promise (without awaiting) to a client context provider — layout and all static surroundings stay in the static shell, and only the individual client components that call `use(useContext(...))` suspend on their own as small isolated holes.

- `revalidateTag` vs `updateTag`:
  - `revalidateTag`: marks the cache entry as stale. Current request still gets old cached data. Next request triggers background revalidation (stale-while-revalidate). Use when slight staleness is acceptable.
  - `updateTag`: expires the cache AND immediately re-computes within the same request. Response includes fresh data. Use when the update must be reflected right away.

  ```ts
  // eventual consistency — okay for blog posts
  export async function createPost(post: FormData) {
    "use server";
    await db.insertPost(post);
    revalidateTag("posts"); // next visitor may briefly see old list
  }

  // immediate consistency — required for cart
  export async function addToCart(itemId: string) {
    "use server";
    await db.insertCartItem(itemId);
    updateTag("cart"); // same response already reflects updated cart
  }
  ```

- `connection()` from `next/server` is an explicit opt-out from prerendering. Without it, a component with `Math.random()` or `Date.now()` would run at build time — the value gets baked into the static shell and served to every user. `await connection()` signals "run this at request time", making everything after it dynamic. Requires a `<Suspense>` boundary above it for the same reason any dynamic component does.

- `use cache` has two modes depending on context:
  - **No runtime deps** → runs at build time, result baked into static shell, revalidated on schedule
  - **Receives runtime values as props (inside `<Suspense>`)** → runs at request time on first call, caches result keyed by those props, reuses on future requests with same inputs — skips the expensive DB/network work on repeat calls, not the request itself
  - The constraint: runtime APIs (`cookies()`, `headers()`, etc.) cannot be called directly inside `use cache`. Read the value outside in a non-cached component, pass the plain value as a prop. That value becomes part of the cache key.
  - The second mode is similar to `React.cache` but persisted across requests rather than scoped to one request.

- `cacheComponents` replaces the old route segment configs (`dynamic`, `revalidate`, `fetchCache`). Those were blunt, file-level switches because there was no way to be granular — intent had to be declared at the route level. With `cacheComponents`, the rendering unit is the component, not the route, so you express intent where the data lives and the configs become redundant.

- Why network calls aren't automatically prerendered: external systems are unreliable — they can fail or take unpredictable time. Prerendering can't be blocked on that. So any network call requires explicit declaration: `<Suspense>` (stream at request time) or `use cache` (cache it, opt into the risk yourself with a defined policy).

## How Server and Client Components work in Next.js (full lifecycle)

### 1. On the server — two passes

**Pass 1 — RSC render (Flight render)**

React walks the component tree top-down:

- **Server Component** → fully executes (including `await`), produces concrete JSX (divs, text, etc.)
- **Client Component** → NOT executed. Records a reference to its JS bundle file + serialized props from parent.

Output is the **RSC Payload**, a streaming format:

```
0:["$","div",null,{"children":[["$","h1",null,{"children":"My Post"}],["$","$L1",null,{"likes":42}]]}]
1:I["./like-button.js","LikeButton"]
```

- `$L1` = "Client Component #1 goes here"
- Line `1:` = "Client Component #1 is `LikeButton` from `./like-button.js`"
- `{"likes":42}` = serialized props
- Server components are resolved to output. Client components are holes with instructions.

**Pass 2 — SSR render (HTML generation)**

React takes the RSC Payload and does a second pass to produce HTML. This time it **does** execute client components, but limited:

- `useState(0)` → returns `0` (initial value only)
- `useEffect` → skipped
- `onClick` → ignored (HTML can't have JS handlers)

Both HTML and RSC Payload are sent in the **same response**, streamed as chunks.

### 2. On the client (first load)

Three steps in sequence:

**Step 1 — HTML paint**
Browser receives HTML, renders it immediately with built-in parser. No JS needed. User sees full page but can't interact.

**Step 2 — RSC Payload reconciliation**
React JS loads and reads the RSC Payload (delivered via `self.__next_f.push` script tags in the HTML). Builds internal virtual tree:

- Server component output → concrete nodes
- Client component references → React knows "component #1 is LikeButton with props {likes: 42}"

Reconciles this tree against existing DOM — confirming the DOM matches expectations.

**Step 3 — Hydration**
React walks DOM and virtual tree side-by-side. For each Client Component:

- Executes the component function for real (working `useState`, `useReducer`, etc.)
- Does NOT create new DOM — adopts existing nodes
- Attaches event handlers (`onClick`, `onChange`)
- Schedules `useEffect` callbacks

Page is now fully interactive.

### 3. Subsequent navigations (soft nav)

No HTML generated. Only one pass:

Client sends request with **Router State Tree** (which layouts are already mounted). Server:

1. Skips already-mounted layouts
2. Runs RSC render (Pass 1 only) for new/changed segments
3. Streams back RSC Payload

Client receives RSC Payload, builds new virtual tree, diffs against current tree, patches DOM. New client components mount normally. Existing client components keep their state.

No SSR. No HTML. No hydration. That's why soft nav is faster.

### What runs where — summary

|                     | Server Component                    | Client Component                                             |
| ------------------- | ----------------------------------- | ------------------------------------------------------------ |
| RSC render (Pass 1) | Fully executed                      | NOT executed — recorded as reference                         |
| SSR render (Pass 2) | Already resolved to output          | Executed with limitations (no effects, no handlers)          |
| Hydration (client)  | Nothing to do                       | Fully executed, handlers attached                            |
| Soft nav            | Fully executed (if segment changed) | NOT executed on server — rendered on client from RSC payload |

## Streaming data from Server to Client with `use()`

**Problem:** `await` in a Server Component blocks — nothing renders until the async operation finishes.

**Solution:** Pass the Promise (not the awaited value) as a prop to a Client Component. The Client Component reads it with `use()`, wrapped in `<Suspense>`.

```tsx
// Server Component — does NOT await
export default function Page() {
  const postPromise = getPost();
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <PostView postPromise={postPromise} />
    </Suspense>
  );
}
```

```tsx
// Client Component — uses use() to read the promise
"use client";
import { use } from "react";

export default function PostView({ postPromise }) {
  const post = use(postPromise); // suspends until resolved
  return <p>{post.title}</p>;
}
```

### How it works on the wire

You can't send a Promise over HTTP. React's Flight renderer (the RSC serializer) handles it:

1. During RSC render, the serializer walks props crossing the `'use client'` boundary. When it encounters a Promise, it assigns an ID, writes a placeholder (`$@2`), and attaches a `.then()` to the actual Promise in server memory.
2. Everything around the Suspense boundary is flushed immediately.
3. SSR pass hits the Suspense boundary, `use()` throws (value not ready), fallback HTML is rendered instead.
4. Browser receives HTML with fallback — user sees "Loading..." instantly.

When the Promise resolves on the server: 5. The `.then()` fires, serializes the value, writes it to the still-open stream as a late chunk (`2:{"title":"Hello World"}`). 6. A `$RC` inline script (tiny vanilla JS, not React) finds the `<!--$?-->` marker in the DOM and swaps the fallback HTML for the real HTML — **instant visual update, no React needed**. 7. React reconciliation then confirms its virtual tree matches the updated DOM.

### Why two swap mechanisms ($RC + React reconciliation)?

- `$RC` DOM swap → works at HTML level, no React needed. If data resolves before React JS loads, user sees content immediately.
- React reconciliation → updates React's internal virtual tree to stay consistent.

### Tracking

- **Server side:** the Flight serializer attaches `.then()` to the Promise during prop serialization. The component is done — only the Promise matters after that.
- **Client side:** React maintains a map of async entries by ID (`{2: {status: "pending"}}`). `use()` checks the status — if pending, throws (Suspense catches it). When the late chunk arrives, the entry resolves, React retries rendering the children of the Suspense boundary that was waiting on it.

### When to use `use()` vs just `await`

If only one component needs the data → a wrapper server component that `await`s and passes the resolved value as a prop is simpler and equivalent.

`use()` with a Promise prop adds value when:

1. **You don't want to block siblings.** `await` in a Layout blocks `{children}` from rendering (React doesn't have the JSX yet). Passing a promise instead lets Layout return immediately — `{children}` renders and streams right away, only the component calling `use()` suspends behind its own Suspense boundary.
2. **Multiple client components need the same data.** Combine with a context provider: one server-side fetch, pass the promise to a context provider in the layout, any client component reads it via `use(useContext(...))`. Without this, you'd need a separate server component wrapper for each.

These two benefits are independent — you can use `use()` just for #1 without any context.

## Context providers pattern

Context providers must be client components (`createContext`, `useState`, etc. are client-only). But you want them high in the tree so all client components can consume them.

Problem: putting a client component high in the tree makes everything below it client too.

Solution: the `children` prop pattern. The provider wraps `{children}` but doesn't import them — they're passed in from the server component layout. Children stay server components because they're not imported by the client component, just rendered through it.

```tsx
// app/theme-provider.tsx (Client Component)
"use client";
export default function ThemeProvider({ children }) {
  return <ThemeContext value="dark">{children}</ThemeContext>;
}

// app/layout.tsx (Server Component)
import ThemeProvider from "./theme-provider";
export default function Layout({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
  // children here are server components — they stay server
}
```

Server components inside `{children}` cannot use `useContext` — hooks don't exist on the server. Only client components consume the context.

## Sharing data with context and React.cache

Problem: the same data needed by both server and client components in the same request.

- **Client components** get data from context (can't call server functions directly)
- **Server components** call the fetch function directly (can't read context)

Without deduplication, this means two fetches for the same data.

`React.cache` memoizes the function per request — any call to `getUser()` within the same request returns the same Promise, the fetch only runs once:

```tsx
// layout.tsx
const userPromise = getUser()                    // fetch runs here (1st call)
<UserProvider userPromise={userPromise}>...</UserProvider>

// some server component
const user = await getUser()                     // same cached result, no 2nd fetch
```

Also deduplicates across multiple server components independently calling the same function — no need to prop-drill from a parent just to avoid duplicate fetches.

Cache is scoped per request — next request starts fresh.

`React.cache` inside a `use cache` boundary gets its own isolated scope, separate from the outer request's scope. If `getUser()` is called in the layout (request scope) AND inside a `use cache` function, those two calls don't share memoization. Reason: `use cache` must produce a deterministic, self-contained output — if it shared React.cache state with the outer request, its output could differ depending on what already ran in that request, making the cached result unreliable for future requests.

## Server Functions

- A Server Function is an async function marked with `'use server'`. It always runs on the server. A client component can call it like a normal function, but under the hood it's a network request.

- **Broader term vs action:** "Server Function" is the broad term. "Server Action" specifically means a Server Function used in a mutation context (form submission, data update). A Server Action is by convention wrapped in `startTransition` — this happens automatically when passed to a `<form action={...}>` or `<button formAction={...}>`.

- **How it works at build time:**
  Next.js scans all `'use server'` functions and assigns each a unique ID (a hash). It registers a map: `id → function`. This map lives on the server only.

- **What the client actually gets:**
  When a client component imports a server function, the import is replaced with a stub — a function with the same name and signature, but internally it just calls `callServer(id, serializedArgs)`. The real function code never reaches the browser.

  ```ts
  // What you write (server):
  export async function greet(name: string) {
    "use server";
    return { message: `Hello, ${name}!`, pid: process.pid };
  }

  // What the client bundle actually contains (simplified):
  export async function greet(name) {
    return callServer("abc123", [name]);
  }
  ```

- **Flight — React's wire protocol:**
  Flight is the serialization format React uses to send data over the wire. It's like JSON but handles things JSON can't: Promises, dates, React elements (JSX), client component references, FormData, errors, etc. It's used in both directions:
  - Server → client: RSC payloads (component trees, props)
  - Client → server: server function arguments
  - Server → client: server function return values

- **What happens when you call a server function:**

  ```
  1. greet("Obada") called on the client
  2. stub serializes args using Flight → sends POST to current page URL
     - Header: Next-Action: abc123  (the function's ID)
     - Body: Flight-encoded ["Obada"]
  3. Server receives POST, looks up abc123, deserializes args, runs real greet()
  4. Return value serialized as Flight stream → sent back as RSC payload
  5. Next.js on the client decodes the Flight stream → resolves the Promise
  6. await greet("Obada") returns { message: "Hello, Obada!", pid: 1234 }
  ```

  The POST goes to the current page URL (e.g. `/lab/server-fn`). Next.js distinguishes it from a normal page request via the `Next-Action` header.

- **Why RSC payload and not plain JSON for the response:**
  The response can contain more than just the return value. If the server function calls `revalidatePath`/`revalidateTag`, Next.js re-renders the affected routes on the server and includes fresh RSC payload for those routes in the same response. The client then reconciles that tree — diffs the new virtual tree against the current one, and commits the changes to the DOM (updating, mounting, or unmounting nodes as needed). All in one roundtrip.

- **Simple case (no revalidation) — full sequence:**

  ```tsx
  // Client component
  async function handleClick() {
    const response = await greet(name); // POST fires, awaits Flight response
    setResult(response); // normal React setState → re-render
  }
  ```

  No RSC reconciliation needed here. `await greet()` resolves with the return value, `setResult` triggers a normal React re-render. That's it.

- **Where to define server functions:**
  - Inline inside a Server Component (can't do this in a Client Component)
  - In a separate file with `'use server'` at the top — then importable from both server and client components

  ```ts
  // app/actions.ts — entire file is server-only
  'use server'
  export async function createPost(formData: FormData) { ... }
  export async function deletePost(id: string) { ... }
  ```

- **Demo in project:** `src/app/lab/server-fn/` — client component calls `greet(name)`, response includes `process.pid` and timestamp proving it ran on the server. Network tab shows the POST with `Next-Action` header.

## Server Actions and `startTransition`

- **Server Action = Server Function used in a mutation context.** By convention it's always wrapped in `startTransition` — automatically when passed to `<form action={...}>` or `<button formAction={...}>`, manually otherwise.

- **What `startTransition` is:**
  React has two categories of updates:
  - Urgent: typing, clicking — needs instant visual feedback
  - Transition: bigger async UI changes (navigating, submitting a form) — user can wait a moment

  `startTransition` tells React "the updates inside here are non-urgent". React:
  1. Sets `isPending = true` **immediately** — so you can show a spinner right away
  2. Runs the async function in the background
  3. Keeps the **current committed UI on screen** while waiting — no blank/broken intermediate states
  4. When the async function resolves, commits all state updates from inside it **in one batch**
  5. Sets `isPending = false` in the same commit

  ```tsx
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const data = await savePost(); // server call
      setResult(data); // deferred until server responds
    });
    // isPending is already true here — spinner shows instantly
  }
  ```

  Key: `isPending` flips to `true` immediately (spinner shows). State updates **inside** the async body are what get deferred until it resolves. They commit together at the end.

- **Form actions wrap `startTransition` automatically:**
  When you pass a server action to `<form action={...}>`, React internally does:

  ```ts
  startTransition(async () => {
    await yourServerAction(formData);
  });
  ```

  The `<form>` also provides the transition's pending state through React context — so child components can read it.

- **`useFormStatus` — reads the form's pending state:**
  Must be used inside a child component of the `<form>`. Reads `isPending` from the nearest parent form's transition context.

  ```tsx
  // Must be its own component — hooks can't be called conditionally mid-render
  function SubmitButton() {
    const { pending } = useFormStatus();
    return <button disabled={pending}>{pending ? "Saving..." : "Save"}</button>;
  }

  function MyForm() {
    return (
      <form action={createPost}>
        <input name="title" />
        <SubmitButton /> {/* inside the form → can read its pending state */}
      </form>
    );
  }
  ```

  `SubmitButton` cannot be inlined directly in `MyForm` — `useFormStatus` must be in a **child component** of the form, not the same component that renders the form.

- **`useActionState` — pending + return value:**
  When you also need the server action's return value (e.g., validation errors), `useActionState` wraps everything:

  ```tsx
  // Server action: receives prevState as first arg, FormData as second
  async function createPost(
    prevState: State,
    formData: FormData,
  ): Promise<State> {
    "use server";
    const title = formData.get("title");
    if (!title) return { error: "Title is required", created: null };
    await db.createPost(title);
    return { error: null, created: { title } };
  }

  function PostForm() {
    const [state, action, pending] = useActionState(createPost, {
      error: null,
      created: null,
    });
    //     ↑ last return value   ↑ wrapped action    ↑ isPending

    return (
      <form action={action}>
        <input name="title" />
        {state.error && <p>{state.error}</p>}
        <button disabled={pending}>{pending ? "Saving..." : "Save"}</button>
      </form>
    );
  }
  ```

  `state` starts as `initialState`, then becomes the return value of the last server action call.

  Rough implementation — it's just `useState` + `useTransition` glued together:

  ```tsx
  function useActionState(action, initialState) {
    const [state, setState] = useState(initialState);
    const [isPending, startTransition] = useTransition();

    function wrappedAction(formData) {
      startTransition(async () => {
        const newState = await action(state, formData); // passes prevState + formData
        setState(newState); // deferred — commits when transition ends
      });
    }

    return [state, wrappedAction, isPending];
  }
  ```

  This is also why the server action receives `prevState` as its first arg — `useActionState` passes the current `state` to it on every call.

- **Full sequence for a form submission:**

  ```
  user clicks Submit
    → React intercepts the native form submit event
    → startTransition starts
      → isPending = true → re-render → button shows "Saving..."
      → POST fires to server with FormData + Next-Action header
      → server runs createPost(), returns { error: null, created: {...} }
      → Flight stream arrives, decoded
      → setState({ error: null, created: {...} }) batched
    → transition ends
      → isPending = false + new state committed in one re-render
      → button shows "Save", success UI appears
  ```

- **Demo in project:** `src/app/lab/server-fn/` — `PostForm` component shows `useActionState` + `useFormStatus`. 1s fake delay makes the pending state clearly visible. Submit empty fields to see server-side validation errors returned as state.

## Route Handlers

- A `route.ts` file instead of `page.tsx`. Export HTTP verb functions (`GET`, `POST`, etc.), return a plain `Response`. No UI, no layouts, no client-side navigation — just an API endpoint.

- **Caching without `cacheComponents`:** blunt, all-or-nothing. Same as the old route segment configs. Force the entire handler to be treated as static with `export const dynamic = 'force-static'` — Next.js runs it at build time, caches the whole `Response` in Full Route Cache. Only works for `GET`. `POST`/`PUT`/`DELETE` are never cached (they're mutations).

- **Caching with `cacheComponents`:** same model as page components. Fully static handler (no dynamic APIs) → prerendered at build automatically. Touches dynamic APIs (`request.headers`, `cookies()`, `Math.random()`) → runs at request time. No config needed either way.

- **`use cache` in a helper function = Data Cache caching, not prerendering.** For the case where the handler is dynamic (can't be prerendered) but has an expensive sub-operation you want cached across requests:

  ```ts
  export async function GET(request: Request) {
    const ua = request.headers.get("user-agent"); // dynamic — always runs fresh
    const products = await getProducts(); // Data Cache — skipped on repeat calls
    return Response.json({ ua, products });
  }

  async function getProducts() {
    "use cache";
    cacheLife("hours");
    return db.query("SELECT * FROM products");
  }
  ```

  First request → `getProducts()` runs, result stored. Second request → handler runs again (dynamic, always does), but `getProducts()` returns cached result — no DB call. This is the same second mode of `use cache` from the cache components notes: "runs at request time on first call, caches result keyed by inputs, reuses on future requests."

- `use cache` can't go directly in the handler body — must be in a helper function. The handler is the route entry point Next.js controls; `use cache` needs to mark a self-contained function whose output is independently cacheable.

- **The `use cache` parallel in the component world:** same pattern applies — dynamic parent component (reads `cookies()`) with an expensive child whose data should be cached → `use cache` on the child component. Both worlds need explicit `use cache` for this case; the only case you don't need it is a fully static unit (component or handler), which is prerendered automatically.

## Hydration mismatches caused by browser extensions

- Extensions can modify the DOM before React hydrates, causing false hydration warnings. To confirm it's extension-caused: reproduce in incognito. In production, just filter the error in your monitoring tool — you can't control user extensions.

## Proxy (formerly Middleware)

- Renamed from Middleware to Proxy in Next.js 16. A `proxy.ts` file at the project root that intercepts every request before it hits a page — can redirect, rewrite, or modify headers. Runs in the Edge runtime (not Node.js — no `fs`, no DB clients), so it's fast and globally distributed but limited to Web standard APIs only. Use for cheap checks (auth cookie present? redirect to login), not slow data fetching.

- TODO
  - Learn how Server Components work internally, how Client Components are served, and why extracting only client-required parts minimizes client JS.
  - Revisit: https://nextjs.org/docs/app/getting-started/layouts-and-pages#what-to-use-and-when
  - https://nextjs.org/docs/app/getting-started/cache-components#metadata-and-viewport
  - https://nextjs.org/docs/app/getting-started/updating-data#refreshing ... from refetching and downward
  - https://nextjs.org/docs/app/getting-started/caching-and-revalidating .. whole thing
  - Learn how Next.js App Router concepts map to browser Network tab behavior:
    - hard load vs soft navigation requests
    - HTML vs RSC payload vs JS/CSS chunks
    - prerendered static response vs request-time dynamic render
    - where streaming appears in network timing/waterfall
  - Learn about SEO features in nextjs
  - Why nextjs?
  - what is hydration?
    - question: solve a bug related to hydration
  - how does react transition works
  - the loading thing in /account & /billing

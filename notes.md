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
      <button>Add 1 to cart</button>        <!-- client component HTML from SSR pass -->
      <p>Loading reviews...</p>              <!-- Suspense fallback -->

      <script>self.__next_f.push([...])</script>   <!-- RSC payload stored for React -->
      <script src="/add-to-cart-button.js"></script> <!-- client component JS bundle -->
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
      $RC("reviews-boundary", "<div>Great keyboard!</div><div>Love it</div>")
      </script>
      <script>self.__next_f.push([/* RSC payload update */])</script>
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
      import Modal from './modal'       // client
      import CartItems from './cart-items' // server
      import CartTotal from './cart-total' // server

      export default function Page() {
        return (
          <Modal
            header={<CartItems />}    // server component rendered first, passed as prop
            footer={<CartTotal />}    // same -- any prop works, not just children
          >
            <p>Your cart</p>
          </Modal>
        )
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

- TODO
  - Learn how Server Components work internally, how Client Components are served, and why extracting only client-required parts minimizes client JS.
  - Revisit: https://nextjs.org/docs/app/getting-started/layouts-and-pages#what-to-use-and-when
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

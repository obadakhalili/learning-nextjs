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

- Server layout + client-only dynamic extraction
  - Active tab highlighting needed `usePathname()`, which is a client hook.
  - Keeping `/lab/layout.tsx` as a Server Component preserves server-first rendering/caching behavior for the layout.
  - Only the nav was moved into a small Client Component (`app/lab/_components/lab-nav.tsx`).
  - "Got it" framing:
    - keep `/lab` layout in app router cache path
    - move out only the part that requires client execution
    - this minimizes shipped client JS compared to making the whole layout client-side

- TODO
  - Learn how Server Components work internally, how Client Components are served, and why extracting only client-required parts minimizes client JS.

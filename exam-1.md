# Next.js Exam 1

> 50 questions across concept, practice, and applied categories.
> Fill in the **Your Answer** block for each question. Leave the **Grade & Notes** block empty — it will be filled in during review.

---

## Grading Summary

| Q       | Topic                                        | Score | Status  |
| ------- | -------------------------------------------- | ----- | ------- |
| Q1      | Two RSC rendering passes                     | 3/5   | graded  |
| Q2      | layout.tsx vs template.tsx                   | 2/5   | graded  |
| Q3      | Why params is a Promise                      | 3/5   | graded  |
| Q4      | 'use client' module boundary                 | 2/5   | graded  |
| Q5      | Four cache layers                            | 3/5   | graded  |
| Q6      | { cache: 'no-store' } dual effect            | 4/5   | graded  |
| Q7      | Preloading pattern with React.cache          | 3/5   | graded  |
| Q8      | revalidateTag vs updateTag                   | 4/5   | graded  |
| Q9      | self.\_\_next_f.push                         | 2/5   | graded  |
| Q10     | Soft vs hard navigation                      | 3/5   | graded  |
| Q11     | Hiding UI is not security                    | 2/5   | graded  |
| Q12     | cacheComponents flag                         | 3/5   | graded  |
| Q13     | page.tsx vs default.tsx in slots             | 1/5   | graded  |
| Q14     | Route Handler / Server Action misuses        | 3/5   | graded  |
| Q15     | use cache two modes                          | 2/5   | graded  |
| Q16     | Preloading pattern implementation            | 3/5   | graded  |
| Q17     | useActionState + useFormStatus form          | —/5   | pending |
| Q18     | Parallel routes modal pattern                | —/5   | pending |
| Q19     | DAL with verifySession                       | —/5   | pending |
| Q20     | ISR + on-demand revalidation                 | —/5   | pending |
| Q21     | RSC vs SSR (community)                       | —/5   | pending |
| Q22     | Parallel routes (community)                  | —/5   | pending |
| Q23     | ISR (community)                              | —/5   | pending |
| Q24     | Middleware (community)                       | —/5   | pending |
| Q25     | generateStaticParams (community)             | —/5   | pending |
| Q26     | Streaming (community)                        | —/5   | pending |
| Q27     | Error boundaries (community)                 | —/5   | pending |
| Q28     | Route Handlers vs Server Actions (community) | —/5   | pending |
| Q29     | Intercepting routes (community)              | —/5   | pending |
| Q30     | next/image (community)                       | —/5   | pending |
| Q31     | Open / creative                              | —/5   | pending |
| Q32     | Open / creative                              | —/5   | pending |
| Q33     | Open / creative                              | —/5   | pending |
| Q34     | Open / creative                              | —/5   | pending |
| Q35     | Open / creative                              | —/5   | pending |
| Q36     | Open / creative                              | —/5   | pending |
| Q37     | Open / creative                              | —/5   | pending |
| Q38     | Open / creative                              | —/5   | pending |
| Q39     | Open / creative                              | —/5   | pending |
| Q40     | Open / creative                              | —/5   | pending |
| Q41–Q50 | (see exam)                                   | —     | pending |

**Part 1 (Concept):** 40 / 75 — graded
**Part 2 (Practice):** 3 / 25 — in progress (Q16 graded)
**Part 3 (Community):** — / 50 — pending
**Part 4 (Open):** — / 50 — pending
**Total:** 43 / ? — in progress

---

## Part 1 — Concept Questions (15)

_These require solid understanding of how Next.js works under the hood._

---

### Q1

Describe the two server-side rendering passes that happen on initial page load. What does each pass take as input, what does it do, and what does it output? What is the relationship between the two outputs?

**Your Answer:**

```
on initial page load, nextjs renders the component tree corresponding to the given route in the server. in the first pass, the output is the rsc payload. it is a special json structure that contains the elements which make up the route page, with some exceptions. for example, client components in the components tree are not resolved, instead there are references to them in the rsc payload. also, suspended async components are not resolved and are instead replaced with the closed suspense boundrey fallback component. finally, props passed around server components are serialized using the flight protocol. it is similar to json but it handles serializing other data types such as maps, sets, jsx, and famously promises.

the second pass takes the rsc payload as input, and compiles it as html. importantly here, references to client components are resolved and included in the final html output.

the server serves the html result for immediate visual display + SEO, and the RSC payload to be used by the react code on the client to reconlice the payload with the app tree and hydrate.
```

**Grade & Notes:**

```
3/5

Good foundation — you correctly identified both passes, described the RSC payload structure, mentioned Flight, and explained the dual purpose of the two outputs.

Missing:
1. What happens to client components in the SSR pass (Pass 2): they execute WITH LIMITATIONS — useState returns the initial value, useEffect is skipped, event handlers produce no output. You said they're "resolved and included in the final HTML" which is correct but vague. The limitation is important.
2. The relationship between the two outputs is the weakest part. HTML is consumed by the BROWSER'S BUILT-IN PARSER (renders before any JS loads). The RSC payload is consumed by REACT'S RECONCILER after its JS downloads. They serve different consumers at different points in time — not just the same info in two formats.
3. Small precision: in the RSC pass, a suspended async component doesn't get "replaced with its fallback" — it's marked as PENDING in the payload. The SSR pass (Pass 2) is what renders the fallback as HTML. The distinction matters.
```

---

### Q2

What is the difference between `layout.tsx` and `template.tsx`? Give a concrete scenario where using `template.tsx` instead of `layout.tsx` changes visible behavior.

**Your Answer:**

```
- `layout.tsx`: wraps the entire route components inside it. it is responsible for rendering the main page component and other slots that exist in the same route segment
`- `template.tsx`: wraps each parallel branch inside the route components tree (main page component + slots components) and has a key assigned to current path, so it rerenders on changes to path changes inside the segment branch, unlike `layout.tsx` which only renders once

example: if there are multiple parallel branches to render due to use of slots, then template will wrap each, but layout will wrap the entire route contents
```

**Grade & Notes:**

```
2/5

You understand that template remounts on path changes (the key mechanic) but two problems:

1. "layout.tsx which only renders once" is wrong. Layout REUSES across child-route transitions — it doesn't remount — but it can still re-render and update. "Never re-renders" is incorrect.

2. The question asked for a concrete scenario where the behavior VISIBLY CHANGES. Your example describes structure ("template wraps each branch") but not what the USER sees differently. A proper scenario: "A CSS enter animation attached to a mount lifecycle — with template.tsx, navigating /dashboard/a → /dashboard/b re-triggers the animation because the component remounts. With layout.tsx, the animation only plays on the very first visit." Or: "a counter state inside a template.tsx component — resets to 0 on every route change. The same counter in layout.tsx persists across child navigations."
```

---

### Q3

Why is `params` typed as a `Promise` in Next.js App Router? What concept does this Promise represent — is it about URL parsing performance, or something deeper about the rendering model?

**Your Answer:**

```
technically, params shouldn't need to be awaited because accessing them is not an async operation. in fact, in previoues nextjs verions params weren't wrapped in promises.
however, params are wrapped in a promise to conform to a certain pattern. which is that access to data only available at request time should be inside async components that are suspended and wrapped inside suspense boundary.
```

**Grade & Notes:**

```
3/5

Right direction — you correctly identified it's NOT about URL parsing performance and IS about a rendering signal. Good.

The framing is slightly off though. You said: "access to request-time data should be inside async components that are suspended and wrapped inside suspense boundary." That conflates the signal with the mechanism. The Promise is a RENDERING SIGNAL that tells the renderer "this component consumes request-scoped data here." Awaiting it is what opts the component into dynamic rendering. A Suspense boundary isn't always required — it's required when you want the static shell to prerender and this component to become a dynamic hole. But the Promise itself doesn't mandate that. The signal is simpler: "I touched request data, I must run at request time."

More precise framing from your notes: "Promise here is a rendering signal, not a URL parsing cost issue. It marks: request-scoped data is consumed here."
```

---

### Q4

`'use client'` is often described as "this component runs on the client." That's incomplete. What does `'use client'` actually define, and what are the implications for everything imported from that file?

**Your Answer:**

```
"use client" marks a seperation in the app tree between server components and client components. client components actually run on the server on initial page load to produce the html, for that reason the initial render shoudn't touch browser specific apis or anything that breaks the component on the server.
```

**Grade & Notes:**

```
2/5

You covered one true thing (client components SSR on the server on initial load) but completely missed what the question was actually asking: the MODULE GRAPH boundary.

The question specifically asked: "what are the implications for everything IMPORTED from that file?" — this wasn't answered.

The critical thing `'use client'` does: it defines a module graph boundary. Everything imported from a `'use client'` file joins the client module graph. If you import a server component inside a `'use client'` file, it stops being a server component — it becomes a client component, its code ships to the browser. The ONLY safe way to render a server component inside a client component is via props (passing it from a server orchestrator), not via import.

"marks a separation in the app tree" is imprecise. It's a MODULE graph boundary, not just an app tree marker. The module graph is static (determined at build time from imports), while the app tree is runtime.
```

---

### Q5

Name and describe all four cache layers in Next.js. For each, state: (a) where it lives, (b) its scope (same request, across requests, client session), and (c) when it gets cleared.

**Your Answer:**

```
- full route cache
  - populated at build time and its cache entries are the html + rsc payload of static parts of the app
  - it can be populated at runtime for routes that dont access request data that weren't prerendered at build time and stored inside the full route cache. for example, a dynamic route that some of its slugs weren't returned in generateStaticParams and was only rendered at request time. next request will be served from the full route cache
  - by default this cache lives in the server file system, and some deployment platform moves this part of the build output to a cdn layer
  - it persists across requests and deployments, and cache entries are purged when revalidated it using `revalidatePath`
- data cache
  - stores `fetch` responses (if the user opts into it) and other cached functions output inside a data store
  - it lives in the server file system by default and some deployment platforms like vercel moves the cache into a special KV store
  - persists across requests and deployments
  - cache entries can be clearned using revalidation methods such as `revalidateTag` & `updateTag`
- react memoization
  - is actually implemented by React and used in Next
  - it memiozes the output of decorated functions and stored inside the server memory
  - it persists within the one request
  - the point of this cache is for server components that need access to the same data to be able to call the same functions multiple times in different places without having to worry about passing data around and prop drill the data
- router cache
  - stores the rsc payload of fetched routes during the user session when doing in-app navigation
  - the cache persists during user session starting from initial page load until the next hard reload
```

**Grade & Notes:**

```
3/5

Good breadth — all four layers are present and mostly accurate. Issues per layer:

Full Route Cache: "purged when revalidated using revalidatePath" — incomplete. revalidateTag also cascades to it (via tag dependency tracking). You should know BOTH paths.

Request Memoization: You didn't explain HOW it's activated — automatic for `fetch` (deduplication built in), manual `React.cache` wrapper for DB/ORM calls. This is important because without knowing this you'd forget to wrap DB functions.

Router Cache: Two significant gaps — (a) stale times: in Next.js 15, static routes have 5min stale time, dynamic routes have 0s (every forward nav re-fetches). (b) Back/forward navigation ALWAYS restores from cache regardless of staleness — this is different from forward navigation. Also missing: cookie mutations in a Server Action automatically clear the Router Cache.

Order note: the canonical order for these layers is Request Memoization → Data Cache → Full Route Cache → Router Cache (innermost to outermost, closest to data to closest to user). Not wrong to list them differently, but worth knowing.
```

---

### Q6

Explain what `{ cache: 'no-store' }` on a `fetch` call does. Be specific — it has two distinct effects. What is the second, less obvious one, and why does it happen?

**Your Answer:**

```
- `no-store` option opts out of the data cache and nextjs doesnt cache the responses of fetch calls that use this function
- any route's components that call `fetch` functions with `no-store` option set designates this route as dynamic and is only rendered at request time. doesn't get stored at full route cache
- the idea of the second behaviour is that there is no point of never caching a fetch call if the page that uses the data to render html is cached
```

**Grade & Notes:**

```
4/5

Both effects are there and the reasoning behind the second one is correct. Solid answer.

Minor precision: the reasoning could be stated more mechanically. How Next.js actually works: during a rendering pass, when it encounters a `no-store` fetch (or any dynamic API like `cookies()`, `headers()`, `searchParams`), it marks the route as dynamic at that point. This is detected during the rendering pass itself — it's not a pre-build analysis. The effect is the route is excluded from Full Route Cache entirely. `no-store` is just one of several dynamic signals — worth knowing the others.
```

---

### Q7

Explain the preloading data pattern using `React.cache`. What specific problem does it solve, what would happen without `React.cache`, and when does the pattern NOT apply?

**Your Answer:**

```
- data preloading applies when a parent component waits to fetch some data in order to render, and the child component also waits to fetch some data, and both of these data fetches are not dependent.
- in this case, the data needed by the second component can be prefetched in the parent component (without awaiting), and when the child component runs and try to fetch the same data it will be already resolved or will take less time to wait
- using `React.cache` is an important part of this pattern due to request deduplication, because we need the second call to the child component data to not make a different request and instead fetch the cached response or wait for the response of the original request
```

**Grade & Notes:**

```
3/5

Core mechanism understood — fire-and-forget to get the fetch running, React.cache to deduplicate so the child's call returns the same in-flight Promise. Good.

Two gaps:

1. The value proposition should be stated in concrete terms: WITHOUT preloading, execution is sequential: total time = checkAvailability time + getProduct time. WITH preloading, they run in parallel: total time = max(checkAvailability, getProduct). This X+Y → max(X,Y) framing is the key reason the pattern exists.

2. "When does the pattern NOT apply" — you said "both data fetches are not dependent" but didn't give the explicit constraint: if the blocking work DEPENDS ON the result of the data you want to preload, you cannot preload it. Example: if you need the product ID from an API call to then fetch product details, you can't preload the product details — you don't have the ID yet. The pattern only works when the two operations are genuinely independent of each other's results.
```

---

### Q8

Explain the difference between `revalidateTag` and `updateTag`. What does each do to the cache at the moment it is called, and what does the user experience on the very next request?

**Your Answer:**

```
- `revalidateTag` uses a stale-while-revalidate strategy: it marks the cache entries mapped to the given tag as stale, doesn't purge them so next requests can still use the stale data in the store, and in the background when the fresh data is available its stored in cache
- `updateTag` purges the cache immediately and next request have to wait until the fresh data is stored
```

**Grade & Notes:**

```
4/5

The core difference is correctly captured — stale-while-revalidate vs immediate purge. Good.

Two minor points:

1. `updateTag` is Server Action ONLY. Route Handlers cannot call it. This is a meaningful restriction worth knowing (if you need immediate purge from a Route Handler you have to use revalidatePath instead).

2. "next request have to wait until the fresh data is stored" is slightly imprecise. It's a cache MISS — the next request fetches fresh data as part of serving that request. The data isn't pre-fetched after the purge — it's fetched on demand when the next request comes in and finds an empty cache. The user who triggered the action gets fresh data because they're that next request (usually after a redirect).
```

---

### Q9

What is `self.__next_f.push` and why does Next.js use this pattern? Why can't the RSC payload just be a JSON object embedded in a `<script>` tag?

**Your Answer:**

```
`self._next_f.push` contains the rsc payload from the server injected as scripts in the html page. the idea is to make the rsc payload available as soon as the page loads so that when react loads it can access it Immediately
```

**Grade & Notes:**

```
2/5

You described WHAT it does (stores payload for React to read later) but didn't answer WHY this specific pattern — array with push calls instead of a single JSON object. The question directly asks this.

Two reasons for the push-to-array pattern:

1. STREAMING. The RSC payload doesn't arrive all at once. As Suspense boundaries resolve on the server, new chunks stream in as separate script tags — each one calls `.push()` to append to the array. A single JSON object can't be incrementally appended. The array accumulates chunks as they stream in, so React gets a complete picture once it reads the array.

2. REACT HASN'T LOADED YET when the browser parses the inline scripts. The push calls execute immediately during HTML parsing and just store data. Later, when React's JS bundle finishes downloading and runs, it reads from the array. The array acts as a mailbox — data is deposited during parsing, collected when React is ready. If it were `window.__payload = {...}`, React would need to know the variable name AND the full payload would need to be available all at once.
```

---

### Q10

Describe how soft navigation (clicking a `<Link>`) differs from a hard navigation in terms of: (a) what the server does, (b) what the client receives, (c) what happens to client component state, and (d) how layouts are handled.

**Your Answer:**

```
- initial page load (or hard navigation): server does two passes, the first produces the rsc payload and the second uses the rsc payload to generate the html. both are served to the browser, the html for initial visual display and is useful for seo and the rsc is necessary for reconcilation and hydration by react on the client
- soft (or within app) navigation: request to fetch the page is sent to the server, a header is sent containing the current next router state so the server knows what to avoid rerendering. and only the rsc is produced and served to the client and react uses it to reconcile the app tree and update the ui
```

**Grade & Notes:**

```
3/5

(a) and (b) are correct — server does RSC-only pass, client receives only RSC payload. (d) is mentioned (Router State Tree header). Good.

Missing (c) and (d) fully:

(c) CLIENT COMPONENT STATE — you didn't address this at all. State is preserved because React diffs by tree position. If a component occupies the same position in the old and new virtual trees, React keeps its state. The server knows nothing about client state — it just sends RSC payload. React on the client is responsible for deciding what to keep.

(d) LAYOUTS specifically: the reason shared layouts don't unmount is that React's diff sees them in the same position in both trees and keeps them mounted. The Router State Tree header tells the server which layouts are already rendered so it can skip them in the RSC payload, making the response smaller — but it's React's diffing (not the header) that actually keeps layouts mounted on the client.

Also: client components during soft nav are NOT executed on the server at all — no SSR pass. They render directly on the client from the RSC payload references. Worth stating explicitly.
```

---

### Q11

Why is hiding a button or a page returning `null` NOT a security measure in Next.js? How should authorization actually be enforced, and at which layer?

**Your Answer:**

```
- returning `NULL` in server components is not enough because data can still be fetched from routes, so authorization must be enfornced in the data access layer not just in components.
```

**Grade & Notes:**

```
2/5

Correct direction, but too thin. "Data can still be fetched from routes" is vague. The answer needs to explain WHY hiding UI fails — the mechanism.

The actual reason: Server Actions and Route Handlers are HTTP endpoints callable directly, independent of any UI. A non-admin can POST directly to the page URL with the Next-Action header and call the action even if the button doesn't render:

  curl -X POST https://myapp.com/admin -H "Next-Action: abc123" -d '["user-id"]'

The action runs. The button not rendering is irrelevant.

Second missing point: putting an auth check in a LAYOUT is also insufficient — layouts only re-render on hard navigation. On soft navigation (Link clicks), the layout stays mounted and the auth check never fires again. If a session expires mid-session, the user can keep navigating via Link clicks and bypass the check.

Correct answer: verifySession() called inside EVERY data-fetching function and Server Action, unconditionally. Not in layouts (rendering concern), not in UI conditionals — in the data access functions themselves, which always run fresh per-request regardless of navigation type.
```

---

### Q12

Explain the `cacheComponents` flag and how it changes Next.js's rendering model. What is the fundamental shift — from route-level to what? What does it enable that wasn't possible before?

**Your Answer:**

```
by default, nextjs prerendering decision is per-route. static routes components are prerendering decision is per-route. static routes components are prerendered and stored in the full route cache, but dynamic routes that use slugs or search params are not touched. setting `cacheComponents` to true makes the decision per-component. so at build time, next will try to preprender the whole app tree, and will replace dynamic components with the fallback used in the surrounding suspense boundary
```

**Grade & Notes:**

```
3/5

The fundamental shift (route-level → component-level) is correct and clearly stated. Good.

Missing:

1. The NAME for what it enables: Partial Prerendering (PPR). The build output changes from ƒ (dynamic) to ◐ (partial prerender). Worth naming it.

2. Build-time enforcement: if a component calls dynamic APIs (cookies(), headers(), searchParams, etc.) WITHOUT a surrounding Suspense boundary, the build THROWS. It's not optional — dynamic parts must be explicitly wrapped. This is a hard contract.

3. `cacheComponents` replaces the old route segment configs (export const dynamic = ..., revalidate, fetchCache). Those existed because decisions had to be made at the route level since there was no component-level granularity. With cacheComponents, they become redundant.

4. The "static shell" concept: everything Next.js can resolve at build time without knowing who the user is or what they're requesting. That's what gets baked into the prerender. Only dynamic holes (behind Suspense, awaiting request data) are computed at request time.
```

---

### Q13

In the context of parallel routes, what is the difference between `page.tsx` and `default.tsx` inside a slot? What happens if you rename `default.tsx` to `page.tsx`?

**Your Answer:**

```
page.tsx is the main component for a given route, default.tsx is a fallback component that is rendered when the main component or any of the components of subroutes are not available.

in the context of parallel routes, not much is different. default.tsx component will render under the same rules, except the "where" it renders is different based on is it the component for a canonical route or being intercepted by another route or used as a slot
```

**Grade & Notes:**

```
1/5

This answer doesn't address what the question asked. The question is specifically about page.tsx vs default.tsx INSIDE A SLOT — a very specific parallel routes concept.

Inside a slot (e.g. @preview):
- @preview/page.tsx — rendered when the slot HAS a matching route for the current URL (e.g. you're directly at /editor and the slot has a page for that level)
- @preview/default.tsx — the FALLBACK rendered when NO matching slot branch exists for the current URL. For example, navigating to /editor/settings where @preview has no /editor/settings branch — default.tsx shows instead of a crash.

These are NOT interchangeable. Renaming default.tsx to page.tsx means:
- You GAIN: the slot renders page.tsx when you're at the root URL (/editor)
- You LOSE: the unmatched fallback. When navigating to a sub-route with no slot match, Next.js has nothing to render for that slot and will throw a 404 or render an error — there's no fallback anymore.

The general meaning of default.tsx (fallback when page isn't available) is related but the slot-specific mechanic (unmatched URL fallback) is what the question was testing.
```

---

### Q14

There are two common misuses of Next.js primitives: (a) calling a Route Handler from a Server Component, and (b) using Server Actions for data fetching. Explain why each is wrong and what to do instead.

**Your Answer:**

```
- route handlers are not available during prerendering, so calling it from inside a server component will fail. functions must be used as the source of truth for data and accessed by route handlers and server components instead.
- calls to server actions are scheduled making it ineffecient to use to fetch data and should only be used for mutations. data must be fetched from route handles or passed from server components as promises or resolved promieses instead.
```

**Grade & Notes:**

```
3/5

Direction is correct for both. But each is missing something:

(a) Route Handler from Server Component — you only gave ONE reason (fails during prerendering / build time). The second reason is equally important: even at RUNTIME, it's an unnecessary HTTP round trip to your own server and back. You make a network request to yourself, adding latency for no reason, when you could just call the function directly. Both reasons together make this a clear antipattern.

(b) Server Actions for data fetching — "scheduled" is the right word. The fix you gave is slightly off though: "fetched from route handlers or passed from server components as promises" — the actual correct fix is simpler: extract the shared logic into a PLAIN FUNCTION and call it directly from the Server Component. No HTTP, no Route Handler intermediary. The function is just TypeScript. Route Handlers are for external consumers; Server Components call functions directly.
```

---

### Q15

`use cache` has two distinct modes of operation depending on context. Describe both modes — what triggers each, when does the cached function actually execute, and how does caching work differently between them?

**Your Answer:**

```
- functions dependent on data only available at runtime or make io/network calls. these get cached at runtime on first request
- functions that dont access data only available at runtime get cached at build time
```

**Grade & Notes:**

```
2/5

You identified the two modes (build-time vs runtime) but the question asked HOW CACHING WORKS DIFFERENTLY between them — this wasn't answered.

Mode 1 (no runtime deps): runs at build time, result baked into the static shell, revalidated on schedule via cacheLife. Every request gets the same precomputed result. No cache key variability — there's one entry.

Mode 2 (receives runtime values as props, inside Suspense): runs at REQUEST time on the first call with a given set of inputs. Result is cached KEYED BY THOSE INPUTS. Future requests with the same inputs skip the expensive work and get the cached result. Different inputs = different cache entry. This is similar to React.cache but persisted ACROSS requests (not scoped to one request). This is the important distinction — React.cache resets each request, use cache mode 2 persists across requests.

Also missing: the constraint for both modes — runtime APIs (cookies(), headers(), etc.) cannot be called DIRECTLY inside a use cache function. You must read those values outside in a non-cached component and pass them as plain values (props/args). Those values then become part of the cache key. If you call cookies() inside use cache, it throws.
```

---

## Part 2 — Practice Questions (10)

_5 mid-level + 5 senior-level. Write real, working code._

---

### Q16 _(Mid-level)_

Implement a `ProductPage` server component that:

1. Has an independent `checkAvailability()` async operation that is unrelated to the product data
2. Uses the preloading pattern so the product DB query starts in parallel with `checkAvailability()`
3. Returns `null` if unavailable, otherwise renders a `<ProductDetails id={id} />` server component that calls the same query

Show the full implementation including the `React.cache` wrapper and the `preload` helper.

**Your Answer:**

```tsx

```

**Grade & Notes:**

```
3/5

The core preloading mechanic is correct: calling memoizedFetchProductDetails(id) without await
fires the query immediately, then independantAsyncOperation() runs while the fetch is in flight.
When ProductDetails calls the same memoized function, React.cache returns the cached result
(no second DB call). Parallelism works.

Two requirements missed:

1. No conditional null return. The result of independantAsyncOperation() (standing in for
   checkAvailability) is never used. The implementation should do:
     const available = await checkAvailability(id)
     if (!available) return null
   Without this, the component always renders ProductDetails regardless of availability.

2. No preload helper function. The question asks to show the preload helper explicitly:
     export function preload(id: string) { void memoizedFetchProductDetails(id) }
   This is the named abstraction that lets callers fire the query early (e.g., from a parent
   layout or at the top of the page) without knowing the internals. Inlining the call works
   functionally but misses the pattern.

Minor: typo in memoiozedFetchProductDetails.
```

---

### Q17 _(Mid-level)_

Implement a form with server-side validation using `useActionState` and `useFormStatus`:

- Fields: `title` (required), `body` (required)
- Server action returns `{ errors: Record<string, string> | null }`
- The submit button shows "Saving..." while pending and is disabled
- Validation errors are shown per-field

Show the server action and the form component.

**Your Answer:**

```tsx

```

**Grade & Notes:**

```

```

---

### Q18 _(Mid-level)_

You have a dynamic route handler `GET /api/products` that:

- Reads the `Authorization` header (making it dynamic — runs on every request)
- Calls an expensive `getProducts()` DB query that changes at most once per hour

Implement the route handler and `getProducts()` so the DB query is cached across requests while the handler itself remains dynamic.

**Your Answer:**

```ts

```

**Grade & Notes:**

```

```

---

### Q19 _(Mid-level)_

Set up the correct file structure and implementation for a parallel slot called `@preview` under `/editor`. Requirements:

- `/editor` shows both the editor content and a preview panel side by side
- The preview slot has its own page at `/editor`
- When navigating to a sub-route that has no matching preview branch, the preview slot shows a "No preview available" fallback

List the files needed and write the implementation for: the layout, the slot's page, and the slot's fallback.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q20 _(Mid-level)_

A client component `<ActiveLink>` uses `usePathname()` to highlight the active nav link. The layout containing it has `cacheComponents` enabled and must stay in the static shell.

Explain the problem that arises and implement the fix. Show the relevant layout code.

**Your Answer:**

```tsx

```

**Grade & Notes:**

```

```

---

### Q21 _(Senior-level)_

Implement a DAL + DTO layer for an app with three access levels: public, authenticated user (own data only), and admin. Include:

- `verifySession()` — decodes a session cookie, redirects to `/login` if invalid, returns `{ userId }`
- `getUser()` — returns the current user object
- `getPublicProfileDTO(slug)` — public, no auth required
- `getOwnProfileDTO()` — must be logged in, returns user's own sensitive data
- `getAdminUserDTO(targetId)` — must be admin, returns full user record including internal notes

Show how `React.cache` is used, and explain why it matters.

**Your Answer:**

```ts

```

**Grade & Notes:**

```

```

---

### Q22 _(Senior-level)_

Implement the promise-to-context pattern for session data across a layout. Requirements:

- `app/dashboard/layout.tsx` is a server component that must stay in the static shell (cacheComponents enabled)
- Many client components deep in the tree need the current user (fetched at request time)
- A coarse `<Suspense>` is NOT acceptable — it would hide the entire layout behind a fallback

Show: the context file, the client provider, the layout, and an example consumer component.

**Your Answer:**

```tsx

```

**Grade & Notes:**

```

```

---

### Q23 _(Senior-level)_

Implement an intercepted route for a photo gallery. Requirements:

- `/photos/[id]` is the canonical full-page photo view
- When navigating from `/gallery` (soft nav), `/photos/[id]` should be intercepted and rendered as a modal overlay on top of `/gallery`
- On hard refresh or direct URL entry, the canonical full page should show

Show the directory structure and write the interceptor page and the canonical page (minimal — just enough to show the pattern is correct).

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q24 _(Senior-level)_

Given this component tree for a `/dashboard` page with `cacheComponents` enabled:

```
DashboardPage
├── <h1>Dashboard</h1>              (static heading)
├── <UserGreeting />                (reads cookies() to get current user name)
├── <RecentActivity userId={...} /> (expensive DB query, changes every 5 minutes)
└── <StaticMetrics />               (computed at build time, pure static)
```

Identify: (a) what goes in the static shell, (b) what must be wrapped in `<Suspense>`, (c) what should use `use cache`, and (d) any violations that would cause a build error. Then write the full `DashboardPage` implementation.

**Your Answer:**

```tsx

```

**Grade & Notes:**

```

```

---

### Q25 _(Senior-level)_

A `addToCart(itemId)` server action should:

1. Insert the cart item into the DB
2. Ensure the user sees their updated cart immediately after redirect (read-your-own-writes)
3. Use `use cache` + `cacheTag` for the cart query

Walk through what happens in each cache layer (Data Cache, Full Route Cache, Router Cache) when this action fires, and implement the server action and the `getCart` function.

**Your Answer:**

```ts

```

**Grade & Notes:**

```

```

---

## Part 3 — Questions from Community Source (10)

_10 high-signal questions inspired by the Next.js interview questions repository._

---

### Q26

What is the difference between React Server Components (RSC) and SSR (Server-Side Rendering)? Are they the same thing? Can you have RSC without SSR?

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q27

What are parallel routes? Give a real-world use case where they provide value over simply rendering two components side by side in a layout.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q28

What is Incremental Static Regeneration (ISR)? How does the stale-while-revalidate model work — what does the user see after the revalidation window expires?

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q29

What is Next.js Middleware (now called Proxy)? What runtime does it execute in, what can it do, and what are its limitations that prevent it from being a complete authorization solution?

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q30

What is `generateStaticParams`? Explain on-demand static generation — what happens when a user visits a path that was NOT returned by `generateStaticParams`, and what role does `dynamicParams` play?

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q31

What is streaming in Next.js App Router? Explain how it works at the HTTP level, how it relates to Suspense, and how it differs from prefetching.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q32

How do error boundaries work in the App Router? Explain: what `error.tsx` handles, what `reset()` does, what happens on route change, and what it does NOT handle.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q33

What is the difference between Route Handlers and Server Actions? For each, state: HTTP method used, when Next.js chooses it, and appropriate use cases.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q34

What are intercepting routes? Explain the interception rule: when does interception apply and when does the canonical route win? What is the typical pattern for pairing them with parallel routes?

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q35

What is the `next/image` component and why does it exist? List at least 4 optimizations it applies, and explain one trade-off or gotcha when using it.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

## Part 4 — Open Category (10)

_Mixed format. Think carefully — some of these have nuance._

---

### Q36 — Trade-off Analysis

When would you choose ISR over PPR (Partial Prerendering) for a page? Give a scenario where ISR is the better choice, and justify why PPR would be overkill or wrong for that case.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q37 — Cache Cascade Walkthrough

A `revalidateTag('products')` call is made from a Server Action. Walk through what happens in each of the four cache layers: Request Memoization, Data Cache, Full Route Cache, and Router Cache. Be specific about what is cleared and what is not.

Now answer the same question but for a `revalidateTag('products')` called from a Route Handler instead. What changes?

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q38 — Auth Gotcha

A teammate writes the following layout to protect the `/dashboard` section:

```tsx
// app/dashboard/layout.tsx
export default async function DashboardLayout({ children }) {
  const session = await verifySession();
  if (!session) redirect("/login");
  return <>{children}</>;
}
```

They believe this makes `/dashboard/**` fully protected. Identify at least two distinct ways this can fail, and explain the correct approach.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q39 — Debugging: Loading State Not Showing

A user reports: "When I navigate from `/products/1` to `/products/2`, the page just freezes for 2 seconds. The loading spinner never shows." You have a `loading.tsx` in `app/products/`. Why isn't it working, and how do you fix it?

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q40 — `not-found.tsx` Precision

Explain the difference between a _route 404_ and a _resource 404_ in Next.js. Given:

- `app/products/not-found.tsx` exists
- `app/products/[id]/page.tsx` exists

For each URL below, explain what is rendered and why:

- `/products/999` (page calls `notFound()` when product doesn't exist in DB)
- `/products/new/details` (no route matches this URL)

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q41 — `React.cache` Scope Isolation

`getUser()` is called in two places in the same request:

1. In `layout.tsx` (running in the request scope)
2. Inside a `use cache`-marked function

Do these two calls share memoization? Why or why not? What are the practical implications?

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q42 — Prefetching Deep Dive

You have a page with 30 product links in the viewport. 15 are static routes, 15 are dynamic. Describe exactly what Next.js prefetches for each group (without any explicit `prefetch` prop), what the user experience looks like when they click each type, and what you'd add to improve UX for the dynamic ones.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q43 — Flight Protocol

Explain the Flight protocol (React's wire format). What problem does it solve that plain JSON cannot? List at least 3 types of values it can serialize that JSON cannot, and explain how streaming fits into it.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q44 — `useActionState` Internals

Describe the rough internal implementation of `useActionState`. What React primitives does it build on, why does the server action receive `prevState` as its first argument, and what is the timing of state updates relative to the async call?

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q45 — Architecture Design

You're building a SaaS dashboard with these pages:

- `/` — marketing homepage (static content, changes quarterly)
- `/blog/[slug]` — blog posts (CMS-driven, ~10 edits/day)
- `/app/dashboard` — user's personal stats (real-time, per-user)
- `/app/settings` — user profile settings form
- `/admin/users` — admin-only user list (DB query, hundreds of users)

For each page, choose a rendering strategy (Static, ISR, Dynamic, PPR) and briefly justify the choice. If ISR, specify a reasonable revalidation window.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q46 — `use()` Hook vs `await`

When is `use(promise)` in a client component preferable to simply `await`-ing in a server component and passing the resolved value as a prop? Give two distinct scenarios where `use()` adds value that `await` cannot provide, and explain why.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q47 — Hydration Mismatch

Describe what a React hydration mismatch is at a technical level (what is React comparing, what happens when they don't match?). List three real-world causes of hydration mismatches in Next.js apps and how to diagnose or fix each.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q48 — `pushState` vs `router.push`

Explain the difference between calling `window.history.pushState(...)` and `router.push(...)` in a Next.js app. When would you use `pushState` instead of `router.push`, and what does "Next.js integrates with these" mean practically (i.e. what hooks still work)?

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q49 — Server Component Inside Client Component

A colleague writes this and is confused why the server component behavior disappears:

```tsx
// cart-modal.tsx
"use client";
import CartItems from "./cart-items"; // this was a server component

export default function CartModal() {
  return (
    <div>
      <CartItems />
    </div>
  );
}
```

Explain precisely why this breaks the server component, and show the correct pattern to render `CartItems` as a server component while keeping `CartModal` as a client component.

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

### Q50 — The Static Shell Mental Model

With `cacheComponents` enabled, explain what "the static shell" is. What determines whether something ends up in the shell vs as a dynamic hole? Can a client component be part of the static shell? Can a server component be a dynamic hole?

**Your Answer:**

```

```

**Grade & Notes:**

```

```

---

_End of Exam 1. Good luck._

# Next.js Exam 1

> 50 questions across concept, practice, and applied categories.
> Fill in the **Your Answer** block for each question. Leave the **Grade & Notes** block empty — it will be filled in during review.

---

## Part 1 — Concept Questions (15)

*These require solid understanding of how Next.js works under the hood.*

---

### Q1

Describe the two server-side rendering passes that happen on initial page load. What does each pass take as input, what does it do, and what does it output? What is the relationship between the two outputs?

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q2

What is the difference between `layout.tsx` and `template.tsx`? Give a concrete scenario where using `template.tsx` instead of `layout.tsx` changes visible behavior.

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q3

Why is `params` typed as a `Promise` in Next.js App Router? What concept does this Promise represent — is it about URL parsing performance, or something deeper about the rendering model?

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q4

`'use client'` is often described as "this component runs on the client." That's incomplete. What does `'use client'` actually define, and what are the implications for everything imported from that file?

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q5

Name and describe all four cache layers in Next.js. For each, state: (a) where it lives, (b) its scope (same request, across requests, client session), and (c) when it gets cleared.

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q6

Explain what `{ cache: 'no-store' }` on a `fetch` call does. Be specific — it has two distinct effects. What is the second, less obvious one, and why does it happen?

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q7

Explain the preloading data pattern using `React.cache`. What specific problem does it solve, what would happen without `React.cache`, and when does the pattern NOT apply?

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q8

Explain the difference between `revalidateTag` and `updateTag`. What does each do to the cache at the moment it is called, and what does the user experience on the very next request?

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q9

What is `self.__next_f.push` and why does Next.js use this pattern? Why can't the RSC payload just be a JSON object embedded in a `<script>` tag?

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q10

Describe how soft navigation (clicking a `<Link>`) differs from a hard navigation in terms of: (a) what the server does, (b) what the client receives, (c) what happens to client component state, and (d) how layouts are handled.

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q11

Why is hiding a button or a page returning `null` NOT a security measure in Next.js? How should authorization actually be enforced, and at which layer?

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q12

Explain the `cacheComponents` flag and how it changes Next.js's rendering model. What is the fundamental shift — from route-level to what? What does it enable that wasn't possible before?

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q13

In the context of parallel routes, what is the difference between `page.tsx` and `default.tsx` inside a slot? What happens if you rename `default.tsx` to `page.tsx`?

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q14

There are two common misuses of Next.js primitives: (a) calling a Route Handler from a Server Component, and (b) using Server Actions for data fetching. Explain why each is wrong and what to do instead.

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

### Q15

`use cache` has two distinct modes of operation depending on context. Describe both modes — what triggers each, when does the cached function actually execute, and how does caching work differently between them?

**Your Answer:**
```

```

**Grade & Notes:**
```

```

---

## Part 2 — Practice Questions (10)

*5 mid-level + 5 senior-level. Write real, working code.*

---

### Q16 *(Mid-level)*

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

```

---

### Q17 *(Mid-level)*

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

### Q18 *(Mid-level)*

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

### Q19 *(Mid-level)*

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

### Q20 *(Mid-level)*

A client component `<ActiveLink>` uses `usePathname()` to highlight the active nav link. The layout containing it has `cacheComponents` enabled and must stay in the static shell.

Explain the problem that arises and implement the fix. Show the relevant layout code.

**Your Answer:**
```tsx

```

**Grade & Notes:**
```

```

---

### Q21 *(Senior-level)*

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

### Q22 *(Senior-level)*

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

### Q23 *(Senior-level)*

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

### Q24 *(Senior-level)*

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

### Q25 *(Senior-level)*

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

*10 high-signal questions inspired by the Next.js interview questions repository.*

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

*Mixed format. Think carefully — some of these have nuance.*

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
  if (!session) redirect('/login');
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

Explain the difference between a *route 404* and a *resource 404* in Next.js. Given:

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
'use client'
import CartItems from './cart-items'; // this was a server component

export default function CartModal() {
  return <div><CartItems /></div>
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

*End of Exam 1. Good luck.*

# Pages Router: Deep Dive from App Router

This tutorial assumes you know the App Router well and explains the Pages Router by contrast.
Each concept is anchored to a working example in `src/pages/pages-router/`.

---

## 1. The fundamental difference: there is no RSC

This is the single most important thing to internalize before anything else.

In the App Router, the component tree is split into two module graphs. Components default to server
components — they run only on the server, their code never reaches the browser. `'use client'`
marks the boundary into the client graph. The two-pass model (RSC pass → SSR pass) exists because
of this split.

In the Pages Router, **none of that exists**. There is one module graph. Every component is a
regular React component. The "server" shows up only in the data-fetching functions
(`getServerSideProps`, `getStaticProps`) — not in components themselves.

The rule that follows from this: **you cannot call `fs.readFile`, `process.env.SECRET_KEY`, or
`db.query()` inside a component body** in the Pages Router. Those functions would also be called on
the client during hydration, where Node.js APIs don't exist. Server-only code must live exclusively
inside the data-fetching functions.

```
App Router mental model:
  Component body → where does it run?
    Server component  → server only. DB calls fine. Code never bundled.
    Client component  → server (SSR) + client (hydration). No Node APIs.

Pages Router mental model:
  Component body       → server (SSR) + client (hydration). Always. No Node APIs.
  getServerSideProps   → server only. DB calls fine. Never bundled.
  getStaticProps       → server only, at build time. Never bundled.
```

The data-fetching functions exist as separate exports — not inlined in the component — precisely
because Next.js needs to surgically remove them from the client bundle while keeping the component.

---

## 2. Routing: the `pages/` directory

Every `.tsx`/`.ts` file in `pages/` (except files starting with `_` and files in `pages/api/`)
becomes a route. The mapping is direct:

```
pages/index.tsx                → /
pages/about.tsx                → /about
pages/blog/index.tsx           → /blog
pages/blog/[slug].tsx          → /blog/:slug
pages/blog/[...slug].tsx       → /blog/* (catch-all, 1+ segments)
pages/blog/[[...slug]].tsx     → /blog/* + /blog (optional catch-all)
```

Special files:
- `pages/_app.tsx`      — global wrapper for all pages (like root layout, but client-side)
- `pages/_document.tsx` — HTML shell customization (like `<html>` and `<body>` in root layout)
- `pages/404.tsx`       — custom 404 page
- `pages/500.tsx`       — custom 500 page
- `pages/_error.tsx`    — fallback for errors without a specific page

API routes live in `pages/api/`:
- `pages/api/hello.ts`  → `/api/hello`

When you have both `app/` and `pages/` in the same Next.js project, they coexist. Routes in
`pages/` go through the Pages Router. Routes in `app/` go through the App Router. The root
`app/layout.tsx` does NOT wrap pages in `pages/` — those use `_app.tsx` and `_document.tsx` only.

---

## 3. Data fetching: the three functions

### `getStaticProps` — build-time data

Runs at build time (and at revalidation time for ISR). Returns props that are passed to the page
component. The page is rendered to static HTML during the build.

```ts
// pages/pages-router/ssg.tsx
import type { GetStaticProps } from 'next';

type Props = { product: { id: number; name: string; price: number } };

export const getStaticProps: GetStaticProps<Props> = async (context) => {
  // context.params   — dynamic route params
  // context.locale   — active locale (if i18n configured)
  // context.preview  — true if in preview mode
  // context.previewData — data passed when entering preview mode

  const product = await db.getProduct(1); // Node.js APIs are fine here

  return {
    props: {
      product: JSON.parse(JSON.stringify(product)), // MUST be JSON-serializable
    },
    revalidate: 3600,  // optional: regenerate this page after 1 hour (ISR)
    // notFound: true  — renders 404 instead
    // redirect: { destination: '/other', permanent: false }
  };
};
```

**The serialization constraint:** `props` must be JSON-serializable. `Date` objects become strings,
class instances lose their methods, and `undefined` values are stripped. In the App Router, props
passed between server components don't serialize at all — they're just function calls. Only the
RSC boundary (server → client props) serializes via Flight (which handles more types than JSON but
still has limits). In the Pages Router, `getStaticProps` props get embedded as JSON in the HTML
output (`__NEXT_DATA__`), then read back on the client. You often need `JSON.parse(JSON.stringify(x))`
to strip non-serializable fields like Prisma metadata.

App Router equivalent: an async server component with no dynamic APIs and no `cache: 'no-store'`.
The static rendering happens automatically.

**See:** `src/pages/pages-router/ssg.tsx`

---

### `getServerSideProps` — request-time data

Runs on every request. Returns props to the page component. Nothing is cached — the page is
rendered fresh on every request.

```ts
// pages/pages-router/ssr.tsx
import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req, res, params, query, resolvedUrl, locale } = context;

  // req is Node.js IncomingMessage (not Web Request)
  const token = req.cookies['auth-token'];  // cookies via req.cookies
  const ua = req.headers['user-agent'];     // headers via req.headers

  if (!token) {
    return {
      redirect: { destination: '/login', permanent: false },
    };
  }

  const user = await verifyToken(token);
  const data = await db.getUserData(user.id);

  // Can set response headers
  res.setHeader('Cache-Control', 'private, max-age=0');

  return {
    props: {
      user: JSON.parse(JSON.stringify(user)),
      data: JSON.parse(JSON.stringify(data)),
      currentTime: new Date().toISOString(), // Date must be string
    },
  };
};
```

Key difference from App Router: `req` and `res` are raw Node.js `IncomingMessage` and
`ServerResponse` objects — not the Web standard `Request`/`Response` that App Router uses. You
read cookies from `req.cookies`, headers from `req.headers`, body from `req.body` (auto-parsed
for JSON), and query params from `context.query`.

App Router equivalent: an async server component that calls `cookies()` or `headers()` from
`next/headers`, which makes the route dynamic.

**See:** `src/pages/pages-router/ssr.tsx`

---

### `getStaticPaths` — declare which dynamic paths to pre-render

Required when a page has dynamic segments (`[slug]`) AND uses `getStaticProps`. It tells Next.js
which paths to pre-render at build time, and what to do with paths not in that list.

```ts
// pages/pages-router/posts/[slug].tsx
import type { GetStaticPaths, GetStaticProps } from 'next';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await db.posts.findMany({ select: { slug: true } });

  return {
    paths: posts.map((p) => ({ params: { slug: p.slug } })),
    fallback: 'blocking', // or false, or true
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const post = await db.posts.findBySlug(params.slug as string);

  if (!post) return { notFound: true };

  return {
    props: { post: JSON.parse(JSON.stringify(post)) },
    revalidate: 3600,
  };
};
```

The `fallback` option is the key decision, and it maps directly to App Router concepts:

| `fallback` value  | Behavior                                               | App Router equivalent       |
| ----------------- | ------------------------------------------------------ | --------------------------- |
| `false`           | Unlisted paths → 404. No on-demand generation.         | `dynamicParams = false`     |
| `'blocking'`      | Unlisted paths → SSR-like wait, then cache statically. | Default (`dynamicParams = true`) |
| `true`            | Unlisted paths → render immediately with `isFallback`, generate in background. | No direct equivalent |

`fallback: true` is a unique Pages Router concept. The component renders immediately on the client
with empty props (`post` will be `undefined`). Meanwhile, the server generates the static page.
When the generation finishes, the client receives fresh props and re-renders with real data.

```tsx
export default function PostPage({ post }) {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Loading...</div>; // shown while page is being generated
  }

  return <h1>{post.title}</h1>;
}
```

This is superficially similar to `loading.tsx` in App Router, but fundamentally different: it's
entirely client-side. The server doesn't stream anything — the client renders with no data, then
re-fetches once the static file is ready.

**See:** `src/pages/pages-router/posts/[slug].tsx`

---

## 4. Layouts: `_app.tsx` and the manual pattern

### `_app.tsx` — the global wrapper

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app';
import '../styles/globals.css'; // global CSS imports go here

export default function App({ Component, pageProps }: AppProps) {
  // Component = the current page component being rendered
  // pageProps  = what getServerSideProps/getStaticProps returned as props

  return (
    <GlobalProviders>
      <GlobalHeader />
      <Component {...pageProps} />
      <GlobalFooter />
    </GlobalProviders>
  );
}
```

`_app.tsx` wraps every page. It runs on both server (SSR) and client (hydration), which means:
- You can import global CSS here (only place allowed for global, non-module CSS)
- You can mount providers (theme, auth, query clients)
- You **cannot** use Node.js APIs — this code runs in the browser too

Compare to App Router's root `layout.tsx`: that's a server component by default, can be async,
can call the DB directly. `_app.tsx` is always a client component equivalent.

**Per-page layout pattern:**

`_app.tsx` receives the page component as a prop. The framework has no built-in nested layout
support, but there's a widely used convention: attach a `.layout` property to the page component.

```tsx
// pages/_app.tsx
export default function App({ Component, pageProps }: AppProps) {
  const Layout = (Component as any).layout ?? Fragment;

  return (
    <GlobalProviders>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </GlobalProviders>
  );
}

// pages/pages-router/ssg.tsx
function SsgDemoPage({ product }) { ... }

SsgDemoPage.layout = SectionLayout; // ← a plain function property, not a framework feature

export default SsgDemoPage;
```

This is manual wiring. The framework knows nothing about it. A few consequences:

1. **One layout level.** The pattern gives you one layout wrapper per page. For deeper nesting
   (layout inside layout inside layout), you either chain component wrappers or compose layout
   components inside each other explicitly.

2. **Remounting.** App Router's `layout.tsx` is a framework primitive — React's tree diffing
   preserves the layout across page navigations because it stays at the same position in the
   virtual tree. With the `Component.layout` pattern, whether the layout remounts depends on
   whether `Component.layout` is the same function reference across pages. If two pages use the
   same imported layout component, React won't remount it. If they use different layout functions,
   it will.

3. **No `loading.tsx`, no `error.tsx` per segment.** Those don't exist in the Pages Router.
   Error boundaries and loading states are managed manually.

**See:** `src/pages/_app.tsx`, `src/pages/pages-router/_components/section-layout.tsx`

---

### `_document.tsx` — HTML shell

```tsx
// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Global, static meta — font preconnects, global meta tags */}
        {/* NOT for page-specific title/description — use next/head for that */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </Head>
      <body>
        <Main />       {/* page content renders here */}
        <NextScript /> {/* Next.js scripts: RSC payload, hydration scripts, etc. */}
      </body>
    </Html>
  );
}
```

Key rules:
- Runs on server only. Never hydrated. **Cannot use hooks.**
- `<Html>`, `<Head>`, `<Main>`, `<NextScript>` are Next.js components — they must appear exactly
  as shown. Do not nest `<Main />` inside extra wrappers.
- The `<Head>` here is for truly global/static stuff. For page-specific `<title>` and `<meta>`,
  use `next/head` (see section 6).

Compare to App Router: the `<html lang="en">` and `<body>` tags live in root `layout.tsx`. Metadata
goes in `export const metadata` or `generateMetadata()`.

**See:** `src/pages/_document.tsx`

---

## 5. API Routes

```ts
// pages/api/pages-router/products.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type Product = { id: number; name: string; price: number };
type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Product[] | Product | ErrorResponse>,
) {
  if (req.method === 'GET') {
    const products = await db.products.findMany();
    return res.status(200).json(products);
  }

  if (req.method === 'POST') {
    const { name, price } = req.body; // body auto-parsed for JSON (Content-Type: application/json)
    if (!name || price == null) {
      return res.status(400).json({ error: 'name and price are required' });
    }
    const product = await db.products.create({ data: { name, price } });
    return res.status(201).json(product);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
```

Compare to App Router Route Handlers:

| Aspect                  | Pages Router API Route                       | App Router Route Handler                    |
| ----------------------- | -------------------------------------------- | ------------------------------------------- |
| File location           | `pages/api/products.ts`                      | `app/api/products/route.ts`                 |
| Export                  | `export default handler(req, res)`           | `export async function GET(req)`, `POST`, … |
| Request type            | `NextApiRequest` (Node.js IncomingMessage)   | `Request` (Web Fetch API)                   |
| Response                | `res.status(200).json(data)`                 | `return Response.json(data)`                |
| Body parsing            | `req.body` (auto-parsed)                     | `await req.json()`, `await req.text()`      |
| Query params            | `req.query`                                  | `new URL(req.url).searchParams`             |
| Cookies                 | `req.cookies`                                | `cookies()` from `next/headers`             |
| Static caching          | `export const config = { api: { ... } }`     | `export const dynamic = 'force-static'`     |

One default export, switch on `req.method` — that's the Pages Router way. You cannot call a Pages
Router API route from a Server Component (same reason as App Router Route Handlers: it's an
unnecessary HTTP round-trip through your own server).

**See:** `src/pages/api/pages-router/products.ts`

---

## 6. Head management: `next/head`

In the App Router, metadata is a data contract — you export `metadata` or `generateMetadata`, and
Next.js places those values in the HTML `<head>`. In the Pages Router, `<Head>` is a component:

```tsx
// pages/pages-router/head-demo.tsx
import Head from 'next/head';

export default function HeadDemoPage({ product }) {
  return (
    <>
      <Head>
        <title>{product.name} — My Store</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={product.name} />
        <meta property="og:image" content={product.imageUrl} />
        <link rel="canonical" href={`https://mystore.com/products/${product.slug}`} />
      </Head>
      <main>
        <h1>{product.name}</h1>
      </main>
    </>
  );
}
```

`<Head>` is a portal — whatever you put inside it gets hoisted to the document `<head>` regardless
of where in the component tree it's rendered. If multiple `<Head>` components exist (from nested
layout components, from the page itself), they get merged. Later-rendered `<title>` tags win over
earlier ones (inner wins over outer).

The split between `_document.tsx` `<Head>` and `next/head`:
- `_document.tsx` `<Head>`: global, static stuff — font preconnects, viewport meta
- `next/head` inside page components: page-specific stuff — title, description, OG tags, canonical

**See:** `src/pages/pages-router/head-demo.tsx`

---

## 7. Client-side navigation: `next/router` vs `next/navigation`

In the App Router, navigation concerns are split into separate hooks (`useRouter`, `useParams`,
`useSearchParams`, `usePathname`). In the Pages Router, `useRouter()` does everything:

```tsx
import { useRouter } from 'next/router'; // NOT 'next/navigation' — different package

export default function Page() {
  const router = useRouter();

  // router.pathname — the file path pattern: '/pages-router/posts/[slug]'
  // router.asPath   — the actual URL with query: '/pages-router/posts/hello?tab=2'
  // router.query    — { slug: 'hello', tab: '2' } ← params AND query mixed in one object
  // router.isReady  — false on first render when router.query isn't populated yet

  // Programmatic navigation
  router.push('/about');
  router.push({ pathname: '/pages-router/posts/[slug]', query: { slug: 'hello' } });
  router.replace('/new-url');
  router.back();

  // Shallow routing — update URL without triggering data refetch
  router.push('/page?tab=2', undefined, { shallow: true });
}
```

**`router.query` mixing params and query strings** is a Pages Router quirk. If your route file
is `pages/posts/[slug].tsx` and the URL is `/posts/hello?tab=comments`, then:
```
router.query = { slug: 'hello', tab: 'comments' }
```
Both dynamic segment params and query string params live in the same object. App Router keeps them
completely separate (`params` via `useParams()` vs `searchParams` via `useSearchParams()`).

**`router.isReady`:** On the first render of a statically generated page, `router.query` might not
be populated yet — the router hasn't hydrated and parsed the URL. This creates a race condition:

```tsx
// Wrong — router.query might be empty on first render
const { slug } = router.query; // undefined on first SSG render

// Correct
useEffect(() => {
  if (!router.isReady) return;
  const { slug } = router.query; // safe here
}, [router.isReady, router.query]);
```

This doesn't exist in App Router because `params` and `searchParams` are passed as props to page
components directly by the framework — they're always available from the first render.

**Shallow routing:** `{ shallow: true }` in `router.push` updates the URL and `router.query`
without re-running `getServerSideProps`/`getStaticProps`. Useful for URL state (filters, tabs)
where you want the URL to be bookmarkable but don't need a server round-trip.

```tsx
// User selects a tab — update URL but don't re-run server data fetching
router.push('/products?tab=reviews', undefined, { shallow: true });
```

App Router equivalent: `window.history.pushState(null, '', '/products?tab=reviews')`, which Next.js
integrates with `useSearchParams`/`usePathname`.

---

## 8. ISR in the Pages Router

ISR in the Pages Router is time-based only — no tags, no `revalidateTag`, no `updateTag`. Just a
`revalidate` number in `getStaticProps`:

```ts
export const getStaticProps: GetStaticProps = async () => {
  const posts = await db.posts.findMany();

  return {
    props: { posts: JSON.parse(JSON.stringify(posts)) },
    revalidate: 60, // seconds: SWR — regenerate after 60s
  };
};
```

The stale-while-revalidate mechanics are identical to App Router:

```
build time:           page pre-rendered, HTML stored
60 seconds pass:
  next request:       served stale HTML, background regeneration kicks off
  request after that: served freshly generated HTML
```

**On-demand ISR** — you can trigger regeneration from an API route:

```ts
// pages/api/revalidate.ts
export default async function handler(req, res) {
  if (req.query.secret !== process.env.REVALIDATION_SECRET) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    await res.revalidate('/pages-router/isr'); // path to invalidate
    return res.json({ revalidated: true });
  } catch (err) {
    return res.status(500).json({ error: 'Revalidation failed' });
  }
}
```

This is path-based only — no tag system. Compare to App Router's `revalidateTag('posts')` which
invalidates all pages that depended on data tagged `'posts'`, regardless of their URL.

**See:** `src/pages/pages-router/isr.tsx`

---

## 9. Dynamic imports: `next/dynamic`

In the App Router, `'use client'` / `'use server'` handles the server/client split. In the Pages
Router, since every component is a "client component," `next/dynamic` serves two purposes:

**1. Code splitting (lazy loading):**

```tsx
import dynamic from 'next/dynamic';

// Only loads the bundle for HeavyChart when it's actually rendered
const HeavyChart = dynamic(() => import('../components/HeavyChart'));
```

This is equivalent to `React.lazy` with `<Suspense>`. The component's JavaScript isn't in the
initial page bundle.

**2. Disabling SSR for browser-only components:**

```tsx
// Map component uses window.navigator — crashes if SSR'd
const MapComponent = dynamic(() => import('../components/Map'), { ssr: false });
```

With `ssr: false`, Next.js renders nothing for this component on the server (outputs nothing in
the SSR HTML), then mounts it client-side. This is the Pages Router escape hatch for
`window`, `document`, `localStorage`, WebGL — anything that doesn't exist in Node.js.

In the App Router, you don't need this escape hatch for browser APIs: client components always
have access to browser APIs during hydration because they run in the browser. But `next/dynamic`
with `{ ssr: false }` still works in App Router for the same purpose if needed.

**With a loading state:**

```tsx
const HeavyEditor = dynamic(() => import('../components/Editor'), {
  loading: () => <p>Loading editor...</p>,
  ssr: false,
});
```

The `loading` option is like a Suspense fallback but for the code bundle loading, not for data
fetching.

---

## 10. Error handling

**`pages/404.tsx`** — custom 404, must be static (no `getServerSideProps`):

```tsx
export default function Custom404() {
  return (
    <div>
      <h1>404 — Page Not Found</h1>
      <Link href="/">Go home</Link>
    </div>
  );
}
```

**`pages/500.tsx`** — custom 500, also must be static:

```tsx
export default function Custom500() {
  return <h1>500 — Server Error</h1>;
}
```

**`pages/_error.tsx`** — catches errors that don't have a specific page, AND catches unexpected
runtime errors not caught by React error boundaries. Uses `getInitialProps` (the legacy data
fetching API):

```tsx
import { NextPageContext } from 'next';

function ErrorPage({ statusCode }: { statusCode: number }) {
  return (
    <p>
      {statusCode
        ? `An error ${statusCode} occurred on the server`
        : 'An error occurred on the client'}
    </p>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? (err as any).statusCode : 404;
  return { statusCode };
};

export default ErrorPage;
```

Compare to App Router:
- App Router's `not-found.tsx` is for "route matched, resource missing" — per-segment, not global
- App Router's `error.tsx` catches render errors per-segment, has `reset()` for retry
- Pages Router `_error.tsx` is global — one catch-all for the entire app

---

## 11. What doesn't exist: streaming, Server Actions, and the DX gap

### No streaming

In the App Router, you wrap slow components in Suspense. Fast parts stream first:

```
App Router:
  t=0ms:   Shell + loading fallback → streamed immediately
  t=800ms: Slow DB query resolves → chunk streamed, fallback swapped
  User sees something at t=0ms
```

In the Pages Router, `getServerSideProps` is a single async function. Either everything resolves,
or nothing is sent:

```
Pages Router:
  t=0ms:   getServerSideProps starts
  t=800ms: getServerSideProps fully resolves
  t=800ms: Entire HTML is built and starts streaming
  User sees nothing until t=800ms
```

There is no partial rendering. There is no Suspense-based streaming. This is why Pages Router
applications heavily favor `getStaticProps` + ISR over `getServerSideProps` where possible —
static responses are sent instantly from cache.

### No Server Actions

`'use server'` doesn't exist. Mutations go through explicit API route calls:

```tsx
// What you write in Pages Router (vs server action in App Router)
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState<string | null>(null);

async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setIsPending(true);

  try {
    const formData = new FormData(e.currentTarget);
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData)),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    router.push('/posts');
  } catch (err) {
    setError('Something went wrong');
  } finally {
    setIsPending(false);
  }
}
```

No `useActionState`, no `useFormStatus`, no automatic `startTransition`, no `revalidatePath` in
the response. You manage pending state, error state, optimistic updates, and cache invalidation
entirely manually.

---

## 12. The hydration model: `__NEXT_DATA__` vs RSC payload

This is where the two routers differ most mechanistically.

### App Router hydration (recap)

The server runs two passes: RSC pass (produces RSC payload) then SSR pass (produces HTML). The
RSC payload tells React exactly what the tree looks like, with server component output already
resolved and client components appearing as references. React hydrates by walking the DOM and the
RSC payload side-by-side, adopting existing DOM nodes and wiring up event handlers for client
components only. Server component code never ships to the browser.

### Pages Router hydration

The server runs one pass: SSR pass. React renders the full component tree using the props from
`getServerSideProps`/`getStaticProps`, produces HTML. The initial props are embedded in the HTML
as a JSON block:

```html
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "product": { "id": 1, "name": "Keyboard", "price": 149 }
    }
  },
  "page": "/pages-router/ssg",
  "query": {},
  "buildId": "abc123"
}
</script>
```

This is the Pages Router equivalent of `self.__next_f.push(...)`. When React loads in the browser,
it reads `__NEXT_DATA__`, reconstructs `pageProps`, and calls the page component function with
those props to produce a virtual tree. It then walks the existing DOM (already painted from SSR
HTML) and the virtual tree side-by-side, adopts the DOM nodes, and attaches event handlers.

**The key difference:** In the Pages Router, every component function in the tree runs during
hydration. The keyboard event handler in a deeply nested component — its surrounding component
function executes. The entire JavaScript bundle for the page is sent to the browser. There is
no server-only optimization. App Router's server components solve this: their code runs only on
the server, their output (HTML nodes) is what reaches the browser, not the function that produced
it.

---

## 13. `getInitialProps` — the legacy API

You'll see this in older codebases. It's the original data-fetching API, predating both
`getServerSideProps` and `getStaticProps`. Understand it to read legacy code.

The critical property: it runs on the server for the first load, but **on the client for
subsequent navigations** (soft nav). This is unlike `getServerSideProps` which always runs on
the server.

```tsx
function MyPage({ data }) {
  return <div>{data.title}</div>;
}

MyPage.getInitialProps = async (ctx) => {
  const { req, res, pathname, query, asPath } = ctx;
  // On server:  req and res are available, Node.js APIs work
  // On client:  req and res are UNDEFINED — browser is calling this

  // Must use fetch instead of db.query, because it also runs on client
  const res = await fetch(`/api/data?id=${query.id}`);
  return { data: await res.json() };
};
```

This dual execution context is why `getInitialProps` is confusing and was superseded:
- `getServerSideProps` = always server only → safe to use Node.js APIs, DB calls
- `getStaticProps` = always build time on server → same safety

`getInitialProps` still appears in `_app.tsx` and `_error.tsx` in some codebases because those
special files need data both during SSR and during client-side error recovery. Avoid it in new code.

---

## 14. Quick reference: App Router → Pages Router mapping

| App Router                               | Pages Router equivalent                            |
| ---------------------------------------- | -------------------------------------------------- |
| `app/page.tsx`                           | `pages/index.tsx` (etc.)                           |
| `app/layout.tsx`                         | `pages/_app.tsx` + `.layout` convention            |
| `app/[slug]/page.tsx`                    | `pages/[slug].tsx`                                 |
| `export const metadata`                  | `<Head>` from `next/head`                          |
| `generateMetadata()`                     | `<Head>` with dynamic values from props            |
| `generateStaticParams()`                 | `getStaticPaths()`                                 |
| `dynamicParams = false`                  | `fallback: false` in `getStaticPaths`              |
| async server component (static)          | `getStaticProps`                                   |
| async server component (dynamic)         | `getServerSideProps`                               |
| `notFound()` from `next/navigation`      | `return { notFound: true }` from data fetch fn     |
| `redirect()` from `next/navigation`      | `return { redirect: {...} }` from data fetch fn    |
| `app/api/route.ts` (Route Handler)       | `pages/api/handler.ts` (API Route)                 |
| `'use server'` / Server Actions          | Manual `fetch('/api/...')` + useState              |
| `useRouter` from `next/navigation`       | `useRouter` from `next/router`                     |
| `useParams()`                            | `router.query` (mixed with search params)          |
| `useSearchParams()`                      | `router.query` (mixed with route params)           |
| `cookies()` / `headers()`               | `req.cookies` / `req.headers` in getServerSideProps|
| `error.tsx`                              | Manual React error boundary OR `pages/_error.tsx`  |
| `not-found.tsx`                          | `pages/404.tsx` + `return { notFound: true }`      |
| `loading.tsx`                            | `next/dynamic` loading or manual `useState`        |
| Streaming / Suspense                     | **Does not exist**                                 |
| Server Actions / `'use server'`          | **Does not exist**                                 |
| `use cache` / Data Cache tags            | **Does not exist** — `revalidate: N` only          |
| PPR / Partial Prerendering               | **Does not exist**                                 |
| Parallel routes / Intercepting routes    | **Does not exist**                                 |

---

## 15. Examples in this project

All Pages Router examples live under `src/pages/pages-router/`. Navigate to:

- `/pages-router` — hub page
- `/pages-router/ssg` — `getStaticProps` (SSG)
- `/pages-router/ssr` — `getServerSideProps` with cookie/header reading
- `/pages-router/isr` — `getStaticProps` with `revalidate`
- `/pages-router/posts` — post list (SSG)
- `/pages-router/posts/[slug]` — dynamic post page with `getStaticPaths`
- `/pages-router/head-demo` — `next/head` usage
- `/api/pages-router/products` — API route demo

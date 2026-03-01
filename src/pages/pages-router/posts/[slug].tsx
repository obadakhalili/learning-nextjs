/**
 * Dynamic post page — getStaticPaths + getStaticProps.
 *
 * getStaticPaths declares which [slug] values to pre-render at build time.
 * getStaticProps runs for each of those paths at build time.
 *
 * The `fallback` option in getStaticPaths controls what happens for paths
 * NOT in the paths array:
 *
 *   fallback: false       → 404 immediately
 *   fallback: 'blocking'  → SSR-like: wait on server, cache result, serve cached next time
 *   fallback: true        → render immediately with isFallback=true, fetch in background
 *
 * App Router equivalent:
 *   generateStaticParams() + dynamicParams = true/false
 */
import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { POSTS } from "./index";
import SectionLayout from "../_components/section-layout";

type Post = (typeof POSTS)[number];
type Props = { post: Post; generatedAt: string };

export const getStaticPaths: GetStaticPaths = async () => {
  // In a real app: const posts = await db.posts.findMany({ select: { slug: true } })
  const posts = POSTS;

  return {
    paths: posts.map((p) => ({ params: { slug: p.slug } })),

    // 'blocking': unlisted paths are generated on first request (SSR-like wait),
    // then cached as static files for all future requests.
    // Compare to App Router default: dynamicParams = true
    fallback: "blocking",

    // fallback: false would 404 for /pages-router/posts/nonexistent
    // Compare to App Router: export const dynamicParams = false
  };
};

export const getStaticProps: GetStaticProps<Props> = async (context) => {
  const slug = context.params?.slug as string;

  // Find post — in a real app: const post = await db.posts.findBySlug(slug)
  const post = POSTS.find((p) => p.slug === slug);

  if (!post) {
    // Returning { notFound: true } renders the 404 page.
    // App Router equivalent: calling notFound() from 'next/navigation'
    return { notFound: true };
  }

  return {
    props: {
      post,
      generatedAt: new Date().toISOString(),
    },
    revalidate: 3600, // ISR: regenerate after 1 hour
  };
};

export default function PostPage({ post, generatedAt }: Props) {
  const router = useRouter();

  // When fallback: true (not 'blocking'), router.isFallback is true while
  // the static page is being generated. Show a loading state here.
  // With fallback: 'blocking', this never happens — the request waits on server.
  if (router.isFallback) {
    return (
      <div>
        <p>Generating page...</p>
        <p style={{ fontSize: "0.8rem", color: "#888" }}>
          (This loading state only appears with <code>fallback: true</code>. With{" "}
          <code>fallback: &apos;blocking&apos;</code>, the server waits before responding.)
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link href="/pages-router/posts">← Back to posts</Link>

      <h1 style={{ marginTop: "1rem" }}>{post.title}</h1>
      <p style={{ color: "#888", fontSize: "0.85rem" }}>Published: {post.date}</p>
      <p>{post.summary}</p>

      <hr />

      <div style={{ background: "#f5f5f5", padding: "0.75rem", fontSize: "0.8rem" }}>
        <strong>getStaticPaths internals</strong>
        <p style={{ margin: "0.25rem 0 0" }}>
          This page was statically generated for slug: <code>{router.query.slug}</code>
          <br />
          Generated at: <code>{generatedAt}</code>
          <br />
          Revalidates every: <code>3600s</code>
        </p>
        <p style={{ marginTop: "0.5rem" }}>
          The three slugs returned by <code>getStaticPaths</code> (
          <code>understanding-rsc</code>, <code>pages-vs-app</code>, <code>isr-deep-dive</code>)
          were pre-rendered at build time. Any other slug (e.g.{" "}
          <code>/pages-router/posts/nonexistent</code>) hits <code>fallback: &apos;blocking&apos;</code>
          — the server tries to generate it, <code>getStaticProps</code> returns{" "}
          <code>notFound: true</code>, and the 404 page is shown.
        </p>
      </div>

      <hr />

      <div style={{ fontSize: "0.8rem", color: "#666" }}>
        <strong>App Router equivalent:</strong>
        <pre
          style={{
            background: "#f0f0f0",
            padding: "0.5rem",
            marginTop: "0.25rem",
            overflow: "auto",
          }}
        >
          {`// app/pages-router/posts/[slug]/page.tsx
export async function generateStaticParams() {
  return POSTS.map(p => ({ slug: p.slug }))
}
// dynamicParams = true is the default (= fallback: 'blocking')
// export const dynamicParams = false  (= fallback: false)

export default async function PostPage({ params }) {
  const { slug } = await params
  const post = POSTS.find(p => p.slug === slug)
  if (!post) notFound()
  return <h1>{post.title}</h1>
}`}
        </pre>
      </div>
    </div>
  );
}

PostPage.layout = SectionLayout;

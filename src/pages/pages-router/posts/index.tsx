/**
 * Post list page — getStaticProps.
 *
 * Renders the list of posts at build time. Links to individual post pages
 * that use getStaticPaths + getStaticProps.
 */
import type { GetStaticProps } from "next";
import Link from "next/link";
import SectionLayout from "../_components/section-layout";

// Shared mock data — referenced here and in [slug].tsx
export const POSTS = [
  {
    slug: "understanding-rsc",
    title: "Understanding React Server Components",
    summary: "How the two-pass rendering model works and why it exists.",
    date: "2024-01-15",
  },
  {
    slug: "pages-vs-app",
    title: "Pages Router vs App Router",
    summary: "A deep comparison of both routing systems.",
    date: "2024-02-20",
  },
  {
    slug: "isr-deep-dive",
    title: "ISR Deep Dive",
    summary:
      "Stale-while-revalidate mechanics, tags, and on-demand invalidation.",
    date: "2024-03-10",
  },
];

type Post = (typeof POSTS)[number];
type Props = { posts: Post[] };

export const getStaticProps: GetStaticProps<Props> = async () => {
  return {
    props: { posts: POSTS },
  };
};

export default function PostsIndex({ posts }: Props) {
  return (
    <div>
      <h1>Posts — getStaticPaths demo</h1>
      <p style={{ fontSize: "0.85rem", color: "#555" }}>
        Each post below is a dynamic route (
        <code>pages/pages-router/posts/[slug].tsx</code>). Click through to see
        how <code>getStaticPaths</code> pre-renders dynamic paths.
      </p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {posts.map((post) => (
          <li
            key={post.slug}
            style={{
              marginBottom: "1rem",
              borderBottom: "1px solid #eee",
              paddingBottom: "1rem",
            }}
          >
            <Link
              href={`/pages-router/posts/${post.slug}`}
              style={{ fontWeight: "bold" }}
            >
              {post.title}
            </Link>
            <p
              style={{
                margin: "0.25rem 0",
                fontSize: "0.85rem",
                color: "#555",
              }}
            >
              {post.summary}
            </p>
            <small style={{ color: "#888" }}>{post.date}</small>
          </li>
        ))}
      </ul>
      <hr />
      <p style={{ fontSize: "0.85rem", color: "#555" }}>
        Try navigating to{" "}
        <Link href="/pages-router/posts/nonexistent">
          /pages-router/posts/nonexistent
        </Link>{" "}
        — this path was not returned by <code>getStaticPaths</code>, so with{" "}
        <code>fallback: &apos;blocking&apos;</code> it will generate on-demand
        and cache the 404.
      </p>
    </div>
  );
}

PostsIndex.layout = SectionLayout;

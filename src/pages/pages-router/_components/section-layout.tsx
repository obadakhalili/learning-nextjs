/**
 * A shared layout component for all /pages-router/* demo pages.
 * Pages attach this as their .layout property — see _app.tsx.
 *
 * In App Router this would be pages-router/layout.tsx (a framework primitive).
 * Here it's just a React component that _app.tsx wires up manually.
 */
import Link from "next/link";
import type { ReactNode } from "react";

const pages = [
  { href: "/pages-router/ssg", label: "SSG (getStaticProps)" },
  { href: "/pages-router/ssr", label: "SSR (getServerSideProps)" },
  { href: "/pages-router/isr", label: "ISR (revalidate)" },
  { href: "/pages-router/posts", label: "Dynamic paths (getStaticPaths)" },
  { href: "/pages-router/head-demo", label: "next/head" },
];

export default function SectionLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: "monospace", display: "flex", gap: "2rem", padding: "1rem" }}>
      <nav style={{ minWidth: 220, borderRight: "1px solid #ccc", paddingRight: "1rem" }}>
        <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Pages Router demos</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {pages.map((p) => (
            <li key={p.href} style={{ marginBottom: "0.25rem" }}>
              <Link href={p.href} style={{ color: "inherit" }}>
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
        <hr />
        <Link href="/" style={{ color: "inherit", fontSize: "0.85rem" }}>
          ← App Router home
        </Link>
      </nav>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}

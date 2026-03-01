/**
 * pages/404.tsx — Custom 404 page.
 *
 * Must be static — no getServerSideProps allowed.
 * Can have getStaticProps if you need build-time data.
 *
 * Compare to App Router: not-found.tsx per segment (for resource 404s
 * inside matched routes). This covers URL 404s globally.
 */
import Link from "next/link";

export default function Custom404() {
  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>404 — Page Not Found</h1>
      <p>This page does not exist in the Pages Router demos.</p>
      <Link href="/pages-router">← Back to Pages Router hub</Link>
    </div>
  );
}

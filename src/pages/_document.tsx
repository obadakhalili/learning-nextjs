/**
 * pages/_document.tsx — Customizes the HTML shell.
 *
 * Runs on server only. Never hydrated. Cannot use hooks.
 * Equivalent to the <html> and <body> tags in App Router's root layout.tsx.
 *
 * Use <Head> here for truly global, static meta (font preconnects, viewport).
 * For page-specific title/description, use next/head inside page components.
 */
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Global meta — applies to every page, never changes per-page */}
        <meta charSet="utf-8" />
        {/*
          Font preconnects, icon links, etc. go here.
          DO NOT put <title> or page-specific <meta name="description"> here.
          Those go in next/head inside individual page components.
        */}
      </Head>
      <body>
        {/*
          <Main /> = where the page content renders (output of _app.tsx → page)
          <NextScript /> = Next.js scripts: the __NEXT_DATA__ JSON block,
                           hydration scripts, dynamically imported chunk scripts, etc.

          Both are required. Do not nest <Main /> inside extra wrappers.
        */}
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

/**
 * pages/_app.tsx — The global wrapper for all Pages Router pages.
 *
 * Runs on both server (SSR) and client (hydration).
 * This is the closest equivalent to App Router's root layout.tsx, but:
 *  - It's always a client component (no async, no Node.js APIs)
 *  - It doesn't support nested layouts natively
 *
 * The `Component.layout` pattern demonstrated here is a manual convention
 * (not a framework feature) for per-page layout support.
 */
import type { AppProps } from "next/app";
import type { ComponentType, ReactNode } from "react";
import React from "react";

// A page component can declare its layout by setting this property.
// _app.tsx reads it and wraps the page accordingly.
type PageWithLayout = ComponentType & {
  layout?: ComponentType<{ children: ReactNode }>;
};

export default function App({ Component, pageProps }: AppProps) {
  const PageComponent = Component as PageWithLayout;

  // If the page defines a layout, use it. Otherwise render the page directly.
  const Layout = PageComponent.layout ?? React.Fragment;

  return (
    <Layout>
      <PageComponent {...pageProps} />
    </Layout>
  );
}

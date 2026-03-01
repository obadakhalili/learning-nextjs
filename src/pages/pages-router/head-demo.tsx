/**
 * next/head demo — page-specific meta tags.
 *
 * In App Router, metadata is a data contract: you export `metadata` or
 * `generateMetadata`, and Next.js handles the HTML placement.
 *
 * In Pages Router, <Head> is a component you render anywhere in your JSX.
 * It portals its children into the document <head>, regardless of where
 * in the component tree it's placed.
 *
 * Multiple <Head> components from nested components are merged.
 * Later <title> tags win over earlier ones (inner component's title
 * overrides the layout's title).
 */
import type { GetStaticProps } from "next";
import Head from "next/head";
import SectionLayout from "./_components/section-layout";

type Props = {
  product: {
    name: string;
    description: string;
    price: number;
    slug: string;
  };
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  return {
    props: {
      product: {
        name: "Mechanical Keyboard",
        description: "Clicky switches, TKL layout, PBT keycaps",
        price: 149,
        slug: "mechanical-keyboard",
      },
    },
  };
};

export default function HeadDemoPage({ product }: Props) {
  const canonicalUrl = `https://mystore.com/products/${product.slug}`;

  return (
    <>
      {/*
        <Head> portals everything inside it to the document <head>.
        React's Portal mechanism — the actual DOM insertion happens at <head>,
        not at this position in the JSX tree.
      */}
      <Head>
        <title>{product.name} — My Store</title>
        <meta name="description" content={product.description} />

        {/* Open Graph — for social media previews */}
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.description} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={canonicalUrl} />

        {/* Canonical URL — tells search engines the authoritative URL */}
        <link rel="canonical" href={canonicalUrl} />
      </Head>

      <div>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <p>
          <strong>${product.price}</strong>
        </p>

        <hr />

        <div style={{ background: "#f5f5f5", padding: "0.75rem", fontSize: "0.8rem" }}>
          <strong>What next/head does under the hood:</strong>
          <p style={{ margin: "0.25rem 0 0" }}>
            During SSR, Next.js collects everything rendered inside any <code>&lt;Head&gt;</code>{" "}
            component in the tree, deduplicates them (later wins for same tag/name), and injects
            them into the HTML <code>&lt;head&gt;</code>. On the client, React re-runs this
            collection during hydration and uses a portal to keep the real DOM <code>&lt;head&gt;</code>{" "}
            in sync with the virtual tree.
          </p>
        </div>

        <hr />

        <div style={{ fontSize: "0.8rem" }}>
          <strong>App Router equivalent:</strong>
          <pre
            style={{
              background: "#f0f0f0",
              padding: "0.5rem",
              marginTop: "0.25rem",
              overflow: "auto",
            }}
          >
            {`// Static metadata — evaluated at build time
export const metadata: Metadata = {
  title: 'Mechanical Keyboard — My Store',
  description: 'Clicky switches, TKL layout',
  openGraph: {
    title: 'Mechanical Keyboard',
    type: 'website',
  },
  alternates: {
    canonical: 'https://mystore.com/products/mechanical-keyboard',
  },
}

// Dynamic metadata — evaluated per request (or per static path)
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await db.getProduct(params.slug)
  return {
    title: \`\${product.name} — My Store\`,
    description: product.description,
  }
}`}
          </pre>
          <p>
            App Router metadata is a data contract — you declare what the metadata is, Next.js
            handles rendering it. Pages Router <code>next/head</code> is imperative — you render
            the tags directly as JSX.
          </p>
        </div>
      </div>
    </>
  );
}

HeadDemoPage.layout = SectionLayout;

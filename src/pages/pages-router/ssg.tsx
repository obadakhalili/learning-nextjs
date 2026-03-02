/**
 * getStaticProps demo — SSG (Static Site Generation).
 *
 * getStaticProps runs ONLY at build time (never on the client, never at request time).
 * The page is pre-rendered to HTML during `next build`.
 * Every visitor gets the same pre-built HTML — no server computation on request.
 *
 * App Router equivalent:
 *   An async server component with no dynamic APIs and no { cache: 'no-store' }.
 *   Static rendering happens automatically without any special export.
 */
import type { GetStaticProps } from "next";
import SectionLayout from "./_components/section-layout";

// Mock data — in a real app, this would be a DB query or API call.
// Lives here so we can also use it in getStaticProps without a real DB.
const PRODUCTS = [
  {
    id: 1,
    name: "Mechanical Keyboard",
    price: 149,
    description: "Clicky switches, TKL layout",
  },
  {
    id: 2,
    name: "USB-C Hub",
    price: 49,
    description: "7 ports: USB-A x3, HDMI, SD, PD",
  },
  {
    id: 3,
    name: "Monitor Stand",
    price: 89,
    description: "Ergonomic height/tilt adjustment",
  },
];

type Product = (typeof PRODUCTS)[number];

type Props = {
  products: Product[];
  generatedAt: string;
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  // This function is surgically removed from the client bundle by Next.js.
  // You can safely call fs.readFile, db.query, process.env.SECRET here.
  // The result is serialized as JSON and embedded in __NEXT_DATA__ in the HTML.

  // Simulate a DB query — in real code: const products = await db.products.findMany()
  const products = PRODUCTS;

  return {
    props: {
      // MUST be JSON-serializable. No Date objects, class instances, or undefined values.
      // Use JSON.parse(JSON.stringify(x)) to sanitize Prisma/ORM objects if needed.
      products,
      generatedAt: new Date().toISOString(), // Date → string for serialization
    },
    // No revalidate: this page is built once and never regenerated.
    // Add revalidate: N for ISR behavior (see isr.tsx).
  };
};

export default function SsgPage({ products, generatedAt }: Props) {
  return (
    <div>
      <h1>SSG — getStaticProps</h1>

      <div
        style={{
          background: "#f0f8f0",
          border: "1px solid #90c090",
          padding: "0.75rem",
          marginBottom: "1.5rem",
          fontSize: "0.85rem",
        }}
      >
        <strong>How this works:</strong>
        <p style={{ margin: "0.25rem 0 0" }}>
          <code>getStaticProps</code> ran at <strong>build time</strong>. The
          HTML you see was pre-generated and is served as a static file. No
          server code runs on request. This <code>generatedAt</code> timestamp
          will be the same for every visitor until the next build:
        </p>
        <code style={{ display: "block", marginTop: "0.25rem" }}>
          {generatedAt}
        </code>
      </div>

      <h2>Products</h2>
      <ul>
        {products.map((p) => (
          <li key={p.id} style={{ marginBottom: "0.5rem" }}>
            <strong>{p.name}</strong> — ${p.price}
            <br />
            <small style={{ color: "#666" }}>{p.description}</small>
          </li>
        ))}
      </ul>

      <hr />
      <details>
        <summary style={{ cursor: "pointer", color: "#555" }}>
          What the server actually sends
        </summary>
        <pre
          style={{
            background: "#f5f5f5",
            padding: "0.75rem",
            fontSize: "0.75rem",
            overflow: "auto",
            marginTop: "0.5rem",
          }}
        >
          {`<!-- In the HTML response: -->
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "products": [ { "id": 1, "name": "Mechanical Keyboard", ... }, ... ],
      "generatedAt": "${generatedAt}"
    }
  },
  "page": "/pages-router/ssg",
  "query": {},
  "buildId": "..."
}
</script>

React reads this on the client, calls SsgPage({ products, generatedAt }),
produces virtual DOM, walks existing DOM, attaches event handlers. That's hydration.
Unlike App Router, ALL component code (not just client components) runs during hydration.`}
        </pre>
      </details>
    </div>
  );
}

SsgPage.layout = SectionLayout;

/**
 * Hub page for Pages Router demos.
 * Uses getStaticProps — renders at build time, no server round-trip on request.
 */
import type { GetStaticProps } from "next";
import Link from "next/link";
import SectionLayout from "./_components/section-layout";

type Props = {
  builtAt: string;
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  return {
    props: {
      // new Date() runs at BUILD TIME here, not at request time.
      // This value is baked into the HTML and served to every visitor.
      builtAt: new Date().toISOString(),
    },
  };
};

export default function PagesRouterIndex({ builtAt }: Props) {
  return (
    <div>
      <h1>Pages Router demos</h1>
      <p style={{ color: "#888", fontSize: "0.85rem" }}>
        This page was statically generated at: {builtAt}
      </p>
      <p>
        This is the Pages Router — the older Next.js routing system. All
        examples here live in <code>src/pages/pages-router/</code>. Explore each
        demo to understand how Pages Router handles rendering, data fetching,
        and routing differently from the App Router.
      </p>
      <ul>
        <li>
          <Link href="/pages-router/ssg">SSG — getStaticProps</Link>
        </li>
        <li>
          <Link href="/pages-router/ssr">SSR — getServerSideProps</Link>
        </li>
        <li>
          <Link href="/pages-router/isr">ISR — revalidate</Link>
        </li>
        <li>
          <Link href="/pages-router/posts">Dynamic paths — getStaticPaths</Link>
        </li>
        <li>
          <Link href="/pages-router/head-demo">next/head</Link>
        </li>
      </ul>
    </div>
  );
}

PagesRouterIndex.layout = SectionLayout;

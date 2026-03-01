/**
 * ISR demo — getStaticProps with revalidate.
 *
 * The page is pre-rendered at build time. After `revalidate` seconds,
 * the first request gets stale data AND triggers background regeneration.
 * The next request gets fresh data.
 *
 * App Router equivalent:
 *   fetch({ next: { revalidate: N } }) or `use cache` with cacheLife('seconds')
 *
 * Key difference from App Router ISR:
 *   Pages Router ISR is time-based only — no tags, no revalidateTag, no updateTag.
 *   On-demand ISR is path-based only (res.revalidate('/path') in an API route).
 */
import type { GetStaticProps } from "next";
import SectionLayout from "./_components/section-layout";

type Props = {
  generatedAt: string;
  revalidateSeconds: number;
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  // This runs at build time and at background regeneration time.
  // In a real app: fetch fresh data from DB or external API here.

  return {
    props: {
      generatedAt: new Date().toISOString(),
      revalidateSeconds: 10,
    },
    revalidate: 10, // seconds
    // After 10 seconds:
    //   1st request → stale page served, background regeneration fires
    //   2nd request → freshly generated page
  };
};

export default function IsrPage({ generatedAt, revalidateSeconds }: Props) {
  return (
    <div>
      <h1>ISR — getStaticProps with revalidate</h1>

      <div
        style={{
          background: "#f0f0ff",
          border: "1px solid #9090c0",
          padding: "0.75rem",
          marginBottom: "1.5rem",
          fontSize: "0.85rem",
        }}
      >
        <strong>How to observe ISR behavior:</strong>
        <ol style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem" }}>
          <li>Load this page — note the timestamp below.</li>
          <li>
            Wait {revalidateSeconds}+ seconds, then refresh. You still see the old timestamp
            (stale-while-revalidate: you get old data, server regenerates in background).
          </li>
          <li>Refresh again — now you see the new timestamp.</li>
        </ol>
        <p style={{ margin: "0.5rem 0 0" }}>
          The two-request sequence is the same as App Router time-based revalidation.
        </p>
      </div>

      <h2>Last generated at</h2>
      <p style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>{generatedAt}</p>
      <p style={{ color: "#666", fontSize: "0.85rem" }}>
        Revalidates every {revalidateSeconds} seconds (stale-while-revalidate).
      </p>

      <hr />

      <h2>On-demand ISR</h2>
      <p style={{ fontSize: "0.85rem" }}>
        You can also trigger regeneration from an API route with{" "}
        <code>res.revalidate(&apos;/pages-router/isr&apos;)</code>. See{" "}
        <code>src/pages/api/pages-router/products.ts</code> for the API route pattern.
        In App Router this would be <code>revalidatePath(&apos;/...&apos;)</code> or{" "}
        <code>revalidateTag(&apos;tag-name&apos;)</code> from a Server Action or Route Handler.
      </p>

      <hr />

      <h2>Pages Router ISR vs App Router ISR</h2>
      <table
        style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.8rem" }}
      >
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ padding: "0.4rem 0.5rem", textAlign: "left" }}>Aspect</th>
            <th style={{ padding: "0.4rem 0.5rem", textAlign: "left" }}>Pages Router</th>
            <th style={{ padding: "0.4rem 0.5rem", textAlign: "left" }}>App Router</th>
          </tr>
        </thead>
        <tbody>
          {[
            [
              "Time-based",
              "revalidate: N in getStaticProps",
              "fetch({ next: { revalidate: N } })",
            ],
            ["Tag-based invalidation", "Not available", "revalidateTag('tag')"],
            [
              "On-demand (path-based)",
              "res.revalidate('/path') in API route",
              "revalidatePath('/path') in Server Action",
            ],
            [
              "Immediate purge",
              "Not available",
              "updateTag('tag') in Server Action",
            ],
          ].map(([aspect, pages, app]) => (
            <tr key={aspect}>
              <td style={{ padding: "0.3rem 0.5rem", fontWeight: "bold" }}>{aspect}</td>
              <td style={{ padding: "0.3rem 0.5rem" }}>{pages}</td>
              <td style={{ padding: "0.3rem 0.5rem" }}>{app}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

IsrPage.layout = SectionLayout;

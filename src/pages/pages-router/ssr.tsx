/**
 * getServerSideProps demo — SSR (Server-Side Rendering).
 *
 * getServerSideProps runs on EVERY request. The page is rendered fresh
 * for each visitor. Nothing is cached at the page level.
 *
 * You have access to the raw Node.js req and res objects — not the Web
 * standard Request/Response that App Router uses.
 *
 * App Router equivalent:
 *   An async server component that reads cookies() or headers() from
 *   next/headers, which marks the route as dynamic.
 */
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import SectionLayout from "./_components/section-layout";

type Props = {
  requestTime: string;
  userAgent: string;
  acceptLanguage: string;
  cookieCount: number;
  query: Record<string, string | string[]>;
  // In a real app: user data from a verified session cookie
};

export const getServerSideProps: GetServerSideProps<Props> = async (
  context,
) => {
  const { req, res, query } = context;
  //       ^         ^
  //       |         res = Node.js ServerResponse
  //       req = Node.js IncomingMessage (NOT the Web Fetch API Request)

  // Read cookies from req.cookies (auto-parsed by Next.js)
  const cookies = req.cookies;
  // In a real app: const token = cookies['auth-token']
  // if (!token) return { redirect: { destination: '/login', permanent: false } };

  // Read headers from req.headers
  const userAgent = req.headers["user-agent"] ?? "unknown";
  const acceptLanguage = req.headers["accept-language"] ?? "unknown";

  // You can set response headers
  res.setHeader("Cache-Control", "no-store");

  // Return value is serialized as JSON → embedded in __NEXT_DATA__
  // Must be JSON-serializable (no Date objects, no class instances)
  return {
    props: {
      requestTime: new Date().toISOString(),
      userAgent,
      acceptLanguage,
      cookieCount: Object.keys(cookies).length,
      query: query as Record<string, string | string[]>,
    },
  };
};

export default function SsrPage({
  requestTime,
  userAgent,
  acceptLanguage,
  cookieCount,
  query,
}: Props) {
  const router = useRouter();

  return (
    <div>
      <h1>SSR — getServerSideProps</h1>

      <div
        style={{
          background: "#fff8f0",
          border: "1px solid #c09030",
          padding: "0.75rem",
          marginBottom: "1.5rem",
          fontSize: "0.85rem",
        }}
      >
        <strong>How this works:</strong>
        <p style={{ margin: "0.25rem 0 0" }}>
          <code>getServerSideProps</code> ran on the server for{" "}
          <strong>this specific request</strong>. Refresh the page —{" "}
          <code>requestTime</code> changes every time. Nothing is cached.
        </p>
      </div>

      <h2>Request-time data</h2>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontSize: "0.85rem",
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                padding: "0.25rem 0.5rem",
                fontWeight: "bold",
                whiteSpace: "nowrap",
              }}
            >
              Request time
            </td>
            <td style={{ padding: "0.25rem 0.5rem" }}>{requestTime}</td>
          </tr>
          <tr style={{ background: "#f9f9f9" }}>
            <td style={{ padding: "0.25rem 0.5rem", fontWeight: "bold" }}>
              User-Agent
            </td>
            <td style={{ padding: "0.25rem 0.5rem", wordBreak: "break-all" }}>
              {userAgent}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "0.25rem 0.5rem", fontWeight: "bold" }}>
              Accept-Language
            </td>
            <td style={{ padding: "0.25rem 0.5rem" }}>{acceptLanguage}</td>
          </tr>
          <tr style={{ background: "#f9f9f9" }}>
            <td style={{ padding: "0.25rem 0.5rem", fontWeight: "bold" }}>
              Cookies present
            </td>
            <td style={{ padding: "0.25rem 0.5rem" }}>{cookieCount}</td>
          </tr>
          <tr>
            <td style={{ padding: "0.25rem 0.5rem", fontWeight: "bold" }}>
              Query params
            </td>
            <td style={{ padding: "0.25rem 0.5rem" }}>
              {Object.keys(query).length > 0 ? (
                <pre style={{ margin: 0, fontSize: "0.75rem" }}>
                  {JSON.stringify(query, null, 2)}
                </pre>
              ) : (
                <span style={{ color: "#888" }}>
                  none — try adding ?foo=bar to the URL
                </span>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2>next/router in action</h2>
      <p style={{ fontSize: "0.85rem" }}>
        In Pages Router, <code>useRouter()</code> from <code>next/router</code>{" "}
        provides everything in one object. Compare to App Router where concerns
        are split into separate hooks.
      </p>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontSize: "0.8rem",
        }}
      >
        <tbody>
          <tr>
            <td style={{ padding: "0.25rem 0.5rem", fontWeight: "bold" }}>
              router.pathname
            </td>
            <td style={{ padding: "0.25rem 0.5rem" }}>
              <code>{router.pathname}</code>
              <br />
              <small style={{ color: "#888" }}>
                The file pattern, not the actual URL. Static in App Router
                equivalent: usePathname()
              </small>
            </td>
          </tr>
          <tr style={{ background: "#f9f9f9" }}>
            <td style={{ padding: "0.25rem 0.5rem", fontWeight: "bold" }}>
              router.asPath
            </td>
            <td style={{ padding: "0.25rem 0.5rem" }}>
              <code>{router.asPath}</code>
              <br />
              <small style={{ color: "#888" }}>
                Actual URL including query string and hash
              </small>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "0.25rem 0.5rem", fontWeight: "bold" }}>
              router.query
            </td>
            <td style={{ padding: "0.25rem 0.5rem" }}>
              <code>{JSON.stringify(router.query)}</code>
              <br />
              <small style={{ color: "#888" }}>
                Route params AND query params mixed in one object. App Router
                keeps these separate (useParams vs useSearchParams).
              </small>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
        <p>
          Try adding query params to the URL: <code>?name=alice&tab=2</code>.
          They appear in both <code>router.query</code> (client) and{" "}
          <code>context.query</code> in <code>getServerSideProps</code>{" "}
          (server).
        </p>
      </div>
    </div>
  );
}

SsrPage.layout = SectionLayout;

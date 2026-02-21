import Link from "next/link";
import { LoginForm } from "./_components/login-form";

export default function LabIndexPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">App Router file conventions lab</h1>
      <p className="text-sm text-slate-700">
        This subroute includes <code>loading.tsx</code>, <code>not-found.tsx</code>,{" "}
        <code>error.tsx</code>, <code>route.ts</code>, <code>template.tsx</code>,
        and a parallel-route <code>default.tsx</code>.
      </p>

      <ul className="space-y-2 text-sm">
        <li>
          <Link className="text-blue-700 underline" href="/lab/account">
            /lab/account
          </Link>{" "}
          and <code>/lab/billing</code> are inside a <code>(workspace)</code> route group and share
          group layout/template without adding <code>workspace</code> to the URL.
        </li>
        <li>
          <Link className="text-blue-700 underline" href="/lab/static-slug/alpha">
            /lab/static-slug/alpha
          </Link>{" "}
          uses <code>generateStaticParams()</code> for known slugs (try also{" "}
          <Link className="text-blue-700 underline" href="/lab/static-slug/gamma">
            /lab/static-slug/gamma
          </Link>
          ).
        </li>
        <li>
          <Link className="text-blue-700 underline" href="/lab/query?q=nextjs&sort=asc">
            /lab/query?q=nextjs&sort=asc
          </Link>{" "}
          reads <code>searchParams</code> (request-time dynamic render).
        </li>
        <li>
          <Link className="text-blue-700 underline" href="/lab/gallery">
            /lab/gallery
          </Link>{" "}
          lets you test intercepted route behavior for <code>/lab/photo/[id]</code>.
        </li>
        <li>
          <Link className="text-blue-700 underline" href="/lab/shop">
            /lab/shop
          </Link>{" "}
          tests interception without slots for <code>/lab/item/[id]</code>.
        </li>
        <li>
          <Link className="text-blue-700 underline" href="/lab/demo/slow">
            /lab/demo/slow
          </Link>{" "}
          shows <code>loading.tsx</code> first, then the page.
        </li>
        <li>
          <Link className="text-blue-700 underline" href="/lab/demo/missing">
            /lab/demo/missing
          </Link>{" "}
          triggers <code>notFound()</code> and renders <code>not-found.tsx</code>.
        </li>
        <li>
          <Link className="text-blue-700 underline" href="/lab/demo/error">
            /lab/demo/error
          </Link>{" "}
          throws and renders <code>error.tsx</code>.
        </li>
        <li>
          <a
            className="text-blue-700 underline"
            href="/lab/ping"
            rel="noopener noreferrer"
            target="_blank"
          >
            /lab/ping
          </a>{" "}
          is served by <code>route.ts</code>.
        </li>
      </ul>
      <LoginForm />
    </div>
  );
}

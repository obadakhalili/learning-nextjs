import Link from "next/link";

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
    </div>
  );
}

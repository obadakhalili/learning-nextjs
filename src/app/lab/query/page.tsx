import Link from "next/link";

type QueryPageProps = {
  searchParams: Promise<{ q?: string; sort?: string }>;
};

export default async function QueryPage({ searchParams }: QueryPageProps) {
  const { q, sort } = await searchParams;

  return (
    <article className="space-y-3">
      <h1 className="text-2xl font-semibold">searchParams demo</h1>
      <p className="text-sm text-slate-700">
        This page reads <code>searchParams</code>, so rendering depends on
        incoming request query values.
      </p>
      <p className="text-sm text-slate-700">
        Current query: <code>q={q ?? "(none)"}</code>,{" "}
        <code>sort={sort ?? "(none)"}</code>
      </p>
      <div className="flex gap-2 text-sm">
        <Link
          className="rounded-md bg-slate-900 px-3 py-2 text-white"
          href="/lab/query?q=nextjs&sort=asc"
        >
          q=nextjs, sort=asc
        </Link>
        <Link
          className="rounded-md bg-slate-700 px-3 py-2 text-white"
          href="/lab/query?q=rsc&sort=desc"
        >
          q=rsc, sort=desc
        </Link>
      </div>
    </article>
  );
}

import Link from "next/link";

type ItemPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ItemPage({ params }: ItemPageProps) {
  const { id } = await params;

  return (
    <article className="space-y-3">
      <h1 className="text-2xl font-semibold">Canonical item page: {id}</h1>
      <p className="text-sm text-slate-700">
        This is the standard branch for <code>/lab/item/[id]</code>.
      </p>
      <p className="text-sm text-slate-700">
        You see this on hard nav (refresh/direct entry).
      </p>
      <Link
        className="inline-block rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
        href="/lab/shop"
      >
        Back to shop
      </Link>
    </article>
  );
}

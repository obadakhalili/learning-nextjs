import Link from "next/link";

type InterceptedItemPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InterceptedItemPage({
  params,
}: InterceptedItemPageProps) {
  const { id } = await params;

  return (
    <article className="space-y-3 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
      <h1 className="text-xl font-semibold text-cyan-950">
        Intercepted item page: {id}
      </h1>
      <p className="text-sm text-cyan-900">
        This route is inside <code>/lab/shop</code> using{" "}
        <code>(..)item/[id]</code>, so on soft nav from shop it replaces the
        main <code>children</code> content.
      </p>
      <p className="text-sm text-cyan-900">No slot involved in this example.</p>
      <Link
        className="inline-block rounded-md bg-cyan-700 px-3 py-2 text-sm text-white"
        href="/lab/shop"
      >
        Back to shop
      </Link>
    </article>
  );
}

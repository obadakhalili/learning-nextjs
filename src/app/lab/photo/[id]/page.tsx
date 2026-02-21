import Link from "next/link";

type PhotoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PhotoPage({ params }: PhotoPageProps) {
  const { id } = await params;

  return (
    <article className="space-y-3">
      <h1 className="text-2xl font-semibold">Canonical photo page: {id}</h1>
      <p className="text-sm text-slate-700">
        This is the normal route branch for <code>/lab/photo/[id]</code>.
      </p>
      <p className="text-sm text-slate-700">
        You get this view on hard navigation (refresh/direct open).
      </p>
      <Link
        className="inline-block rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
        href="/lab/gallery"
      >
        Back to gallery
      </Link>
    </article>
  );
}

import Link from "next/link";

type InspectorPhotoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InspectorPhotoPage({
  params,
}: InspectorPhotoPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
      <p className="font-medium text-indigo-950">
        Intercepted route matched in @inspector
      </p>
      <p className="text-xs text-indigo-900">
        <code>(.)photo/[id]</code> intercepted <code>/lab/photo/{id}</code> from
        the current <code>/lab</code> context.
      </p>
      <p className="text-xs text-indigo-900">
        On refresh/direct open, this is not used; canonical{" "}
        <code>/lab/photo/[id]</code> renders.
      </p>
      <Link
        className="inline-block rounded-md bg-indigo-700 px-2 py-1 text-xs text-white"
        href="/lab/gallery"
      >
        Close (go back)
      </Link>
    </div>
  );
}

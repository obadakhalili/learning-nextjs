import Link from "next/link";

const photos = [
  { id: "1", title: "Ridge" },
  { id: "2", title: "Lake" },
  { id: "3", title: "Forest" },
] as const;

export default function GalleryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Gallery (intercept demo)</h1>
      <p className="text-sm text-slate-700">
        Click a photo link with client navigation from this page.
        <br />
        URL changes to <code>/lab/photo/[id]</code>, but the intercepted route
        renders in <code>@inspector</code>.
      </p>
      <p className="text-sm text-slate-700">
        Refresh on <code>/lab/photo/[id]</code> to see the canonical page
        instead.
      </p>

      <ul className="space-y-2 text-sm">
        {photos.map((photo) => (
          <li key={photo.id}>
            <Link
              className="text-blue-700 underline"
              href={`/lab/photo/${photo.id}`}
            >
              Open photo {photo.id}: {photo.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

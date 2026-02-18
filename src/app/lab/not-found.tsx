import Link from "next/link";

export default function LabNotFound() {
  return (
    <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <p className="font-medium">not-found.tsx rendered for this segment.</p>
      <p className="text-sm">
        This page appears when a route calls <code>notFound()</code>.
      </p>
      <Link className="inline-block rounded-md bg-amber-800 px-3 py-2 text-sm text-white" href="/lab">
        Back to /lab
      </Link>
    </div>
  );
}

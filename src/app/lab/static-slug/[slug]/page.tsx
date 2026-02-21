import Link from "next/link";
import { connection } from "next/server";

type StaticSlugPageProps = {
  params: Promise<{ slug: string }>;
};

const prebuiltSlugs = ["alpha", "beta"] as const;

export function generateStaticParams() {
  return prebuiltSlugs.map((slug) => ({ slug }));
}

export default async function StaticSlugPage({ params }: StaticSlugPageProps) {
  await connection();

  const { slug } = await params;
  const isPrebuiltSlug = prebuiltSlugs.includes(
    slug as (typeof prebuiltSlugs)[number],
  );

  return (
    <article className="space-y-3">
      <h1 className="text-2xl font-semibold">Static params demo: {slug}</h1>
      <p className="text-sm text-slate-700">
        This is <code>/lab/static-slug/[slug]</code> with{" "}
        <code>generateStaticParams()</code>.
      </p>
      <p className="text-sm text-slate-700">
        Known slugs: <code>alpha</code>, <code>beta</code>.
      </p>
      <p className="text-sm text-slate-700">
        Current slug is {isPrebuiltSlug ? "prebuilt" : "not prebuilt"}.
      </p>
      <p className="text-sm text-slate-700">
        Mental model: dynamic segment pattern, but known params can be
        prerendered.
      </p>
      <div className="flex gap-2 text-sm">
        <Link
          className="rounded-md bg-slate-900 px-3 py-2 text-white"
          href="/lab/static-slug/alpha"
        >
          alpha
        </Link>
        <Link
          className="rounded-md bg-slate-900 px-3 py-2 text-white"
          href="/lab/static-slug/beta"
        >
          beta
        </Link>
        <Link
          className="rounded-md bg-slate-700 px-3 py-2 text-white"
          href="/lab/static-slug/gamma"
        >
          gamma
        </Link>
      </div>
    </article>
  );
}

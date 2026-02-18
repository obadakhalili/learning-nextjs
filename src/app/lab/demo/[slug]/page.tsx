import { notFound } from "next/navigation";

type DemoPageProps = {
  params: Promise<{ slug: string }>;
};

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default async function DemoSlugPage({ params }: DemoPageProps) {
  const { slug } = await params;

  await wait(1200);

  if (slug === "missing") {
    notFound();
  }

  if (slug === "error") {
    throw new Error("Intentional demo error from /lab/demo/error");
  }

  return (
    <article className="space-y-2">
      <h1 className="text-xl font-semibold">Demo page: {slug}</h1>
      <p className="text-sm text-slate-700">
        You are seeing the main page content for a dynamic segment.
      </p>
      <p className="text-sm text-slate-700">
        This route waits 1.2s to make <code>loading.tsx</code> easy to observe.
      </p>
    </article>
  );
}

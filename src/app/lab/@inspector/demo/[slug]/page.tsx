type InspectorPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function InspectorDemoPage({
  params,
}: InspectorPageProps) {
  const { slug } = await params;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <p className="font-medium text-emerald-900">@inspector matched</p>
      <p className="text-xs text-emerald-800">
        For <code>/lab/demo/{slug}</code>, this slot page replaces{" "}
        <code>default.tsx</code>.
      </p>
    </div>
  );
}

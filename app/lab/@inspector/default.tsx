export default function InspectorDefault() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="font-medium">default.tsx</p>
      <p className="text-xs text-slate-600">
        No matching route exists for <code>@inspector</code> at this URL, so
        this fallback is rendered.
      </p>
    </div>
  );
}

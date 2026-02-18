export default function LabTemplate({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <p className="text-sm text-slate-600">
        template.tsx wraps this segment and remounts when you navigate between
        sibling routes in <code>/lab</code>.
      </p>
      {children}
    </div>
  );
}

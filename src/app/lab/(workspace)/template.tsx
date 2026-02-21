export default function WorkspaceGroupTemplate({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="space-y-2 rounded-md border border-dashed border-sky-300 p-3">
      <p className="text-xs text-sky-900">
        Group template: remounts when switching between sibling routes in this
        group.
      </p>
      {children}
    </div>
  );
}

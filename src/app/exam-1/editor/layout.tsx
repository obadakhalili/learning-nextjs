export default function EditorLayout({
  children,
  preview,
}: {
  children: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <div className="flex flex-row gap-4 p-4">
      <div className="flex-1">
        <h1 className="text-xl font-bold mb-2">editor</h1>
        <div>{children}</div>
      </div>
      <div className="flex-1">
        <h1 className="text-xl font-bold mb-2">preview</h1>
        <div>{preview}</div>
      </div>
    </div>
  );
}

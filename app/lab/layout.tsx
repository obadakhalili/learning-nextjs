import Link from "next/link";

export default function LabLayout({
  children,
  inspector,
}: Readonly<{
  children: React.ReactNode;
  inspector: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-[2fr_1fr]">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <nav className="mb-6 flex flex-wrap gap-3 text-sm">
            <Link className="rounded-md bg-slate-900 px-3 py-2 text-white" href="/lab">
              /lab
            </Link>
            <Link
              className="rounded-md bg-slate-200 px-3 py-2 hover:bg-slate-300"
              href="/lab/demo/slow"
            >
              /lab/demo/slow
            </Link>
            <Link
              className="rounded-md bg-slate-200 px-3 py-2 hover:bg-slate-300"
              href="/lab/demo/missing"
            >
              /lab/demo/missing
            </Link>
            <Link
              className="rounded-md bg-slate-200 px-3 py-2 hover:bg-slate-300"
              href="/lab/demo/error"
            >
              /lab/demo/error
            </Link>
          </nav>
          {children}
        </section>

        <aside className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Parallel Slot: @inspector</h2>
          <div className="text-sm text-slate-700">{inspector}</div>
        </aside>
      </div>
    </div>
  );
}

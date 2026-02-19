import LabNav from "./_components/lab-nav";
import UserProvider from "./_components/user-provider";
import { getUser } from "./lib/user";

export default function LabLayout({
  children,
  inspector,
}: Readonly<{
  children: React.ReactNode;
  inspector: React.ReactNode;
}>) {
  return (
    <UserProvider userPromise={getUser()}>
      <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-[2fr_1fr]">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <LabNav />
            {children}
          </section>

          <aside className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold">Parallel Slot: @inspector</h2>
            <div className="text-sm text-slate-700">{inspector}</div>
          </aside>
        </div>
      </div>
    </UserProvider>
  );
}

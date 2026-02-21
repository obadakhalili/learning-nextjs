import { workspaceSections } from "../_data/workspace-sections";

export default function AccountPage() {
  const current = workspaceSections.find(
    (section) => section.href === "/lab/account",
  );

  return (
    <article className="space-y-2">
      <h1 className="text-xl font-semibold">Account</h1>
      <p className="text-sm text-slate-700">
        Rendered at <code>/lab/account</code>, but file lives under{" "}
        <code>(workspace)</code>.
      </p>
      <p className="text-sm text-slate-700">
        Data imported from <code>_data</code>: {current?.description}
      </p>
    </article>
  );
}

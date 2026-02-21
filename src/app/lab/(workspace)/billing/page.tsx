import { workspaceSections } from "../_data/workspace-sections";

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default async function BillingPage() {
  await wait(450);

  const current = workspaceSections.find(
    (section) => section.href === "/lab/billing",
  );

  return (
    <article className="space-y-2">
      <h1 className="text-xl font-semibold">Billing</h1>
      <p className="text-sm text-slate-700">
        Rendered at <code>/lab/billing</code>, same shared group layout as
        account.
      </p>
      <p className="text-sm text-slate-700">
        Data imported from <code>_data</code>: {current?.description}
      </p>
    </article>
  );
}

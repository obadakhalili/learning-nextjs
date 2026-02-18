import Link from "next/link";

const items = [
  { id: "1", name: "Pen" },
  { id: "2", name: "Notebook" },
] as const;

export default function ShopPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Shop (intercept demo without slots)</h1>
      <p className="text-sm text-slate-700">
        Click an item link from here. On soft nav, interceptor in <code>/lab/shop</code> handles{" "}
        <code>/lab/item/[id]</code> inside main <code>children</code> area.
      </p>
      <p className="text-sm text-slate-700">
        Refresh/direct open <code>/lab/item/[id]</code> to see canonical page.
      </p>

      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <Link className="text-blue-700 underline" href={`/lab/item/${item.id}`}>
              Open item {item.id}: {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

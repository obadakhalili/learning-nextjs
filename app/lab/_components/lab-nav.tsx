"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = ["/lab", "/lab/demo/slow", "/lab/demo/missing", "/lab/demo/error"] as const;

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
}

export default function LabNav() {
  const pathname = normalizePath(usePathname());

  return (
    <nav className="mb-6 flex flex-wrap gap-3 text-sm">
      {links.map((href) => {
        const isActive = pathname === href;

        return (
          <Link
            key={href}
            className={
              isActive
                ? "rounded-md bg-slate-900 px-3 py-2 text-white"
                : "rounded-md bg-slate-200 px-3 py-2 hover:bg-slate-300"
            }
            href={href}
          >
            {href}
          </Link>
        );
      })}
    </nav>
  );
}

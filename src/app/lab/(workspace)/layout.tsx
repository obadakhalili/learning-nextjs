import Link from "next/link";

import { workspaceSections } from "./_data/workspace-sections";

export default function WorkspaceGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="space-y-4 rounded-lg border border-sky-200 bg-sky-50 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-sky-950">Route group layout: <code>(workspace)</code></p>
        <p className="text-xs text-sky-900">
          This layout wraps both <code>/lab/account</code> and <code>/lab/billing</code>, while{" "}
          <code>(workspace)</code> stays out of the URL.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 text-xs">
        {workspaceSections.map((section) => (
          <Link
            key={section.href}
            className="rounded-md bg-sky-700 px-2 py-1 text-white"
            href={section.href}
          >
            {section.href}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}

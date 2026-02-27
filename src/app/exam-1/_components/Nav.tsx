"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const routes = [
  "/exam-1/editor",
  "/exam-1/editor/tab",
  "/exam-1/form",
  "/exam-1/preloading/\\d*",
];

export function Nav() {
  const res = usePathname();

  return (
    <ul>
      {routes.map((link) => (
        <li key={link}>
          <Link
            href={link}
            style={{
              color:
                res === link || new RegExp(link).test(res) ? "red" : "black",
            }}
          >
            {link}
          </Link>
        </li>
      ))}
    </ul>
  );
}

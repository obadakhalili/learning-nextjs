"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const routes = [
  {
    regex: "^/exam-1/editor$",
    link: "/exam-1/editor",
  },
  {
    regex: "^/exam-1/editor/tab$",
    link: "/exam-1/editor/tab",
  },
  {
    regex: "^/exam-1/form$",
    link: "/exam-1/form",
  },
  {
    regex: "^/exam-1/preloading/\\d*$",
    link: "/exam-1/preloading/1",
  },
  {
    regex: "^/exam-1/app$",
    link: "/exam-1/app",
  },
];

export function Nav() {
  const res = usePathname();

  return (
    <ul>
      {routes.map(({ link, regex }) => (
        <li key={link}>
          <Link
            href={link}
            style={{
              color: new RegExp(regex).test(res) ? "red" : "black",
            }}
          >
            {link}
          </Link>
        </li>
      ))}
    </ul>
  );
}

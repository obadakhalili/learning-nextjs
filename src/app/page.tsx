import Link from "next/link";

export default function Home() {
  return (
    <ul>
      <li>
        <Link href="/lab">Go to Lab</Link>
      </li>
      <li>
        <Link href="/exam-1">Go to Exam 1</Link>
      </li>
    </ul>
  );
}

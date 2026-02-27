import { Suspense } from "react";
import { Nav } from "./_components/Nav";

export default function Exam1Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <Nav />
      </Suspense>
      {children}
    </div>
  );
}

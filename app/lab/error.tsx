"use client";

import { useEffect } from "react";

export default function LabError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.log(error);
  }, [error]);

  return (
    <div className="space-y-3 rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-900">
      <p className="font-medium">error.tsx caught an error in this segment.</p>
      <p className="text-sm">{error.message}</p>
      <button
        className="rounded-md bg-rose-700 px-3 py-2 text-sm text-white"
        onClick={() => reset()}
        type="button"
      >
        Try again
      </button>
    </div>
  );
}

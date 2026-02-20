"use client";

import { useState } from "react";
import { greet } from "../actions";

export default function Greeter() {
  const [name, setName] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof greet>> | null>(null);

  async function handleClick() {
    const response = await greet(name);
    setResult(response);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={handleClick}
        >
          Greet
        </button>
      </div>

      {result && (
        <div className="rounded-md bg-slate-50 p-4 text-sm space-y-1 font-mono">
          <p>message: {result.message}</p>
          <p>servedAt: {result.servedAt}</p>
          <p>pid: {result.pid}</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function ProductsList({
  products,
}: {
  products: { id: number; name: string }[];
}) {
  const searchParams = useSearchParams();

  const filteredProducts = products.filter((p) => {
    const name = searchParams?.get("name");
    if (!name) return true;
    return p.name.toLowerCase().includes(name.toLowerCase());
  });

  return (
    <div>
      <label>search</label>
      <input
        type="text"
        defaultValue={searchParams?.get("name") || ""}
        onChange={handleSearchChange}
      />
      <ul>
        {filteredProducts.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    window.history.pushState(null, "", `?name=${name}`);
  }
}

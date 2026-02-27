"use client";

import { removeFromCart } from "./actions";

export function UserItems({
  items,
}: {
  items: { id: number; name: string; price: number }[];
}) {
  return (
    <div>
      <h1>User Cart</h1>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <p>
              {item.name} - ${item.price}
            </p>
            <button onClick={() => removeFromCart(item.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

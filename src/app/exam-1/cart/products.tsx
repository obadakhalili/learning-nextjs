"use client";

import { addToCart } from "./actions";

export function Products({
  products,
}: {
  products: { id: number; name: string; price: number }[];
}) {
  return (
    <div>
      <h1>Products</h1>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <p>
              {product.name} - ${product.price}
            </p>
            <button onClick={() => addToCart(product.id)}>Add to Cart</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

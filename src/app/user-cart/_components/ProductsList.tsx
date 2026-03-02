"use client";

import { useOptimistic, useTransition } from "react";
import { addToCart } from "../actions";

export function ProductsList({
  products,
  userCart,
}: {
  products: { id: number; name: string }[];
  userCart: number[];
}) {
  const [optimisticCartCount, setOptimisticCartCount] = useOptimistic(
    userCart.length,
    (current, delta: number) => current + delta,
  );

  return (
    <div>
      # items in cart: {optimisticCartCount}
      <ul>
        {products.map((p) => {
          return (
            <li key={p.id}>
              {p.name} {userCart.includes(p.id) ? "(In Cart)" : ""}
              <AddToCartButton
                productId={p.id}
                setOptimisticCartCount={setOptimisticCartCount}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AddToCartButton({
  productId,
  setOptimisticCartCount,
}: {
  productId: number;
  setOptimisticCartCount: (delta: number) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleAddToCart = (productId: number) => {
    startTransition(async () => {
      setOptimisticCartCount(1);
      const result = await addToCart(productId);
      if (!result.success) {
        alert(result.error);
      }
    });
  };
  return (
    <button disabled={isPending} onClick={() => handleAddToCart(productId)}>
      {isPending ? "Adding..." : "Add to Cart"}
    </button>
  );
}

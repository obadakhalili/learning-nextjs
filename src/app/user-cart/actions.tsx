"use server";

import { revalidatePath } from "next/cache";
import { products, userCart } from "./page";

interface AddToCartState {
  success: boolean;
  error?: string;
}

export async function addToCart(productId: number): Promise<AddToCartState> {
  const isItemInProducts = products.some((p) => p.id === productId);
  if (!isItemInProducts) {
    return { error: "Product not found", success: false };
  }
  const isItemInCart = userCart.some((id) => id === productId);
  if (isItemInCart) {
    return { error: "Product already in cart", success: false };
  }
  userCart.push(productId);
  revalidatePath("/user-cart");
  return { success: true };
}

"use server";

import { userItems } from "./data";
import { updateTag } from "next/cache";

export async function addToCart(productId: number) {
  userItems.push(productId);
  updateTag("user-cart");
}

export async function removeFromCart(productId: number) {
  const index = userItems.indexOf(productId);
  if (index > -1) {
    userItems.splice(index, 1);
    updateTag("user-cart");
  }
}

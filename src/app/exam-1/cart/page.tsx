import { cacheTag } from "next/cache";
import { userItems } from "./data";
import { Products } from "./products";
import { UserItems } from "./user-items";

async function getUserCart() {
  "use cache";
  cacheTag("user-cart");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return Promise.resolve(userItems);
}

const products = [
  { id: 1, name: "Product 1", price: 10 },
  { id: 2, name: "Product 2", price: 20 },
];

export default async function CartPage() {
  const cart = await getUserCart();
  const cartItems = products.filter((product) => cart.includes(product.id));
  const remainingItems = products.filter(
    (product) => !cart.includes(product.id),
  );

  return (
    <div>
      <UserItems items={cartItems} />
      <Products products={remainingItems} />
    </div>
  );
}

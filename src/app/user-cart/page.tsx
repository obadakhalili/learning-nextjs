import { ProductsList } from "./_components/ProductsList";

export const products = [
  {
    id: 1,
    name: "Product 1",
  },
  {
    id: 2,
    name: "Product 2",
  },
  {
    id: 3,
    name: "Product 3",
  },
];

export const userCart = [1];

async function getProducts() {
  return Promise.resolve(products);
}

async function getUserCart() {
  return Promise.resolve(userCart);
}

export default async function UserCartPage() {
  const [products, userCart] = await Promise.all([
    getProducts(),
    getUserCart(),
  ]);

  return <ProductsList products={products} userCart={userCart} />;
}

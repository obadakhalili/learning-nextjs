import { ProductsList } from "./_components/ProductsList";

const products = [
  { id: 1, name: "x" },
  { id: 2, name: "xy" },
  { id: 3, name: "xyz" },
];

export default async function ProductsListPage() {
  return <ProductsList products={products} />;
}

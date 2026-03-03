import { ProductsList } from "./_components/ProductsList";

const products = [
  { id: 1, name: "Product 1" },
  { id: 2, name: "Product 2" },
  { id: 3, name: "Product 3" },
];

export default async function ProductsListPage() {
  return <ProductsList products={products} />;
}

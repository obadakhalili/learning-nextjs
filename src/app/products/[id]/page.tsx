import { notFound } from "next/navigation";
import React from "react";

const products = [
  { id: "1", name: "Product 1" },
  { id: "2", name: "Product 2" },
  { id: "3", name: "Product 3" },
  { id: "4", name: "Product 4" },
];

const fetchProduct = React.cache((id: string) => {
  return Promise.resolve(products.find((product) => product.id === id));
});

export function generateStaticParams() {
  return products.slice(2).map((product) => ({ id: product.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProduct(id);

  if (!product) {
    return {
      title: "Product not found",
    };
  }

  return {
    title: product.name,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProduct(id);

  if (!product) {
    notFound();
  }

  return <h1>{product.name}</h1>;
}

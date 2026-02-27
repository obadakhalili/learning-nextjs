import React from "react";

async function ProductDetails({ id }: { id: string }) {
  const details = await memoiozedFetchProductDetails(id);
  return <h1>{details}</h1>;
}

function independantAsyncOperation() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("independant async operation complete");
    }, 2000);
  });
}

function fetchProductDetails(id: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`product details for product ${id} fetched`);
    }, 2000);
  });
}

const memoiozedFetchProductDetails = React.cache(fetchProductDetails);

export default async function PreloadingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  memoiozedFetchProductDetails(id);
  await independantAsyncOperation();
  return <ProductDetails id={id} />;
}

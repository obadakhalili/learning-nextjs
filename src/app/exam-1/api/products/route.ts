import { cacheLife } from "next/cache";
import { NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const authorization = request.headers.get("Authorization");
  if (authorization !== "Bearer my-secret-token") {
    return new Response("Unauthorized", { status: 401 });
  }
  const products = getProducts();
  return new Response(JSON.stringify(products), {
    headers: { "Content-Type": "application/json" },
  });
}

function getProducts() {
  "use cache";
  cacheLife({
    revalidate: 60 * 60, // 1 hour
  });
  return [
    { id: 1, name: "Product 1", price: 10 },
    { id: 2, name: "Product 2", price: 20 },
    { id: 3, name: "Product 3", price: 30 },
  ];
}

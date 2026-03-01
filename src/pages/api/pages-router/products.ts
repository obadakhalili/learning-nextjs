/**
 * API Route demo — Pages Router equivalent of App Router Route Handlers.
 *
 * Key differences from App Router Route Handlers:
 *
 *   Pages Router:                       App Router:
 *   export default handler(req, res)    export async function GET(req), POST, …
 *   switch on req.method                separate named exports per HTTP method
 *   NextApiRequest (Node.js)            Request (Web Fetch API)
 *   res.status(200).json(data)          return Response.json(data)
 *   req.body (auto-parsed JSON)         await req.json()
 *   req.query                           new URL(req.url).searchParams
 *   req.cookies                         cookies() from next/headers
 *
 * Try it:
 *   GET  /api/pages-router/products
 *   GET  /api/pages-router/products?id=1
 *   POST /api/pages-router/products   body: { "name": "New Product", "price": 99 }
 */
import type { NextApiRequest, NextApiResponse } from "next";

const PRODUCTS = [
  { id: 1, name: "Mechanical Keyboard", price: 149 },
  { id: 2, name: "USB-C Hub", price: 49 },
  { id: 3, name: "Monitor Stand", price: 89 },
];

type Product = (typeof PRODUCTS)[number];
type ErrorBody = { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Product | Product[] | ErrorBody>,
) {
  if (req.method === "GET") {
    const { id } = req.query;

    if (id) {
      // req.query has BOTH route params AND query string params.
      // For pages/api/products.ts there are no dynamic route segments,
      // so req.query only has query string params here.
      const product = PRODUCTS.find((p) => p.id === Number(id));
      if (!product) {
        return res.status(404).json({ error: `Product ${id} not found` });
      }
      return res.status(200).json(product);
    }

    return res.status(200).json(PRODUCTS);
  }

  if (req.method === "POST") {
    // req.body is auto-parsed by Next.js for Content-Type: application/json
    const { name, price } = req.body as { name?: string; price?: number };

    if (!name || price == null) {
      return res.status(400).json({ error: "name and price are required" });
    }

    // In a real app: const product = await db.products.create({ data: { name, price } })
    const newProduct: Product = { id: PRODUCTS.length + 1, name, price };
    PRODUCTS.push(newProduct);

    return res.status(201).json(newProduct);
  }

  // Method not allowed
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}

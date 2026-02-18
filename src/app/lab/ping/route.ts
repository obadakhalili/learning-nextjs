export async function GET() {
  return Response.json({
    message: "Hello from app/lab/ping/route.ts",
    timestamp: new Date().toISOString(),
  });
}

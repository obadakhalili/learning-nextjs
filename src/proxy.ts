import { NextRequest, NextResponse } from "next/server";
import { getUser } from "./app/lab/lib/user";

const protectedRoutes = ["/lab/protected"];

export default async function proxy(req: NextRequest) {
  const route = req.nextUrl.pathname;
  if (protectedRoutes.includes(route)) {
    const user = await getUser();
    console.log("look here", user);
    if (!user) {
      return NextResponse.redirect(new URL("/lab/user", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};

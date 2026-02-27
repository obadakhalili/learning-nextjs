import { NextRequest, NextResponse } from "next/server";
import { getUser } from "./app/lab/lib/user";
// import { verifyUserSession } from "./app/exam-1/app/_lib/users";

const protectedRoutes = ["/lab/protected"];

export default async function proxy(req: NextRequest) {
  const route = req.nextUrl.pathname;
  if (protectedRoutes.includes(route)) {
    // if (route === "/lab/protected") {
    const user = await getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/lab/user", req.url));
    }
    // } else {
    //   await verifyUserSession()
    // }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};

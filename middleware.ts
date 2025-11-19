import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  // Try to get session from cookie-based auth first
  const headersList = new Headers(request.headers);
  
  // Check for bearer token in Authorization header (for JWT/localStorage auth)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    headersList.set("Authorization", authHeader);
  }
  
  // Also check for bearer token in custom header (client may send it this way)
  const bearerToken = request.cookies.get("bearer_token")?.value;
  if (bearerToken && !authHeader) {
    headersList.set("Authorization", `Bearer ${bearerToken}`);
  }
  
  const session = await auth.api.getSession({ 
    headers: headersList
  });
  
  // If no session, redirect to login with return URL
  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // User is authenticated, allow access
  return NextResponse.next();
}

export const config = {
  matcher: ["/projects/:path*"],
};
import { NextResponse, type NextRequest } from "next/server";
import { httpsPublicUrl, httpsRedirectTarget } from "@/lib/http-security";

const SECURITY_HEADERS: [string, string][] = [
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["X-Frame-Options", "SAMEORIGIN"],
  ["Permissions-Policy", "camera=(self), geolocation=(self)"],
  ["Strict-Transport-Security", "max-age=15552000; includeSubDomains"],
];

function withSecurityHeaders(response: NextResponse) {
  for (const [key, value] of SECURITY_HEADERS) {
    if (key === "Strict-Transport-Security" && !httpsPublicUrl()) continue;
    response.headers.set(key, value);
  }
  return response;
}

export function middleware(request: NextRequest) {
  const target = httpsRedirectTarget({
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    path: `${request.nextUrl.pathname}${request.nextUrl.search}`,
  });
  if (target) {
    return withSecurityHeaders(NextResponse.redirect(target, 308));
  }
  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  // Skip Next internals and static public assets (brand, PWA icons, SW).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|icons/|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

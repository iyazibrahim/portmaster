import { NextResponse, type NextRequest } from "next/server";
import { httpsPublicUrl, httpsRedirectTarget } from "@/lib/http-security";

const SECURITY_HEADERS: [string, string][] = [
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["X-Frame-Options", "SAMEORIGIN"],
  ["Permissions-Policy", "camera=(self), geolocation=(self)"],
  ["Strict-Transport-Security", "max-age=15552000; includeSubDomains"],
];

function contentSecurityPolicy() {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self' https://checkout.stripe.com https://billing.stripe.com https://*.hit-pay.com",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self' https://api.stripe.com https://checkout.stripe.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "frame-src 'self' https://checkout.stripe.com https://js.stripe.com https://hooks.stripe.com",
  ];
  if (httpsPublicUrl()) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

function withSecurityHeaders(response: NextResponse) {
  for (const [key, value] of SECURITY_HEADERS) {
    if (key === "Strict-Transport-Security" && !httpsPublicUrl()) continue;
    response.headers.set(key, value);
  }
  response.headers.set("Content-Security-Policy", contentSecurityPolicy());
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

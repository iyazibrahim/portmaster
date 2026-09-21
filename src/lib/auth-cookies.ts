/**
 * Auth.js only prefixes cookies with `__Secure-` when the public URL is HTTPS.
 * Docker local is NODE_ENV=production on http://127.0.0.1, so tying this to
 * NODE_ENV makes the browser drop the session cookie and bounce back to /login.
 */
export function shouldUseSecureAuthCookies() {
  const url = process.env.AUTH_URL || process.env.APP_URL || "";
  return url.startsWith("https://");
}

export function authSessionCookieName() {
  return shouldUseSecureAuthCookies()
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

export function safeInternalPath(next: string | undefined, role: string) {
  if (
    next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("\\")
  ) {
    return next;
  }
  if (role === "ADMIN") return "/admin/ops";
  if (role === "LLM_VIEWER") return "/llm";
  if (role === "HANDLER") return "/handler";
  return "/pass";
}

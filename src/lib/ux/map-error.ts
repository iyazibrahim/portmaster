export type UxErrorKind = "network" | "timeout" | "server" | "generic";

export function classifyError(error: unknown): UxErrorKind {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lower = message.toLowerCase();

  if (
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("offline") ||
    lower.includes("err_internet")
  ) {
    return "network";
  }
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("abort")) {
    return "timeout";
  }
  if (
    lower.includes("500") ||
    lower.includes("502") ||
    lower.includes("503") ||
    lower.includes("server")
  ) {
    return "server";
  }
  return "generic";
}

export function uxErrorKeys(kind: UxErrorKind) {
  return {
    title: `ux.error.${kind}Title` as const,
    body: `ux.error.${kind}Body` as const,
    hint: "ux.error.whatYouCanDo" as const,
  };
}

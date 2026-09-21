/** Client-safe photo URL helper (no Node fs). */
export function photoUrl(photoKey: string | null | undefined): string | null {
  if (!photoKey) return null;
  return `/api/photos/${encodeURIComponent(photoKey)}`;
}

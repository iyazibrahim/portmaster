import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

const PHOTOS_DIR = path.join(process.cwd(), "data", "photos");

export async function ensurePhotosDir() {
  await mkdir(PHOTOS_DIR, { recursive: true });
}

export async function saveProfilePhoto(input: {
  userId: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<string> {
  await ensurePhotosDir();
  const ext =
    input.mimeType === "image/png"
      ? "png"
      : input.mimeType === "image/webp"
        ? "webp"
        : "jpg";
  const key = `${input.userId}_${nanoid(8)}.${ext}`;
  await writeFile(path.join(PHOTOS_DIR, key), input.bytes);
  return key;
}

export async function readProfilePhoto(
  photoKey: string,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  if (!photoKey || photoKey.includes("..") || photoKey.includes("/") || photoKey.includes("\\")) {
    return null;
  }
  try {
    const bytes = await readFile(path.join(PHOTOS_DIR, photoKey));
    const ext = photoKey.split(".").pop()?.toLowerCase();
    const mimeType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";
    return { bytes, mimeType };
  } catch {
    return null;
  }
}

export function photoUrl(photoKey: string | null | undefined): string | null {
  if (!photoKey) return null;
  return `/api/photos/${encodeURIComponent(photoKey)}`;
}

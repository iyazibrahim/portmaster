import { mkdir, writeFile, readFile, unlink, readdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import sharp from "sharp";

const PHOTOS_DIR = path.join(process.cwd(), "data", "photos");

/** Max edge for identity / letterhead stills saved on disk. */
export const PHOTO_MAX_EDGE = 480;
/** WebP quality 1–100 for e-KYC (sharp). */
export const PHOTO_WEBP_QUALITY = 72;

export async function ensurePhotosDir() {
  await mkdir(PHOTOS_DIR, { recursive: true });
}

function safeKey(name: string): boolean {
  return Boolean(name) && !name.includes("..") && !name.includes("/") && !name.includes("\\");
}

/** Remove every on-disk file belonging to a user (stable key + legacy `userId_*`). */
export async function deleteUserPhotos(userId: string): Promise<number> {
  if (!userId || userId.includes("..") || userId.includes("/") || userId.includes("\\")) {
    return 0;
  }
  await ensurePhotosDir();
  let removed = 0;
  try {
    const files = await readdir(PHOTOS_DIR);
    for (const file of files) {
      const isStable =
        file === `${userId}.webp` ||
        file === `${userId}.jpg` ||
        file === `${userId}.jpeg` ||
        file === `${userId}.png`;
      const isLegacy = file.startsWith(`${userId}_`);
      if (!isStable && !isLegacy) continue;
      try {
        await unlink(path.join(PHOTOS_DIR, file));
        removed += 1;
      } catch {
        // ignore missing
      }
    }
  } catch {
    // dir missing
  }
  return removed;
}

export async function deletePhotoByKey(photoKey: string | null | undefined): Promise<void> {
  if (!photoKey || !safeKey(photoKey)) return;
  try {
    await unlink(path.join(PHOTOS_DIR, photoKey));
  } catch {
    // ignore
  }
}

/** Resize + encode identity photo as WebP (one file per user: `{userId}.webp`). */
export async function compressIdentityPhoto(
  bytes: Buffer,
): Promise<{ bytes: Buffer; mimeType: "image/webp" }> {
  const out = await sharp(bytes)
    .rotate()
    .resize(PHOTO_MAX_EDGE, PHOTO_MAX_EDGE, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: true,
    })
    .webp({ quality: PHOTO_WEBP_QUALITY, effort: 4 })
    .toBuffer();
  return { bytes: out, mimeType: "image/webp" };
}

export async function saveProfilePhoto(input: {
  userId: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<string> {
  await ensurePhotosDir();
  // One photo per user: wipe prior keys (jpg/png/webp + legacy nanoid names).
  await deleteUserPhotos(input.userId);

  let compressed: Buffer;
  try {
    compressed = (await compressIdentityPhoto(input.bytes)).bytes;
  } catch {
    // Fall back to writing a capped JPEG if decode fails
    compressed = await sharp(input.bytes)
      .rotate()
      .resize(PHOTO_MAX_EDGE, PHOTO_MAX_EDGE, {
        fit: "cover",
        position: "centre",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();
    const key = `${input.userId}.jpg`;
    await writeFile(path.join(PHOTOS_DIR, key), compressed);
    return key;
  }

  const key = `${input.userId}.webp`;
  await writeFile(path.join(PHOTOS_DIR, key), compressed);
  return key;
}

/** Ops letterhead logo for printable receipts. Keys are public to signed-in users. */
export async function saveLetterheadLogo(input: {
  bytes: Buffer;
  mimeType: string;
}): Promise<string> {
  await ensurePhotosDir();
  let out: Buffer;
  let ext: string;
  try {
    out = await sharp(input.bytes)
      .rotate()
      .resize(800, 400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    ext = "webp";
  } catch {
    const fromMime =
      input.mimeType === "image/png"
        ? "png"
        : input.mimeType === "image/webp"
          ? "webp"
          : "jpg";
    ext = fromMime;
    out = input.bytes;
  }
  const key = `letterhead_${nanoid(10)}.${ext}`;
  await writeFile(path.join(PHOTOS_DIR, key), out);
  return key;
}

export function isLetterheadLogoKey(photoKey: string): boolean {
  return photoKey.startsWith("letterhead_");
}

export async function readProfilePhoto(
  photoKey: string,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  if (!safeKey(photoKey)) {
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

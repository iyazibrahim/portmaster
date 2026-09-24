/**
 * Client-side e-KYC capture compression: square crop → max 480px → WebP (JPEG fallback).
 */

export const EKYC_MAX_EDGE = 480;
export const EKYC_WEBP_QUALITY = 0.72;
export const EKYC_JPEG_QUALITY = 0.7;

export type EkycCompressed = {
  base64: string;
  mimeType: "image/webp" | "image/jpeg";
  previewUrl: string;
};

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Resize square canvas and encode as WebP when supported, else JPEG. */
export async function compressEkycCanvas(
  source: HTMLCanvasElement,
): Promise<EkycCompressed> {
  const edge = Math.min(
    EKYC_MAX_EDGE,
    Math.max(source.width, source.height) || EKYC_MAX_EDGE,
  );
  const out = document.createElement("canvas");
  out.width = edge;
  out.height = edge;
  const ctx = out.getContext("2d");
  if (!ctx) {
    throw new Error("Could not compress photo.");
  }
  ctx.drawImage(source, 0, 0, edge, edge);

  const webpBlob = await canvasToBlob(out, "image/webp", EKYC_WEBP_QUALITY);
  if (webpBlob && webpBlob.type === "image/webp" && webpBlob.size > 0) {
    const base64 = await blobToBase64(webpBlob);
    const previewUrl = URL.createObjectURL(webpBlob);
    return { base64, mimeType: "image/webp", previewUrl };
  }

  const jpegBlob = await canvasToBlob(out, "image/jpeg", EKYC_JPEG_QUALITY);
  if (jpegBlob && jpegBlob.size > 0) {
    const base64 = await blobToBase64(jpegBlob);
    const previewUrl = URL.createObjectURL(jpegBlob);
    return { base64, mimeType: "image/jpeg", previewUrl };
  }

  // Last resort (older Safari quirks)
  const dataUrl = out.toDataURL("image/jpeg", EKYC_JPEG_QUALITY);
  const base64 = dataUrl.split(",")[1] ?? "";
  if (!base64) throw new Error("Could not compress photo.");
  return { base64, mimeType: "image/jpeg", previewUrl: dataUrl };
}

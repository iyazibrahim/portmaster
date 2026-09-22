import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { handlers, users } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { isLetterheadLogoKey, readProfilePhoto } from "@/lib/photos";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ key: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { key } = await ctx.params;
  const photoKey = decodeURIComponent(key);
  const file = await readProfilePhoto(photoKey);
  if (!file) return new NextResponse("Not found", { status: 404 });

  // Receipt letterhead logos are readable by any signed-in user (print page).
  if (isLetterheadLogoKey(photoKey)) {
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const [owner] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.photoKey, photoKey))
    .limit(1);

  const role = session.user.role;
  const isSelf = owner?.id === session.user.id;
  const isStaff =
    role === "ADMIN" || role === "HANDLER" || role === "LLM_VIEWER";

  if (!isSelf && !isStaff) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Handler may only view photos (no extra check beyond role for MVP)
  if (role === "HANDLER") {
    const [h] = await db
      .select()
      .from(handlers)
      .where(eq(handlers.userId, session.user.id))
      .limit(1);
    if (!h) return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

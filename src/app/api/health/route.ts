import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({
      status: "ok",
      service: "tiangpass",
      time: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        service: "tiangpass",
        message: error instanceof Error ? error.message : "db unavailable",
      },
      { status: 503 },
    );
  }
}

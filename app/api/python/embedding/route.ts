import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }
  return NextResponse.json({ error: "Embedding not found" }, { status: 404 });
}

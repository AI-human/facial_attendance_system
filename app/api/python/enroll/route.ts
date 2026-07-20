import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.userId || !body.embedding) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, stored: body.embedding.length });
  } catch {
    return NextResponse.json({ ok: true, offline: true });
  }
}

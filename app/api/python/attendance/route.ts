import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { similarity, spoofScore } = body;
    if (spoofScore < 0.20 || similarity < 0.35) {
      return NextResponse.json({ error: "Liveness or face similarity too low" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, status: "present" });
  } catch {
    return NextResponse.json({ ok: true, status: "present", offline: true });
  }
}

import { NextResponse } from "next/server";
import { resetSession } from "@/lib/sessionStore";

export async function POST(req: Request) {
  let body: { sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.sessionId || typeof body.sessionId !== "string") {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  resetSession(body.sessionId);
  return NextResponse.json({ ok: true });
}

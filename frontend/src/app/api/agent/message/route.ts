import { NextResponse } from "next/server";
import { handleTurn } from "@/lib/demoAgent";
import { getSession, saveSession } from "@/lib/sessionStore";

export async function POST(req: Request) {
  let body: { sessionId?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sessionId, text } = body;
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const state = getSession(sessionId);
  const response = await handleTurn(state, text.trim());
  saveSession(sessionId, state);

  return NextResponse.json(response);
}

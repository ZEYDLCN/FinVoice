import { NextResponse } from "next/server";
import { getServiceUrls } from "@/lib/serviceConfig";

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

  const { backend } = await getServiceUrls();
  try {
    const upstream = await fetch(`${backend}/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, text: text.trim() }),
      cache: "no-store",
    });

    const raw = await upstream.text();
    if (!upstream.ok) {
      let detail = raw;
      try {
        const parsed = JSON.parse(raw) as { detail?: string };
        detail = parsed.detail ?? raw;
      } catch {
        // Keep the upstream response text.
      }
      return NextResponse.json(
        { error: detail || `Agent backend returned HTTP ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const response = JSON.parse(raw) as {
      reply: string;
      toolCalls?: unknown[];
      handoff?: unknown;
      responseMode?: "llm" | "validation" | "guardrail";
    };
    return NextResponse.json({
      reply: response.reply,
      toolCalls: response.toolCalls ?? [],
      handoff: response.handoff ?? null,
      intent: null,
      confidence: null,
      responseMode: response.responseMode ?? "llm",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent backend is unreachable" },
      { status: 502 }
    );
  }
}

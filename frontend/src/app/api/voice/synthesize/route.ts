import { NextResponse } from "next/server";
import { getServiceUrls } from "@/lib/serviceConfig";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const { voice } = await getServiceUrls();
  try {
    const upstream = await fetch(`${voice}/v1/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/wav" },
      body: JSON.stringify({ text }),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: detail || `Voice service returned HTTP ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const audio = await upstream.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "audio/wav",
        "Content-Length": String(audio.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Voice service is unreachable" },
      { status: 502 }
    );
  }
}

import { NextResponse } from "next/server";
import { mockApi, MockApiError } from "@/lib/mockApi";
import { getServiceUrls } from "@/lib/serviceConfig";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }
  const urls = await getServiceUrls();

  try {
    if (body.action === "check") {
      const policyNumber = String(body.policyNumber ?? "").trim();
      const topic = String(body.topic ?? "").trim();
      if (!policyNumber || !topic) {
        return NextResponse.json({ error: "policyNumber and topic are required" }, { status: 400 });
      }
      const coverage = await mockApi.checkCoverage(policyNumber, topic, urls.mockEnterprise);
      return NextResponse.json({ coverage });
    }

    if (body.action === "search") {
      const query = String(body.query ?? "").trim();
      if (!query) {
        return NextResponse.json({ error: "query is required" }, { status: 400 });
      }
      const res = await fetch(`${urls.rag}/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, topK: 3 }),
        cache: "no-store",
      });
      if (!res.ok) {
        return NextResponse.json({ error: `RAG servisi hata döndürdü (${res.status})` }, { status: 502 });
      }
      const data = await res.json();
      return NextResponse.json({ results: data.results ?? [] });
    }

    return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
  } catch (err) {
    if (err instanceof MockApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

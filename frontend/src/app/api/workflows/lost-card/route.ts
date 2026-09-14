import { NextResponse } from "next/server";
import { mockApi, MockApiError } from "@/lib/mockApi";
import { getServiceUrls } from "@/lib/serviceConfig";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }
  const { mockEnterprise } = await getServiceUrls();

  try {
    if (body.action === "list-cards") {
      const customerId = String(body.customerId ?? "").trim();
      if (!customerId) {
        return NextResponse.json({ error: "customerId is required" }, { status: 400 });
      }
      const cards = await mockApi.listCustomerCards(customerId, mockEnterprise);
      return NextResponse.json({ cards });
    }

    if (body.action === "freeze-and-replace") {
      const cardId = String(body.cardId ?? "").trim();
      if (!cardId) {
        return NextResponse.json({ error: "cardId is required" }, { status: 400 });
      }
      await mockApi.freezeCard(cardId, mockEnterprise);
      const replacement = await mockApi.requestReplacementCard(cardId, mockEnterprise);
      return NextResponse.json({ replacement });
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

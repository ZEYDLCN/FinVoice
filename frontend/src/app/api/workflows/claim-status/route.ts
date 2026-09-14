import { NextResponse } from "next/server";
import { mockApi, MockApiError } from "@/lib/mockApi";
import { getServiceUrls } from "@/lib/serviceConfig";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const claimId = String(body?.claimId ?? "").trim();
  if (!claimId) {
    return NextResponse.json({ error: "claimId is required" }, { status: 400 });
  }
  const { mockEnterprise } = await getServiceUrls();

  try {
    const claim = await mockApi.getClaimStatus(claimId, mockEnterprise);
    return NextResponse.json({ claim });
  } catch (err) {
    if (err instanceof MockApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

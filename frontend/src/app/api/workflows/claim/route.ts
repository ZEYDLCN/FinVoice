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
    if (body.action === "check-policy") {
      const policyNumber = String(body.policyNumber ?? "").trim();
      if (!policyNumber) {
        return NextResponse.json({ error: "policyNumber is required" }, { status: 400 });
      }
      const policy = await mockApi.getPolicy(policyNumber, mockEnterprise);
      return NextResponse.json({ policy });
    }

    if (body.action === "submit") {
      const { policyNumber, accidentDate, location, description } = body;
      if (!policyNumber || !accidentDate || !location || !description) {
        return NextResponse.json(
          { error: "policyNumber, accidentDate, location, description are required" },
          { status: 400 }
        );
      }
      const claim = await mockApi.createClaim(
        { policyNumber, accidentDate, location, description },
        mockEnterprise
      );
      return NextResponse.json({ claim });
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

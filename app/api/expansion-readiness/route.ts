import { NextRequest, NextResponse } from "next/server";
import { getDemoTenant } from "@/lib/demoTenant";
import { calculateExpansionReadiness } from "@/lib/expansionReadiness";
import { TimeRange } from "@/lib/expansionReadiness/types";

export async function GET(req: NextRequest) {
  try {
    const { company } = await getDemoTenant();

    const range =
      (req.nextUrl.searchParams.get("range") as TimeRange) ?? "month";

    const data = await calculateExpansionReadiness(company.id, range);

    return NextResponse.json(data);
  } catch (err) {
    console.error("[EXPANSION_READINESS_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to calculate expansion readiness" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { getAnalyticsSummary, getDailyTrend, getTopPages } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  const settings = loadSettings();
  if (!settings.gaPropertyId || !settings.gaServiceAccountPath) {
    return NextResponse.json({ configured: false });
  }

  const periodParam = request.nextUrl.searchParams.get("period");
  const days = periodParam === "30" ? 30 : 7;

  try {
    const [summary, trend, topPages] = await Promise.all([
      getAnalyticsSummary(days),
      getDailyTrend(days),
      getTopPages(days),
    ]);

    return NextResponse.json({ configured: true, summary, trend, topPages });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

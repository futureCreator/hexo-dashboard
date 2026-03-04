import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { loadSettings } from "./settings";

function createClient() {
  const settings = loadSettings();
  if (!settings.gaPropertyId || !settings.gaServiceAccountPath) {
    throw new Error("GA not configured");
  }
  const client = new BetaAnalyticsDataClient({
    keyFilename: settings.gaServiceAccountPath,
  });
  return { client, propertyId: settings.gaPropertyId };
}

export async function getAnalyticsSummary(days: 7 | 30) {
  const { client, propertyId } = createClient();
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "bounceRate" },
    ],
  });

  const row = response.rows?.[0];
  const vals = row?.metricValues ?? [];
  return {
    activeUsers: Number(vals[0]?.value ?? 0),
    sessions: Number(vals[1]?.value ?? 0),
    pageviews: Number(vals[2]?.value ?? 0),
    bounceRate: parseFloat(vals[3]?.value ?? "0"),
  };
}

export async function getDailyTrend(days: 7 | 30) {
  const { client, propertyId } = createClient();
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "activeUsers" }, { name: "sessions" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });

  return (response.rows ?? []).map((row) => ({
    date: row.dimensionValues?.[0]?.value ?? "",
    activeUsers: Number(row.metricValues?.[0]?.value ?? 0),
    sessions: Number(row.metricValues?.[1]?.value ?? 0),
  }));
}

export async function getTopPages(days: 7 | 30) {
  const { client, propertyId } = createClient();
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
    orderBys: [
      { metric: { metricName: "screenPageViews" }, desc: true },
    ],
    limit: 10,
  });

  return (response.rows ?? []).map((row) => ({
    page: row.dimensionValues?.[0]?.value ?? "",
    views: Number(row.metricValues?.[0]?.value ?? 0),
    sessions: Number(row.metricValues?.[1]?.value ?? 0),
  }));
}

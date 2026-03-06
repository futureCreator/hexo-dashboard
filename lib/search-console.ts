import { google } from "googleapis";
import { loadSettings } from "./settings";

function createClient() {
  const settings = loadSettings();
  if (!settings.gaServiceAccountPath || !settings.gscSiteUrl) {
    throw new Error("GSC not configured");
  }
  const auth = new google.auth.GoogleAuth({
    keyFilename: settings.gaServiceAccountPath,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const client = google.searchconsole({ version: "v1", auth });
  return { client, siteUrl: settings.gscSiteUrl };
}

function toIsoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export async function getGscSummary(days: number) {
  const { client, siteUrl } = createClient();
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: toIsoDate(days),
      endDate: toIsoDate(0),
      dimensions: [],
    },
  });
  const row = res.data.rows?.[0];
  return {
    clicks: row?.clicks ?? 0,
    impressions: row?.impressions ?? 0,
    ctr: row?.ctr ?? 0,
    position: row?.position ?? 0,
  };
}

export async function getGscDailyTrend(days: number) {
  const { client, siteUrl } = createClient();
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: toIsoDate(days),
      endDate: toIsoDate(0),
      dimensions: ["date"],
      rowLimit: days,
    },
  });
  return (res.data.rows ?? []).map((row) => ({
    date: (row.keys?.[0] ?? "").replace(/-/g, "").slice(4), // "MMDD"
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
  }));
}

export async function getGscTopQueries(days: number) {
  const { client, siteUrl } = createClient();
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: toIsoDate(days),
      endDate: toIsoDate(0),
      dimensions: ["query"],
      rowLimit: 10,
    },
  });
  return (res.data.rows ?? []).map((row) => ({
    query: row.keys?.[0] ?? "",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}

export async function getGscTopPages(days: number) {
  const { client, siteUrl } = createClient();
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: toIsoDate(days),
      endDate: toIsoDate(0),
      dimensions: ["page"],
      rowLimit: 10,
    },
  });
  return (res.data.rows ?? []).map((row) => ({
    page: row.keys?.[0] ?? "",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}

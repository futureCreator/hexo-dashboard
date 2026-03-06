import { NextRequest, NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/settings";
import { hexoPathValid } from "@/lib/hexo";

export async function GET() {
  const settings = loadSettings();
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const hexoPath = String(body.hexoPath || "").trim();

    if (!hexoPath) {
      return NextResponse.json(
        { error: "hexoPath is required" },
        { status: 400 }
      );
    }

    if (!hexoPathValid(hexoPath)) {
      return NextResponse.json(
        {
          error: `Invalid Hexo path: source/_posts directory not found at "${hexoPath}"`,
        },
        { status: 400 }
      );
    }

    const gaPropertyId = String(body.gaPropertyId || "").trim() || undefined;
    const gaServiceAccountPath = String(body.gaServiceAccountPath || "").trim() || undefined;
    const gscSiteUrl = String(body.gscSiteUrl || "").trim() || undefined;

    saveSettings({ hexoPath, gaPropertyId, gaServiceAccountPath, gscSiteUrl });
    return NextResponse.json({ success: true, hexoPath, gaPropertyId, gaServiceAccountPath, gscSiteUrl });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

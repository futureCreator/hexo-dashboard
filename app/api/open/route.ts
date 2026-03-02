import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { loadSettings } from "@/lib/settings";

export async function POST(request: NextRequest) {
  const { filepath } = await request.json();

  if (!filepath || typeof filepath !== "string") {
    return NextResponse.json({ error: "filepath is required" }, { status: 400 });
  }

  // Security: only allow files within the configured hexo path
  const { hexoPath } = loadSettings();
  if (!hexoPath || !filepath.startsWith(hexoPath)) {
    return NextResponse.json(
      { error: "Forbidden: filepath is outside configured hexo directory" },
      { status: 403 }
    );
  }

  const cmd = process.platform === "darwin" ? "open -t" : "xdg-open";

  return new Promise<NextResponse>((resolve) => {
    exec(`${cmd} "${filepath.replace(/"/g, '\\"')}"`, (err) => {
      if (err) {
        resolve(NextResponse.json({ error: err.message }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ success: true }));
      }
    });
  });
}

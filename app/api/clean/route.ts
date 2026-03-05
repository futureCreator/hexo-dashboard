import { exec } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { hexoPathValid } from "@/lib/hexo";

const execAsync = promisify(exec);

export async function POST() {
  const { hexoPath } = loadSettings();

  if (!hexoPath) {
    return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  }

  if (!hexoPathValid(hexoPath)) {
    return NextResponse.json({ error: "Hexo path is invalid" }, { status: 400 });
  }

  try {
    const { stdout, stderr } = await execAsync("hexo clean", {
      cwd: hexoPath,
      timeout: 60_000,
    });

    const output = [stdout, stderr].filter(Boolean).join("\n").trim();
    return NextResponse.json({ success: true, output });
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    const output = [error.stdout, error.stderr, error.message].filter(Boolean).join("\n").trim();
    return NextResponse.json({ success: false, output }, { status: 500 });
  }
}

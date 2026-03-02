import { execFile } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { hexoPathValid } from "@/lib/hexo";

const execFileAsync = promisify(execFile);

export async function POST() {
  const { hexoPath } = loadSettings();

  if (!hexoPath) {
    return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  }

  if (!hexoPathValid(hexoPath)) {
    return NextResponse.json({ error: "Hexo path is invalid" }, { status: 400 });
  }

  const now = new Date();
  const message = `Update: ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  try {
    const { stdout: addOut, stderr: addErr } = await execFileAsync("git", ["add", "."], {
      cwd: hexoPath,
      timeout: 15_000,
    });

    const { stdout: commitOut, stderr: commitErr } = await execFileAsync(
      "git",
      ["commit", "-m", message],
      { cwd: hexoPath, timeout: 15_000 }
    );

    const { stdout: pushOut, stderr: pushErr } = await execFileAsync("git", ["push"], {
      cwd: hexoPath,
      timeout: 30_000,
    });

    const output = [addOut, addErr, commitOut, commitErr, pushOut, pushErr].filter(Boolean).join("\n").trim();
    return NextResponse.json({ success: true, output });
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    const output = [error.stdout, error.stderr, error.message].filter(Boolean).join("\n").trim();
    return NextResponse.json({ success: false, output }, { status: 500 });
  }
}

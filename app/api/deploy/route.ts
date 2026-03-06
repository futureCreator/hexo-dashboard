import { spawn } from "child_process";
import { NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { hexoPathValid } from "@/lib/hexo";

export async function POST() {
  const { hexoPath } = loadSettings();

  if (!hexoPath) {
    return NextResponse.json({ error: "Hexo path not configured" }, { status: 400 });
  }

  if (!hexoPathValid(hexoPath)) {
    return NextResponse.json({ error: "Hexo path is invalid" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const child = spawn("sh", ["-c", "hexo generate && hexo deploy"], {
        cwd: hexoPath,
      });

      const timeout = setTimeout(() => {
        child.kill();
        send({ type: "done", success: false, error: "Timeout after 120s" });
        controller.close();
      }, 120_000);

      child.stdout.on("data", (chunk: Buffer) => {
        chunk.toString().split("\n").forEach((line: string) => {
          if (line.trim()) send({ type: "log", line });
        });
      });

      child.stderr.on("data", (chunk: Buffer) => {
        chunk.toString().split("\n").forEach((line: string) => {
          if (line.trim()) send({ type: "log", line });
        });
      });

      child.on("close", (code: number | null) => {
        clearTimeout(timeout);
        send({ type: "done", success: code === 0, code });
        controller.close();
      });

      child.on("error", (err: Error) => {
        clearTimeout(timeout);
        send({ type: "done", success: false, error: err.message });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

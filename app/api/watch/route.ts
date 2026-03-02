import { NextRequest } from "next/server";
import fs from "fs";
import { loadSettings } from "@/lib/settings";
import { hexoPathValid, getPostsDir, getDraftsDir } from "@/lib/hexo";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const { hexoPath } = loadSettings();

  if (!hexoPath || !hexoPathValid(hexoPath)) {
    return new Response("Hexo path not configured or invalid", { status: 400 });
  }

  const postsDir = getPostsDir(hexoPath);
  const draftsDir = getDraftsDir(hexoPath);

  const encoder = new TextEncoder();
  let watcher1: fs.FSWatcher | null = null;
  let watcher2: fs.FSWatcher | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: string) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${data}\n\n`)
          );
        } catch {
          // Controller already closed
        }
      };

      send("connected", JSON.stringify({ watching: true }));

      // Keep connection alive
      heartbeat = setInterval(() => send("heartbeat", "{}"), 30_000);

      const handleChange = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          send("change", JSON.stringify({ ts: Date.now() }));
        }, 300);
      };

      try {
        watcher1 = fs.watch(postsDir, handleChange);
      } catch {
        // Directory may not be accessible
      }

      try {
        if (fs.existsSync(draftsDir)) {
          watcher2 = fs.watch(draftsDir, handleChange);
        }
      } catch {
        // Directory may not be accessible
      }
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (debounceTimer) clearTimeout(debounceTimer);
      watcher1?.close();
      watcher2?.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

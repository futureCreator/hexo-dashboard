"use client";

import { useEffect } from "react";

function isChunkLoadError(error: Error): boolean {
  const msg = `${error.name} ${error.message}`;
  return (
    msg.includes("ChunkLoadError") ||
    msg.includes("Loading chunk") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module")
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // ponytail: after PM2 redeploy, open tabs keep old chunk hashes → hard reload once
    if (isChunkLoadError(error)) {
      const key = "hexo-chunk-reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 bg-[var(--background)]">
      <p className="text-sm text-[var(--foreground)] text-center">
        화면을 불러오지 못했습니다.
      </p>
      <p className="text-xs text-[var(--muted-foreground)] text-center max-w-sm">
        재배포 직후라면 캐시된 옛 파일일 수 있습니다. 새로고침해 보세요.
      </p>
      <button
        onClick={() => {
          sessionStorage.removeItem("hexo-chunk-reload");
          reset();
          window.location.reload();
        }}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white"
      >
        새로고침
      </button>
    </div>
  );
}

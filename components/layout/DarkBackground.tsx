"use client";

import { useTheme } from "@/components/providers/ThemeProvider";

export function DarkBackground() {
  const { resolvedTheme } = useTheme();

  if (resolvedTheme !== "dark") return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Base radial gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, #0a0a0f 0%, #050506 50%, #020203 100%)",
        }}
      />

      {/* Primary ambient blob — top center */}
      <div
        className="blob-float absolute -top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(94,106,210,0.25) 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "float 10s ease-in-out infinite",
        }}
      />

      {/* Secondary blob — left */}
      <div
        className="blob-float absolute top-1/3 -left-[15%] w-[600px] h-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(120,100,210,0.15) 0%, transparent 70%)",
          filter: "blur(100px)",
          animation: "float-reverse 8s ease-in-out infinite",
        }}
      />

      {/* Tertiary blob — bottom right */}
      <div
        className="blob-float absolute bottom-0 -right-[10%] w-[500px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(94,106,210,0.12) 0%, transparent 70%)",
          filter: "blur(120px)",
          animation: "float 12s ease-in-out infinite 2s",
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}

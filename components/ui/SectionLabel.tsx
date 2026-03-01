interface SectionLabelProps {
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

export default function SectionLabel({
  children,
  pulse = false,
  className = "",
}: SectionLabelProps) {
  return (
    <div
      className={`inline-flex items-center gap-3 rounded-full border border-[rgba(0,82,255,0.3)] bg-[rgba(0,82,255,0.05)] px-5 py-2 ${className}`}
    >
      <span
        className={`h-2 w-2 rounded-full bg-[var(--accent)] ${
          pulse ? "animate-pulse" : ""
        }`}
      />
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--accent)]">
        {children}
      </span>
    </div>
  );
}

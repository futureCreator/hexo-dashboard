interface BadgeProps {
  variant?: "draft" | "published" | "tag" | "category";
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  draft:
    "bg-amber-50 text-amber-700 border border-amber-200",
  published:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  tag:
    "bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]",
  category:
    "bg-[rgba(0,82,255,0.06)] text-[var(--accent)] border border-[rgba(0,82,255,0.2)]",
};

export default function Badge({
  variant = "tag",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full px-2.5 py-0.5
        text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

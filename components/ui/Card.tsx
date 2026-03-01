import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "featured" | "inverted";
  hover?: boolean;
}

export default function Card({
  variant = "default",
  hover = false,
  className = "",
  children,
  ...props
}: CardProps) {
  if (variant === "featured") {
    return (
      <div
        className={`rounded-xl bg-gradient-to-br from-[var(--accent)] via-[var(--accent-secondary)] to-[var(--accent)] p-[2px] ${className}`}
        {...props}
      >
        <div className="h-full w-full rounded-[calc(0.75rem-2px)] bg-[var(--card)] p-6">
          {children}
        </div>
      </div>
    );
  }

  if (variant === "inverted") {
    return (
      <div
        className={`
          rounded-xl bg-[var(--foreground)] text-white p-6 relative overflow-hidden
          ${hover ? "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`
        rounded-xl bg-[var(--card)] border border-[var(--border)] p-6
        shadow-[0_4px_6px_rgba(0,0,0,0.07)]
        ${hover ? "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_15px_rgba(0,0,0,0.08)] hover:bg-gradient-to-br hover:from-[rgba(0,82,255,0.02)] hover:to-transparent" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

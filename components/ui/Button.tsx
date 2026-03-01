"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "solid-danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-[var(--accent)] to-[#4D7CFF] text-white shadow-sm hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(0,82,255,0.25)] hover:brightness-110 active:scale-[0.98]",
  secondary:
    "bg-transparent border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] hover:border-[rgba(0,82,255,0.3)] hover:shadow-sm active:scale-[0.98]",
  ghost:
    "bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] active:scale-[0.98]",
  danger:
    "bg-transparent border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 active:scale-[0.98]",
  "solid-danger":
    "bg-red-600 text-white border border-red-600 hover:bg-red-700 hover:border-red-700 active:scale-[0.98]",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-lg",
  md: "h-11 px-5 text-sm rounded-xl",
  lg: "h-14 px-7 text-base rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", className = "", children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2 font-medium
          transition-all duration-200 cursor-pointer select-none
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;

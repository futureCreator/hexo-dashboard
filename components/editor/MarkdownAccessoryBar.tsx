"use client";

interface MarkdownAccessoryBarProps {
  onInsert: (text: string) => void;
  onDismiss: () => void;
}

const shortcuts = [
  { label: "#", insert: "# " },
  { label: "*", insert: "**" },
  { label: "-", insert: "- " },
  { label: "[]", insert: "[](url)" },
  { label: "`", insert: "`" },
];

export default function MarkdownAccessoryBar({ onInsert, onDismiss }: MarkdownAccessoryBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--card)] border-t border-[var(--border)]">
      <div className="flex gap-3.5">
        {shortcuts.map((s) => (
          <button
            key={s.label}
            onClick={() => onInsert(s.insert)}
            className="text-[16px] font-semibold text-[var(--muted-foreground)] active:text-[var(--foreground)] active:scale-90 transition-all w-8 h-8 flex items-center justify-center"
          >
            {s.label}
          </button>
        ))}
      </div>
      <button onClick={onDismiss} className="p-1">
        <svg className="w-5 h-5 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}

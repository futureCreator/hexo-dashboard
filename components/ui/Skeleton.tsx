export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[var(--muted)] ${className}`}
    />
  );
}

export function PostListSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-[var(--border)]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 px-4 py-3.5">
          {/* Badge column */}
          <div className="pt-0.5 shrink-0 w-[78px] flex justify-end">
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

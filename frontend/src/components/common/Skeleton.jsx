import clsx from 'clsx'

/**
 * Generic shimmer skeleton block.
 */
export function Skeleton({ className = '' }) {
  return (
    <div
      className={clsx('skeleton', className)}
      aria-hidden="true"
    />
  )
}

/**
 * Skeleton for a stat card.
 */
export function StatCardSkeleton() {
  return (
    <div className="card flex items-start gap-4">
      <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  )
}

/**
 * Skeleton for a list row.
 */
export function RowSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

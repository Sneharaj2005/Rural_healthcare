import clsx from 'clsx'

const sizes = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
  xl: 'h-16 w-16 border-4',
}

/**
 * Spinning ring loader.
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} size
 * @param {'primary'|'white'|'gray'} color
 */
export default function LoadingSpinner({ size = 'md', color = 'primary', className = '' }) {
  const colorClasses = {
    primary: 'border-primary-200 border-t-primary-600',
    white:   'border-white/30 border-t-white',
    gray:    'border-gray-200 border-t-gray-500',
  }

  return (
    <div
      className={clsx(
        'animate-spin rounded-full',
        sizes[size],
        colorClasses[color],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

/**
 * Full-page loading overlay.
 */
export function PageLoader({ message = 'Loading…' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-gray-500 animate-pulse">{message}</p>
    </div>
  )
}

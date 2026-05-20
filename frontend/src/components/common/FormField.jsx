import clsx from 'clsx'

/**
 * Reusable labelled input wrapper with inline error display.
 *
 * Props:
 *   label, id, error, touched, icon (left), rightElement, ...inputProps
 */
export default function FormField({
  label,
  id,
  error,
  touched,
  icon: Icon,
  rightElement,
  className = '',
  ...inputProps
}) {
  const invalid = !!(touched && error)

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            className={clsx(
              'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2',
              invalid ? 'text-red-400' : 'text-gray-400'
            )}
          />
        )}
        <input
          id={id}
          className={clsx(
            Icon ? 'pl-10' : '',
            rightElement ? 'pr-10' : '',
            invalid ? 'input-field-error' : 'input-field'
          )}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          {...inputProps}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      {invalid && (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs text-red-600" role="alert">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}

'use client'

export function LocalDate({
  dateStr,
  options,
}: {
  dateStr: string
  options?: Intl.DateTimeFormatOptions
}) {
  const formatted = new Date(dateStr).toLocaleDateString('en-US', options ?? {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return <span>{formatted}</span>
}

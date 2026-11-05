export type DateDisplayFormat = 'localized' | 'iso'

export function formatDateDisplay(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  dateFormat: DateDisplayFormat = typeof document === 'undefined' ? 'localized' : document.body.dataset.dateFormat === 'iso' ? 'iso' : 'localized',
): string {
  if (dateFormat === 'localized') return new Intl.DateTimeFormat('nl-NL', options).format(date)
  const datePart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  if (options.weekday && !options.day) return new Intl.DateTimeFormat('nl-NL', { weekday: options.weekday }).format(date)
  const weekday = options.weekday ? `${new Intl.DateTimeFormat('nl-NL', { weekday: options.weekday }).format(date)} · ` : ''
  const time = options.hour || options.minute
    ? ` ${new Intl.DateTimeFormat('nl-NL', { hour: options.hour ?? '2-digit', minute: options.minute ?? '2-digit', hourCycle: 'h23' }).format(date)}`
    : ''
  if (!options.day && options.month) return options.year ? String(date.getFullYear()) : datePart.slice(0, 7)
  return `${weekday}${datePart}${time}`
}

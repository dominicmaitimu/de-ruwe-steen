import { useEffect, useState } from 'react'

export function useLocalDate(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timeout = 0
    const updateAtMidnight = () => {
      setNow(new Date())
      const current = new Date()
      const nextDay = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1)
      timeout = window.setTimeout(updateAtMidnight, nextDay.getTime() - current.getTime())
    }

    const current = new Date()
    const nextDay = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1)
    timeout = window.setTimeout(updateAtMidnight, nextDay.getTime() - current.getTime())

    return () => window.clearTimeout(timeout)
  }, [])

  return now
}

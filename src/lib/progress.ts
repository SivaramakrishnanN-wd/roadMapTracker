import dayjs from 'dayjs'
import type { Activity, Day, Roadmap } from '@/types'

export type DayStatus = 'complete' | 'partial' | 'missed' | 'today' | 'upcoming'

export function todayLocal(): string {
  return dayjs().format('YYYY-MM-DD')
}

export function overallPercent(
  roadmap: Roadmap,
  completed: Record<string, true>,
): number {
  let totalMinutes = 0
  let doneMinutes = 0

  roadmap.days.forEach((day) => {
    day.activities.forEach((activity) => {
      if (activity.isStretch) return
      totalMinutes += activity.minutes
      if (completed[activity.id]) doneMinutes += activity.minutes
    })
  })

  return totalMinutes === 0 ? 0 : (doneMinutes / totalMinutes) * 100
}

export function percentPerArea(
  roadmap: Roadmap,
  completed: Record<string, true>,
): Record<string, number> {
  const totals: Record<string, { done: number; total: number }> = {}

  roadmap.days.forEach((day) => {
    day.activities.forEach((activity) => {
      if (activity.isStretch) return
      const area = totals[activity.area] ?? { done: 0, total: 0 }
      area.total += activity.minutes
      if (completed[activity.id]) area.done += activity.minutes
      totals[activity.area] = area
    })
  })

  return Object.fromEntries(
    roadmap.areas.map((area) => {
      const value = totals[area]
      return [area, value && value.total > 0 ? (value.done / value.total) * 100 : 0]
    }),
  )
}

export function currentDayNumber(roadmap: Roadmap, today: string): number {
  if (today < roadmap.meta.startDate) return 1
  if (today > roadmap.meta.endDate) return roadmap.meta.totalDays

  return (
    dayjs(today).startOf('day').diff(dayjs(roadmap.meta.startDate).startOf('day'), 'day') + 1
  )
}

export function daysLeft(roadmap: Roadmap, today: string): number | string {
  if (today < roadmap.meta.startDate) {
    return `Starts in ${dayjs(roadmap.meta.startDate).diff(dayjs(today), 'day')} days`
  }
  if (today > roadmap.meta.endDate) return 0

  return dayjs(roadmap.meta.endDate).diff(dayjs(today), 'day') + 1
}

export function dayStatus(
  day: Day,
  completed: Record<string, true>,
  today: string,
): DayStatus {
  const required = day.activities.filter((activity: Activity) => !activity.isStretch)
  if (
    required.length > 0 &&
    required.every((activity) => Boolean(completed[activity.id]))
  ) {
    return 'complete'
  }
  if (day.activities.some((activity) => Boolean(completed[activity.id]))) {
    return 'partial'
  }
  if (day.date < today) return 'missed'
  if (day.date === today) return 'today'
  return 'upcoming'
}

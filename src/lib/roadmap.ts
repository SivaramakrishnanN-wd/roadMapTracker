import roadmapData from '@/data/roadmap.json'
import type { Activity, Day, Roadmap } from '@/types'

export const roadmap = roadmapData as Roadmap

export function getDay(date: string): Day | undefined {
  return roadmap.days.find((day) => day.date === date)
}

export const daysByWeek: Map<number, Day[]> = roadmap.days.reduce(
  (weeks, day) => {
    const week = weeks.get(day.weekNumber)

    if (week) {
      week.push(day)
    } else {
      weeks.set(day.weekNumber, [day])
    }

    return weeks
  },
  new Map<number, Day[]>(),
)

export const activitiesById: Map<string, Activity> = new Map(
  roadmap.days.flatMap((day) =>
    day.activities.map((activity) => [activity.id, activity] as const),
  ),
)

import dayjs from 'dayjs'
import type { Activity, Day, Roadmap } from '@/types'
import type { ProgressState } from '@/store/progress'

export type PlanPhase = 'before' | 'active' | 'ended'
export type PaceStatus = 'ahead' | 'behind' | 'onTrack'
export type DayStatus = 'complete' | 'partial' | 'missed' | 'today' | 'upcoming'

export interface StreakStats {
  current: number
  longest: number
}

export interface AreaStats {
  requiredMinutes: number
  doneMinutes: number
  percent: number
  activitiesDone: number
  activitiesTotal: number
}

export interface WeekStats {
  plannedMinutes: number
  doneMinutes: number
}

export interface CarriedActivity {
  activity: Activity
  fromDate: string
}

export interface RoadmapStats {
  overallPercent: number
  plannedPercentToday: number
  paceDelta: number
  paceStatus: PaceStatus
  phase: PlanPhase
  currentDayNumber: number
  daysLeft: number
  startsInDays: number
  incompletePastDays: number
  streak: StreakStats
  areaStats: Record<string, AreaStats>
  weekStats: Record<number, WeekStats>
  hoursDone: number
  hoursPlanned: number
}

export const HOURS_PLANNED = 255

function isDone(progress: ProgressState, activity: Activity): boolean {
  return Object.hasOwn(progress.completed, activity.id)
}

function requiredActivities(day: Day): Activity[] {
  return day.activities.filter((activity) => !activity.isStretch)
}

function requiredMinutes(roadmap: Roadmap): number {
  return roadmap.days.reduce(
    (total, day) =>
      total +
      requiredActivities(day).reduce(
        (dayTotal, activity) => dayTotal + activity.minutes,
        0,
      ),
    0,
  )
}

function completedRequiredMinutes(
  roadmap: Roadmap,
  progress: ProgressState,
): number {
  return roadmap.days.reduce(
    (total, day) =>
      total +
      requiredActivities(day).reduce(
        (dayTotal, activity) =>
          dayTotal + (isDone(progress, activity) ? activity.minutes : 0),
        0,
      ),
    0,
  )
}

function percentage(done: number, total: number): number {
  return total === 0 ? 0 : (done / total) * 100
}

export function overallPercent(
  roadmap: Roadmap,
  progress: ProgressState,
): number {
  return percentage(
    completedRequiredMinutes(roadmap, progress),
    requiredMinutes(roadmap),
  )
}

export function plannedPercentToday(roadmap: Roadmap, today: string): number {
  const total = requiredMinutes(roadmap)
  const planned = roadmap.days
    .filter((day) => day.date <= today)
    .reduce(
      (sum, day) =>
        sum +
        requiredActivities(day).reduce(
          (daySum, activity) => daySum + activity.minutes,
          0,
        ),
      0,
    )

  return percentage(planned, total)
}

export function paceDelta(
  roadmap: Roadmap,
  progress: ProgressState,
  today: string,
): number {
  return overallPercent(roadmap, progress) - plannedPercentToday(roadmap, today)
}

export function paceStatus(delta: number): PaceStatus {
  if (delta >= 3) {
    return 'ahead'
  }
  if (delta <= -3) {
    return 'behind'
  }
  return 'onTrack'
}

export function phase(roadmap: Roadmap, today: string): PlanPhase {
  if (today < roadmap.meta.startDate) {
    return 'before'
  }
  if (today > roadmap.meta.endDate) {
    return 'ended'
  }
  return 'active'
}

export function currentDayNumber(roadmap: Roadmap, today: string): number {
  const elapsedDays = dayjs(today)
    .startOf('day')
    .diff(dayjs(roadmap.meta.startDate).startOf('day'), 'day')

  return Math.min(Math.max(elapsedDays + 1, 1), roadmap.meta.totalDays)
}

export function daysLeft(roadmap: Roadmap, today: string): number {
  if (phase(roadmap, today) === 'ended') {
    return 0
  }

  return (
    dayjs(roadmap.meta.endDate)
      .startOf('day')
      .diff(dayjs(today).startOf('day'), 'day') + 1
  )
}

export function startsInDays(roadmap: Roadmap, today: string): number {
  if (phase(roadmap, today) !== 'before') {
    return 0
  }

  return dayjs(roadmap.meta.startDate)
    .startOf('day')
    .diff(dayjs(today).startOf('day'), 'day')
}

export function dayStatus(
  day: Day,
  progress: ProgressState,
  today: string,
): DayStatus {
  const required = requiredActivities(day)

  if (
    required.length > 0 &&
    required.every((activity) => isDone(progress, activity))
  ) {
    return 'complete'
  }
  if (day.activities.some((activity) => isDone(progress, activity))) {
    return 'partial'
  }
  if (day.date < today) {
    return 'missed'
  }
  if (day.date === today) {
    return 'today'
  }
  return 'upcoming'
}

export function incompletePastDays(
  roadmap: Roadmap,
  progress: ProgressState,
  today: string,
): number {
  return roadmap.days.filter(
    (day) => day.date < today && dayStatus(day, progress, today) !== 'complete',
  ).length
}

export function streakStats(
  roadmap: Roadmap,
  progress: ProgressState,
  today: string,
): StreakStats {
  const throughToday = roadmap.days.filter((day) => day.date <= today)
  let longest = 0
  let run = 0

  throughToday.forEach((day) => {
    if (dayStatus(day, progress, today) === 'complete') {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 0
    }
  })

  let current = 0
  let cursor = dayjs(today).startOf('day')
  const todayDay = roadmap.days.find((day) => day.date === today)
  if (!todayDay || dayStatus(todayDay, progress, today) !== 'complete') {
    cursor = cursor.subtract(1, 'day')
  }

  while (true) {
    const day = roadmap.days.find(
      (candidate) => candidate.date === cursor.format('YYYY-MM-DD'),
    )
    if (!day || dayStatus(day, progress, today) !== 'complete') {
      break
    }

    current += 1
    cursor = cursor.subtract(1, 'day')
  }

  return { current, longest }
}

export function areaStats(
  roadmap: Roadmap,
  progress: ProgressState,
): Record<string, AreaStats> {
  const stats: Record<string, AreaStats> = Object.fromEntries(
    roadmap.areas.map((area) => [
      area,
      {
        requiredMinutes: 0,
        doneMinutes: 0,
        percent: 0,
        activitiesDone: 0,
        activitiesTotal: 0,
      },
    ]),
  )

  roadmap.days.forEach((day) => {
    requiredActivities(day).forEach((activity) => {
      const stat = stats[activity.area]
      if (!stat) {
        return
      }
      stat.requiredMinutes += activity.minutes
      stat.activitiesTotal += 1
      if (isDone(progress, activity)) {
        stat.doneMinutes += activity.minutes
        stat.activitiesDone += 1
      }
    })
  })

  Object.values(stats).forEach((stat) => {
    stat.percent = percentage(stat.doneMinutes, stat.requiredMinutes)
  })

  return stats
}

export function weekStats(
  roadmap: Roadmap,
  progress: ProgressState,
): Record<number, WeekStats> {
  const stats: Record<number, WeekStats> = {}

  roadmap.days.forEach((day) => {
    const stat = (stats[day.weekNumber] ??= {
      plannedMinutes: 0,
      doneMinutes: 0,
    })

    requiredActivities(day).forEach((activity) => {
      stat.plannedMinutes += activity.minutes
      if (isDone(progress, activity)) {
        stat.doneMinutes += activity.minutes
      }
    })
  })

  return stats
}

export function hoursDone(roadmap: Roadmap, progress: ProgressState): number {
  const completedMinutes = roadmap.days.reduce(
    (total, day) =>
      total +
      day.activities.reduce(
        (dayTotal, activity) =>
          dayTotal + (isDone(progress, activity) ? activity.minutes : 0),
        0,
      ),
    0,
  )

  return completedMinutes / 60
}

export function getCarriedActivities(
  roadmap: Roadmap,
  progress: ProgressState,
  targetDate: string,
): CarriedActivity[] {
  return Object.entries(progress.carried).flatMap(([activityId, date]) => {
    if (date !== targetDate) {
      return []
    }
    const originalDay = roadmap.days.find((day) =>
      day.activities.some((activity) => activity.id === activityId),
    )
    const activity = originalDay?.activities.find(
      (item) => item.id === activityId,
    )

    return activity && originalDay
      ? [{ activity, fromDate: originalDay.date }]
      : []
  })
}

export function calculateStats(
  roadmap: Roadmap,
  progress: ProgressState,
  today: string,
): RoadmapStats {
  const delta = paceDelta(roadmap, progress, today)

  return {
    overallPercent: overallPercent(roadmap, progress),
    plannedPercentToday: plannedPercentToday(roadmap, today),
    paceDelta: delta,
    paceStatus: paceStatus(delta),
    phase: phase(roadmap, today),
    currentDayNumber: currentDayNumber(roadmap, today),
    daysLeft: daysLeft(roadmap, today),
    startsInDays: startsInDays(roadmap, today),
    incompletePastDays: incompletePastDays(roadmap, progress, today),
    streak: streakStats(roadmap, progress, today),
    areaStats: areaStats(roadmap, progress),
    weekStats: weekStats(roadmap, progress),
    hoursDone: hoursDone(roadmap, progress),
    hoursPlanned: HOURS_PLANNED,
  }
}

import { describe, expect, it } from 'vitest'
import type { ProgressState } from '@/store/progress'
import type { Day, Roadmap } from '@/types'
import {
  areaStats,
  calculateStats,
  currentDayNumber,
  dayStatus,
  daysLeft,
  getCarriedActivities,
  hoursDone,
  incompletePastDays,
  overallPercent,
  paceDelta,
  paceStatus,
  phase,
  plannedPercentToday,
  startsInDays,
  streakStats,
  weekStats,
  HOURS_PLANNED,
} from '@/lib/stats'
import { roadmap } from '@/lib/roadmap'

function emptyProgress(): ProgressState {
  return {
    version: 1,
    completed: {},
    notes: {},
    carried: {},
    settings: { theme: 'system' },
  }
}

function completeRequiredDay(progress: ProgressState, day: Day): void {
  day.activities
    .filter((activity) => !activity.isStretch)
    .forEach((activity) => {
      progress.completed[activity.id] = '2026-11-16T08:00:00.000Z'
    })
}

function requiredMinutes(day: Day): number {
  return day.activities
    .filter((activity) => !activity.isStretch)
    .reduce((total, activity) => total + activity.minutes, 0)
}

describe('plan dates and pace', () => {
  it('classifies before, active, and ended phases at the plan boundaries', () => {
    expect(phase(roadmap, '2026-11-15')).toBe('before')
    expect(phase(roadmap, '2026-11-16')).toBe('active')
    expect(phase(roadmap, '2027-01-14')).toBe('active')
    expect(phase(roadmap, '2027-02-13')).toBe('active')
    expect(phase(roadmap, '2027-02-14')).toBe('ended')
  })

  it('clamps the current day number and computes plan countdown values', () => {
    expect(currentDayNumber(roadmap, '2026-11-15')).toBe(1)
    expect(currentDayNumber(roadmap, '2026-11-16')).toBe(1)
    expect(currentDayNumber(roadmap, '2026-12-15')).toBe(30)
    expect(currentDayNumber(roadmap, '2027-02-13')).toBe(90)
    expect(currentDayNumber(roadmap, '2027-02-14')).toBe(90)
    expect(daysLeft(roadmap, '2026-11-16')).toBe(90)
    expect(daysLeft(roadmap, '2026-11-15')).toBe(91)
    expect(daysLeft(roadmap, '2027-02-13')).toBe(1)
    expect(daysLeft(roadmap, '2027-02-14')).toBe(0)
    expect(startsInDays(roadmap, '2026-11-15')).toBe(1)
    expect(startsInDays(roadmap, '2026-11-16')).toBe(0)
  })

  it('calculates required overall and planned percentages on fixed dates', () => {
    const progress = emptyProgress()
    completeRequiredDay(progress, roadmap.days[0])

    expect(overallPercent(roadmap, progress)).toBeCloseTo(
      (requiredMinutes(roadmap.days[0]) /
        roadmap.days.reduce((total, day) => total + requiredMinutes(day), 0)) *
        100,
    )
    expect(plannedPercentToday(roadmap, '2026-11-15')).toBe(0)
    expect(plannedPercentToday(roadmap, '2026-11-16')).toBeCloseTo(
      (requiredMinutes(roadmap.days[0]) /
        roadmap.days.reduce((total, day) => total + requiredMinutes(day), 0)) *
        100,
    )
    expect(plannedPercentToday(roadmap, '2027-02-14')).toBe(100)
    expect(paceDelta(roadmap, progress, '2026-11-16')).toBeCloseTo(0)
  })

  it('maps pace deltas to status using the inclusive three-point thresholds', () => {
    expect(paceStatus(3)).toBe('ahead')
    expect(paceStatus(2.99)).toBe('onTrack')
    expect(paceStatus(-2.99)).toBe('onTrack')
    expect(paceStatus(-3)).toBe('behind')
  })
})

describe('day statuses, streaks, and incomplete days', () => {
  it('classifies complete, partial, missed, today, and upcoming days', () => {
    const progress = emptyProgress()
    const [first, second, third, fourth, fifth] = roadmap.days
    completeRequiredDay(progress, first)
    progress.completed[second.activities[0].id] = '2026-11-17T08:00:00.000Z'

    expect(dayStatus(first, progress, third.date)).toBe('complete')
    expect(dayStatus(second, progress, third.date)).toBe('partial')
    expect(dayStatus(third, progress, third.date)).toBe('today')
    expect(dayStatus(fourth, progress, third.date)).toBe('upcoming')
    expect(dayStatus(fifth, emptyProgress(), third.date)).toBe('upcoming')
    expect(dayStatus(second, emptyProgress(), third.date)).toBe('missed')
  })

  it('counts incomplete past days and excludes the current day', () => {
    const progress = emptyProgress()
    completeRequiredDay(progress, roadmap.days[0])
    progress.completed[roadmap.days[1].activities[0].id] =
      '2026-11-17T08:00:00.000Z'
    completeRequiredDay(progress, roadmap.days[2])

    expect(incompletePastDays(roadmap, progress, roadmap.days[3].date)).toBe(1)
  })

  it('counts current streak from today when complete, otherwise from yesterday', () => {
    const progress = emptyProgress()
    completeRequiredDay(progress, roadmap.days[0])
    completeRequiredDay(progress, roadmap.days[1])
    completeRequiredDay(progress, roadmap.days[2])

    expect(streakStats(roadmap, progress, roadmap.days[2].date)).toEqual({
      current: 3,
      longest: 3,
    })
    expect(streakStats(roadmap, progress, roadmap.days[3].date)).toEqual({
      current: 3,
      longest: 3,
    })
  })

  it('breaks a streak at a gap and calculates the longest completed run', () => {
    const progress = emptyProgress()
    completeRequiredDay(progress, roadmap.days[0])
    completeRequiredDay(progress, roadmap.days[1])
    completeRequiredDay(progress, roadmap.days[3])
    completeRequiredDay(progress, roadmap.days[4])

    expect(streakStats(roadmap, progress, roadmap.days[4].date)).toEqual({
      current: 2,
      longest: 2,
    })
    expect(streakStats(roadmap, progress, roadmap.days[5].date)).toEqual({
      current: 2,
      longest: 2,
    })
  })

  it('only carries the streak across an immediately adjacent day after the plan', () => {
    const progress = emptyProgress()
    completeRequiredDay(progress, roadmap.days[89])

    expect(streakStats(roadmap, progress, '2027-02-14')).toEqual({
      current: 1,
      longest: 1,
    })
    expect(streakStats(roadmap, progress, '2027-02-15')).toEqual({
      current: 0,
      longest: 1,
    })
  })
})

describe('area, week, hours, and carry-forward stats', () => {
  it('excludes stretch activities from required percentages and area counts', () => {
    const progress = emptyProgress()
    const stretchDay = roadmap.days.find((day) =>
      day.activities.some((activity) => activity.isStretch),
    )
    const stretchActivity = stretchDay?.activities.find(
      (activity) => activity.isStretch,
    )

    expect(stretchDay).toBeDefined()
    expect(stretchActivity).toBeDefined()
    if (!stretchDay || !stretchActivity) {
      throw new Error('Expected the roadmap to include a stretch activity')
    }

    progress.completed[stretchActivity.id] = '2026-11-16T08:00:00.000Z'

    expect(overallPercent(roadmap, progress)).toBe(0)
    expect(
      areaStats(roadmap, progress)[stretchActivity.area].activitiesDone,
    ).toBe(0)
    expect(hoursDone(roadmap, progress)).toBe(stretchActivity.minutes / 60)
  })

  it('reports required minutes and activity counts by area and week', () => {
    const progress = emptyProgress()
    const day = roadmap.days[0]
    completeRequiredDay(progress, day)
    const mainArea = day.activities.find(
      (activity) => !activity.isStretch,
    )?.area

    expect(mainArea).toBeDefined()
    if (!mainArea) {
      throw new Error('Expected a required activity on the first day')
    }

    const area = areaStats(roadmap, progress)[mainArea]
    expect(area.doneMinutes).toBe(
      day.activities
        .filter((activity) => !activity.isStretch && activity.area === mainArea)
        .reduce((total, activity) => total + activity.minutes, 0),
    )
    expect(area.activitiesDone).toBe(
      day.activities.filter(
        (activity) => !activity.isStretch && activity.area === mainArea,
      ).length,
    )
    expect(area.activitiesTotal).toBeGreaterThanOrEqual(area.activitiesDone)

    const week = weekStats(roadmap, progress)[day.weekNumber]
    expect(week.doneMinutes).toBe(requiredMinutes(day))
    expect(week.plannedMinutes).toBeGreaterThanOrEqual(week.doneMinutes)
    expect(HOURS_PLANNED).toBe(255)
    expect(calculateStats(roadmap, progress, day.date).hoursPlanned).toBe(255)
  })

  it('keeps carried activities attributed to their original day and area', () => {
    const progress = emptyProgress()
    const originalDay = roadmap.days[0]
    const targetDay = roadmap.days[1]
    const required = originalDay.activities.find(
      (activity) => !activity.isStretch,
    )

    expect(required).toBeDefined()
    if (!required) {
      throw new Error('Expected a required activity on the first day')
    }

    progress.completed[required.id] = '2026-11-16T08:00:00.000Z'
    progress.carried[required.id] = targetDay.date

    const carried = getCarriedActivities(roadmap, progress, targetDay.date)
    expect(carried).toEqual([
      { activity: required, fromDate: originalDay.date },
    ])
    expect(getCarriedActivities(roadmap, progress, originalDay.date)).toEqual(
      [],
    )
    expect(dayStatus(originalDay, progress, targetDay.date)).toBe('partial')
    expect(areaStats(roadmap, progress)[required.area].doneMinutes).toBe(
      required.minutes,
    )
  })
})

describe('stats input contracts', () => {
  it('can calculate stats for a typed minimal roadmap', () => {
    const minimalRoadmap: Roadmap = {
      meta: {
        ...roadmap.meta,
        startDate: '2026-11-16',
        endDate: '2026-11-16',
        totalDays: 1,
      },
      areas: ['JavaScript'],
      days: [
        {
          ...roadmap.days[0],
          dayNumber: 1,
          date: '2026-11-16',
          weekNumber: 1,
          plannedHours: 2,
          area: 'JavaScript',
          activities: [
            {
              ...roadmap.days[0].activities[0],
              id: 'test-required',
              area: 'JavaScript',
              minutes: 120,
              isStretch: false,
            },
          ],
        },
      ],
    }
    const progress = emptyProgress()
    progress.completed['test-required'] = '2026-11-16T08:00:00.000Z'

    expect(
      calculateStats(minimalRoadmap, progress, '2026-11-16'),
    ).toMatchObject({
      overallPercent: 100,
      plannedPercentToday: 100,
      phase: 'active',
      currentDayNumber: 1,
      daysLeft: 1,
      streak: { current: 1, longest: 1 },
    })
  })
})

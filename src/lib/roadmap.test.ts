import { describe, expect, it } from 'vitest'
import { activitiesById, daysByWeek, getDay, roadmap } from '@/lib/roadmap'
import { validateRoadmap } from '@/lib/roadmap-validation'

describe('roadmap data', () => {
  it('passes all seed-data validation checks', () => {
    expect(validateRoadmap(roadmap)).toEqual([])
  })

  it('provides date, week, and activity lookups', () => {
    const firstDay = roadmap.days[0]
    const firstActivity = firstDay.activities[0]

    expect(firstDay).toBeDefined()
    expect(firstActivity).toBeDefined()
    expect(getDay(firstDay.date)).toBe(firstDay)
    expect(daysByWeek.get(firstDay.weekNumber)).toContain(firstDay)
    expect(activitiesById.get(firstActivity.id)).toBe(firstActivity)
  })
})

describe('validateRoadmap', () => {
  it('rejects a plan without 90 days', () => {
    const invalidRoadmap = structuredClone(roadmap)
    invalidRoadmap.days.pop()

    expect(validateRoadmap(invalidRoadmap)).toContainEqual(
      expect.stringContaining('Expected 90 days'),
    )
  })

  it('rejects non-consecutive dates and day numbers', () => {
    const invalidRoadmap = structuredClone(roadmap)
    invalidRoadmap.days[1].date = '2026-11-19'
    invalidRoadmap.days[1].dayNumber = 4

    const errors = validateRoadmap(invalidRoadmap)

    expect(errors).toContainEqual(
      expect.stringContaining('expected 2026-11-17'),
    )
    expect(errors).toContainEqual(expect.stringContaining('expected 2'))
  })

  it('rejects duplicate activity ids', () => {
    const invalidRoadmap = structuredClone(roadmap)
    invalidRoadmap.days[1].activities[0].id =
      invalidRoadmap.days[0].activities[0].id

    expect(validateRoadmap(invalidRoadmap)).toContainEqual(
      expect.stringContaining('Duplicate activity id'),
    )
  })

  it('rejects activity minute totals that differ from planned time', () => {
    const invalidRoadmap = structuredClone(roadmap)
    invalidRoadmap.days[0].activities[0].minutes += 1

    expect(validateRoadmap(invalidRoadmap)).toContainEqual(
      expect.stringContaining('has 121 activity minutes; expected 120'),
    )
  })

  it('rejects activity areas missing from the roadmap area list', () => {
    const invalidRoadmap = structuredClone(roadmap)
    invalidRoadmap.days[0].activities[0].area = 'Unknown area'

    expect(validateRoadmap(invalidRoadmap)).toContainEqual(
      expect.stringContaining('references unknown area'),
    )
  })
})

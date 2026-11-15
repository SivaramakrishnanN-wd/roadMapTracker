import dayjs from 'dayjs'
import type { Roadmap } from '@/types'

export function validateRoadmap(data: Roadmap): string[] {
  const errors: string[] = []

  if (data.days.length !== 90 || data.meta.totalDays !== 90) {
    errors.push(
      `Expected 90 days (found ${data.days.length} records and meta.totalDays=${data.meta.totalDays}).`,
    )
  }

  const startDate = dayjs(data.meta.startDate)

  if (!startDate.isValid()) {
    errors.push(`Invalid start date: ${data.meta.startDate}.`)
  } else {
    data.days.forEach((day, index) => {
      const expectedDate = startDate.add(index, 'day').format('YYYY-MM-DD')

      if (day.date !== expectedDate) {
        errors.push(
          `Day record ${index + 1} has date ${day.date}; expected ${expectedDate}.`,
        )
      }

      if (day.dayNumber !== index + 1) {
        errors.push(
          `Date ${day.date} has dayNumber ${day.dayNumber}; expected ${index + 1}.`,
        )
      }
    })
  }

  const activityIds = new Set<string>()
  const areas = new Set(data.areas)

  data.days.forEach((day) => {
    const totalMinutes = day.activities.reduce((total, activity) => {
      if (activityIds.has(activity.id)) {
        errors.push(`Duplicate activity id: ${activity.id}.`)
      } else {
        activityIds.add(activity.id)
      }

      if (!areas.has(activity.area)) {
        errors.push(
          `Activity ${activity.id} references unknown area "${activity.area}".`,
        )
      }

      return total + activity.minutes
    }, 0)

    const expectedMinutes = day.plannedHours * 60

    if (totalMinutes !== expectedMinutes) {
      errors.push(
        `Day ${day.dayNumber} has ${totalMinutes} activity minutes; expected ${expectedMinutes}.`,
      )
    }
  })

  return errors
}

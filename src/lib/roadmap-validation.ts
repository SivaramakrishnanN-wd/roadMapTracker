import dayjs from 'dayjs'
import type { Roadmap } from '@/types'

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    dayjs(value).isValid() &&
    dayjs(value).format('YYYY-MM-DD') === value
}

export function validateRoadmap(data: Roadmap): string[] {
  const errors: string[] = []

  if (!Number.isInteger(data.meta.totalDays) || data.meta.totalDays <= 0) {
    errors.push(`meta.totalDays must be a positive integer (found ${data.meta.totalDays}).`)
  }
  if (!Number.isFinite(data.meta.weekdayHours) || data.meta.weekdayHours <= 0) {
    errors.push(`meta.weekdayHours must be a positive number (found ${data.meta.weekdayHours}).`)
  }
  if (!Number.isFinite(data.meta.weekendHours) || data.meta.weekendHours <= 0) {
    errors.push(`meta.weekendHours must be a positive number (found ${data.meta.weekendHours}).`)
  }
  if (data.days.length !== data.meta.totalDays) {
    errors.push(
      `Expected ${data.meta.totalDays} day records (found ${data.days.length}).`,
    )
  }

  if (!isValidDate(data.meta.startDate)) {
    errors.push(`Invalid start date: ${data.meta.startDate}.`)
  }
  if (!isValidDate(data.meta.endDate)) {
    errors.push(`Invalid end date: ${data.meta.endDate}.`)
  }
  if (!isValidDate(data.meta.trackingStartDate)) {
    errors.push(`Invalid tracking start date: ${data.meta.trackingStartDate}.`)
  }
  if (
    Number.isFinite(data.meta.totalDays) &&
    data.meta.totalDays > 0 &&
    isValidDate(data.meta.startDate)
  ) {
    const startDate = dayjs(data.meta.startDate)
    const expectedEnd = startDate
      .add(data.meta.totalDays - 1, 'day')
      .format('YYYY-MM-DD')
    if (data.meta.endDate !== expectedEnd) {
      errors.push(
        `End date ${data.meta.endDate} does not match ${data.meta.totalDays} days from start date; expected ${expectedEnd}.`,
      )
    }

    if (
      isValidDate(data.meta.trackingStartDate) &&
      data.meta.trackingStartDate > data.meta.endDate
    ) {
      errors.push(
        `Tracking start date ${data.meta.trackingStartDate} is after the plan end date.`,
      )
    }

    data.days.forEach((day, index) => {
      const expectedDate = startDate.add(index, 'day').format('YYYY-MM-DD')

      if (!isValidDate(day.date)) {
        errors.push(`Day record ${index + 1} has invalid date ${day.date}.`)
      }
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
      const expectedWeekday = startDate.add(index, 'day').format('dddd')
      if (day.weekday !== expectedWeekday) {
        errors.push(
          `Date ${day.date} has weekday "${day.weekday}"; expected "${expectedWeekday}".`,
        )
      }

      const expectedHours =
        dayjs(expectedDate).day() === 0 || dayjs(expectedDate).day() === 6
          ? data.meta.weekendHours
          : data.meta.weekdayHours
      if (day.plannedHours !== expectedHours) {
        errors.push(
          `Day ${day.dayNumber} has plannedHours ${day.plannedHours}; expected ${expectedHours} for ${expectedWeekday}.`,
        )
      }
    })
  }

  const activityIds = new Set<string>()
  const areas = new Set(data.areas)

  data.days.forEach((day) => {
    const totalMinutes = day.activities.reduce((total, activity) => {
      if (!activity.id) {
        errors.push(`Day ${day.dayNumber} has an activity with an empty id.`)
      } else if (activityIds.has(activity.id)) {
        errors.push(`Duplicate activity id: ${activity.id}.`)
      } else {
        activityIds.add(activity.id)
      }

      if (!Number.isInteger(activity.minutes) || activity.minutes <= 0) {
        errors.push(
          `Activity ${activity.id || '(missing id)'} has invalid minutes ${activity.minutes}; expected a positive integer.`,
        )
      }
      if (!areas.has(activity.area)) {
        errors.push(
          `Activity ${activity.id} references unknown area "${activity.area}".`,
        )
      }

      return total + activity.minutes
    }, 0)

    const expectedMinutes = day.plannedHours * 60

    if (Number.isFinite(expectedMinutes) && totalMinutes !== expectedMinutes) {
      errors.push(
        `Day ${day.dayNumber} has ${totalMinutes} activity minutes; expected ${expectedMinutes}.`,
      )
    }

    if (!areas.has(day.area)) {
      errors.push(`Day ${day.dayNumber} references unknown area "${day.area}".`)
    }
  })

  return errors
}

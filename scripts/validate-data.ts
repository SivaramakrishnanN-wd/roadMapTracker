import { roadmap } from '../src/lib/roadmap'
import { validateRoadmap } from '../src/lib/roadmap-validation'

const errors = validateRoadmap(roadmap)

if (errors.length > 0) {
  console.error(`Roadmap data validation failed:\n- ${errors.join('\n- ')}`)
  process.exitCode = 1
} else {
  const activityCount = roadmap.days.reduce(
    (total, day) => total + day.activities.length,
    0,
  )

  console.log(
    `Roadmap data valid: ${roadmap.days.length} days, ${roadmap.areas.length} areas, ${activityCount} activities.`,
  )
}

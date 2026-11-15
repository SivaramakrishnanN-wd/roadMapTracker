export interface Roadmap {
  meta: Meta
  areas: string[]
  days: Day[]
}

export interface Meta {
  name: string
  startDate: string
  endDate: string
  totalDays: number
  weekdayHours: number
  weekendHours: number
  version: string
}

export interface Day {
  dayNumber: number
  date: string
  weekday: string
  weekNumber: number
  plannedHours: number
  topic: string
  area: string
  isStretchDay: boolean
  expectedOutcome: string
  milestone: string | null
  activities: Activity[]
}

export interface Activity {
  id: string
  type: 'learn' | 'code' | 'project' | 'dsa' | 'fsd' | 'revise'
  label: string
  details: string
  minutes: number
  area: string
  isStretch: boolean
}

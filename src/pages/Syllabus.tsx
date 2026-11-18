import { Checkbox, Collapse, Progress, Segmented } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { roadmap } from '@/lib/roadmap'
import type { Activity, Day } from '@/types'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleActivity } from '@/store/progress'

type Filter = 'All' | 'Pending' | 'Done'

function Syllabus() {
  const [filter, setFilter] = useState<Filter>('All')
  const dispatch = useAppDispatch()
  const completed = useAppSelector((state) => state.progress.completed)

  const items = roadmap.areas.map((area) => {
    const areaDays = roadmap.days
      .map((day) => ({
        day,
        activities: day.activities.filter((activity) => activity.area === area),
      }))
      .filter(({ activities }) => activities.length > 0)

    const allActivities = areaDays.flatMap(({ activities }) => activities)
    const doneCount = allActivities.filter((activity) => completed[activity.id]).length
    const percent = allActivities.length
      ? Math.round((doneCount / allActivities.length) * 100)
      : 0

    const matchesFilter = (activity: Activity) => {
      if (filter === 'Done') return Boolean(completed[activity.id])
      if (filter === 'Pending') return !completed[activity.id]
      return true
    }

    return {
      key: area,
      label: (
        <div className="area-panel-heading">
          <div>
            <strong>{area}</strong>
            <span>{doneCount} of {allActivities.length} done</span>
          </div>
          <Progress percent={percent} size="small" />
        </div>
      ),
      children: (
        <div className="area-content">
          {areaDays.map(({ day, activities }: { day: Day; activities: Activity[] }) => {
            const visible = activities.filter(matchesFilter)
            if (visible.length === 0) return null
            return (
              <div className="date-group" key={day.date}>
                <Link className="date-heading" to={`/daily/${day.date}`}>
                  Day {day.dayNumber} · {day.date}
                </Link>
                {visible.map((activity) => (
                  <label className="syllabus-row" key={activity.id}>
                    <Checkbox
                      checked={Boolean(completed[activity.id])}
                      onChange={() => dispatch(toggleActivity(activity.id))}
                      aria-label={`Mark ${activity.label} done`}
                    />
                    <span>
                      <strong>{activity.label}</strong>
                      <small>{activity.details}</small>
                    </span>
                    <span className="syllabus-minutes">{activity.minutes} min</span>
                  </label>
                ))}
              </div>
            )
          })}
        </div>
      ),
    }
  })

  return (
    <section className="syllabus-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">90-day plan</span>
          <h1>Syllabus</h1>
        </div>
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value as Filter)}
          options={['All', 'Pending', 'Done']}
          aria-label="Filter syllabus"
        />
      </div>
      <Collapse accordion={false} items={items} bordered={false} className="syllabus-collapse" />
    </section>
  )
}

export default Syllabus

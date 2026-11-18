import { Button, Checkbox, DatePicker, Progress, Tag } from 'antd'
import dayjs from 'dayjs'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { roadmap } from '@/lib/roadmap'
import { todayLocal } from '@/lib/progress'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setDayDone, toggleActivity } from '@/store/progress'
import {
  isWeekend,
  plannedHoursForDate,
  selectBacklogSummary,
  selectOverdueActivities,
} from '@/lib/progress'

function clampDate(date: string): string {
  if (date < roadmap.meta.startDate) return roadmap.meta.startDate
  if (date > roadmap.meta.endDate) return roadmap.meta.endDate
  return date
}

function Daily() {
  const { date } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const completed = useAppSelector((state) => state.progress.completed)
  const today = todayLocal()
  const backlog = selectOverdueActivities(today, completed)
  const backlogSummary = selectBacklogSummary(today, completed)

  if (!date) {
    return <Navigate replace to={`/daily/${clampDate(todayLocal())}${location.search}`} />
  }

  const day = roadmap.days.find((item) => item.date === date)
  if (!day) {
    return (
      <section className="page-card outside-plan">
        <h1>Date outside the roadmap</h1>
        <p>Choose a date from {roadmap.meta.startDate} to {roadmap.meta.endDate}.</p>
        <Button type="primary" onClick={() => navigate(`/daily/${clampDate(todayLocal())}`)}>
          Open today
        </Button>
      </section>
    )
  }

  const index = roadmap.days.findIndex((item) => item.date === date)
  const required = day.activities.filter((activity) => !activity.isStretch)
  const doneRequired = required.filter((activity) => completed[activity.id]).length
  const progressPercent = required.length
    ? Math.round((doneRequired / required.length) * 100)
    : 0
  const viewingToday = date === today
  const weekend = isWeekend(day.date)

  const goToDate = (nextDate: string) => navigate(`/daily/${nextDate}`)

  return (
    <section className="daily-page">
      <div className="daily-toolbar">
        <Button disabled={index === 0} onClick={() => goToDate(roadmap.days[index - 1].date)}>
          Previous
        </Button>
        <DatePicker
          value={dayjs(day.date)}
          allowClear={false}
          disabledDate={(value) =>
            value.format('YYYY-MM-DD') < roadmap.meta.startDate ||
            value.format('YYYY-MM-DD') > roadmap.meta.endDate
          }
          onChange={(value) => value && goToDate(value.format('YYYY-MM-DD'))}
          aria-label="Choose a roadmap date"
        />
        <Button onClick={() => goToDate(clampDate(todayLocal()))}>Today</Button>
        <Button disabled={index === roadmap.days.length - 1} onClick={() => goToDate(roadmap.days[index + 1].date)}>
          Next
        </Button>
      </div>

      <div className="day-card">
        <div className="day-heading">
          <div>
            <span className="eyebrow">Day {day.dayNumber} · {day.weekday}</span>
            <h1>{viewingToday ? "Today's plan" : day.topic}</h1>
            {viewingToday && <p className="today-topic">{day.topic}</p>}
          </div>
          <Tag color="blue">{day.area}</Tag>
        </div>
        <p className="expected-outcome"><strong>Expected outcome:</strong> {day.expectedOutcome}</p>
        <p className="planned-hours">
          Planned hours: <strong>{plannedHoursForDate(day.date)} h</strong>
          {viewingToday && weekend && (
            <span> · Carried over: {backlogSummary.totalHours.toFixed(1)} h</span>
          )}
        </p>
        <div className="day-progress">
          <span>{doneRequired} of {required.length} required items</span>
          <Progress percent={progressPercent} />
        </div>
        <div className="day-actions">
          <Button type="primary" onClick={() => dispatch(setDayDone({ date: day.date, done: true }))}>
            Mark all done
          </Button>
          <Button onClick={() => dispatch(setDayDone({ date: day.date, done: false }))}>
            Clear all
          </Button>
        </div>
      </div>

      <div className="activity-list">
        {day.activities.map((activity) => (
          <label className="activity-row" key={activity.id}>
            <Checkbox
              checked={Boolean(completed[activity.id])}
              onChange={() => dispatch(toggleActivity(activity.id))}
              aria-label={`Mark ${activity.label} done`}
            />
            <span className="activity-copy">
              <span className="activity-name">
                {activity.label}
                {activity.isStretch && <Tag color="gold">Stretch</Tag>}
              </span>
              <span className="activity-details">{activity.details}</span>
              <Link className="activity-area" to={`/syllabus#${encodeURIComponent(activity.area)}`}>
                {activity.area}
              </Link>
            </span>
            <span className="activity-minutes">{activity.minutes} min</span>
          </label>
        ))}
      </div>
      {viewingToday && (
        <section className="backlog-section">
          <div className="backlog-summary">
            <h2>Carried over</h2>
            <span>
              Carried over: {backlogSummary.itemCount} items, {backlogSummary.totalHours.toFixed(1)} h
            </span>
          </div>
          {weekend ? (
            <div className="activity-list backlog-list">
              {backlog.length === 0 ? (
                <p className="empty-backlog">No overdue activities.</p>
              ) : (
                backlog.map(({ activity, originalDate }) => (
                  <label className="activity-row" key={activity.id}>
                    <Checkbox
                      checked={Boolean(completed[activity.id])}
                      onChange={() => dispatch(toggleActivity(activity.id))}
                      aria-label={`Complete carried over activity ${activity.label}`}
                    />
                    <span className="activity-copy">
                      <span className="activity-name">{activity.label}</span>
                      <span className="activity-details">From {originalDate}</span>
                    </span>
                    <span className="activity-minutes">{activity.minutes} min</span>
                  </label>
                ))
              )}
            </div>
          ) : (
            <details className="backlog-details">
              <summary>Suggested for the weekend</summary>
              <div className="activity-list backlog-list">
                {backlog.length === 0 ? (
                  <p className="empty-backlog">No overdue activities.</p>
                ) : (
                  backlog.map(({ activity, originalDate }) => (
                    <label className="activity-row" key={activity.id}>
                      <Checkbox
                        checked={Boolean(completed[activity.id])}
                        onChange={() => dispatch(toggleActivity(activity.id))}
                        aria-label={`Complete carried over activity ${activity.label}`}
                      />
                      <span className="activity-copy">
                        <span className="activity-name">{activity.label}</span>
                        <span className="activity-details">From {originalDate}</span>
                      </span>
                      <span className="activity-minutes">{activity.minutes} min</span>
                    </label>
                  ))
                )}
              </div>
            </details>
          )}
        </section>
      )}
    </section>
  )
}

export default Daily

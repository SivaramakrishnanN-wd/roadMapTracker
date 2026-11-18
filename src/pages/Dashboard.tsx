import { Button, Progress } from 'antd'
import { Link } from 'react-router-dom'
import { roadmap } from '@/lib/roadmap'
import {
  currentDayNumber,
  daysLeft,
  overallPercent,
  percentPerArea,
  todayLocal,
} from '@/lib/progress'
import { useAppSelector } from '@/store/hooks'

function clampDate(date: string): string {
  if (date < roadmap.meta.startDate) return roadmap.meta.startDate
  if (date > roadmap.meta.endDate) return roadmap.meta.endDate
  return date
}

function Dashboard() {
  const completed = useAppSelector((state) => state.progress.completed)
  const today = todayLocal()
  const todayDate = clampDate(today)
  const todayDay = roadmap.days.find((day) => day.date === todayDate)
  const overall = overallPercent(roadmap, completed)
  const areaPercent = percentPerArea(roadmap, completed)

  const allActivities = roadmap.days.flatMap((day) => day.activities)
  const requiredActivities = allActivities.filter((activity) => !activity.isStretch)
  const doneRequired = requiredActivities.filter((activity) => completed[activity.id]).length
  const remainingRequired = requiredActivities.length - doneRequired

  const doneMinutes = allActivities.reduce(
    (total, activity) => total + (completed[activity.id] ? activity.minutes : 0),
    0,
  )
  const hoursDone = doneMinutes / 60

  const todayActivities = todayDay?.activities ?? []
  const todayRequired = todayActivities.filter((activity) => !activity.isStretch)
  const todayDone = todayRequired.filter((activity) => completed[activity.id]).length
  const todayPercent = todayRequired.length
    ? Math.round((todayDone / todayRequired.length) * 100)
    : 0

  const left = daysLeft(roadmap, today)

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div className="completion-ring">
          <Progress
            type="circle"
            percent={Math.round(overall)}
            size={180}
            format={(percent) => <span><strong>{percent}%</strong><small>complete</small></span>}
          />
        </div>
        <div className="hero-copy">
          <span className="eyebrow">Roadmap progress</span>
          <h1>
            {today < roadmap.meta.startDate
              ? left
              : today > roadmap.meta.endDate
                ? 'Plan complete'
                : `Day ${currentDayNumber(roadmap, today)} of ${roadmap.meta.totalDays}`}
          </h1>
          <p>{typeof left === 'number' ? `${left} days left in the plan` : left}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <span className="eyebrow">Items</span>
          <strong className="metric">{doneRequired} done</strong>
          <p>{remainingRequired} required items remaining</p>
        </article>
        <article className="dashboard-card">
          <span className="eyebrow">Hours</span>
          <strong className="metric">{hoursDone.toFixed(1)} h</strong>
          <p>of 255 planned hours</p>
        </article>
      </div>

      <article className="dashboard-card today-card">
        <div>
          <span className="eyebrow">Today · Day {todayDay?.dayNumber ?? currentDayNumber(roadmap, today)}</span>
          <h2>{todayDay?.topic ?? 'Plan date not active'}</h2>
          <p>{todayDone} of {todayRequired.length} required items done</p>
        </div>
        <div className="today-progress">
          <Progress percent={todayPercent} />
          <Link to={`/daily/${todayDate}`}>
            <Button type="primary">Open today</Button>
          </Link>
        </div>
      </article>

      <article className="dashboard-card area-card">
        <span className="eyebrow">Percent by area</span>
        <div className="area-bars">
          {roadmap.areas.map((area) => (
            <div className="area-bar" key={area}>
              <div>
                <strong>{area}</strong>
                <span>{Math.round(areaPercent[area])}%</span>
              </div>
              <Progress percent={Math.round(areaPercent[area])} showInfo={false} />
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}

export default Dashboard

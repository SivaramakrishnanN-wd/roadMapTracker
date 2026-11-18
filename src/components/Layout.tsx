import {
  BookOutlined,
  CalendarOutlined,
  HomeOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Drawer,
  Input,
  Modal,
  Select,
  Tooltip,
  message,
} from 'antd'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  importProgress,
  PROGRESS_STORAGE_KEY,
  resetProgress,
  setTheme,
  type ProgressState,
  type ThemePreference,
} from '@/store/progress'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { activitiesById, roadmap } from '@/lib/roadmap'
import { currentDayNumber, daysLeft, todayLocal } from '@/lib/progress'
import { useFirebaseSync } from '@/contexts/FirebaseContext'

const navigation = [
  { to: '/', label: 'Dashboard', icon: <HomeOutlined /> },
  { to: '/daily', label: 'Daily', icon: <CalendarOutlined /> },
  { to: '/syllabus', label: 'Syllabus', icon: <BookOutlined /> },
]

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

function NavigationLinks() {
  return (
    <>
      {navigation.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          {icon}
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  )
}

function SettingsPanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const preference = useAppSelector((state) => state.progress.theme)
  const progress = useAppSelector((state) => state.progress)
  const dispatch = useAppDispatch()
  const [importCandidate, setImportCandidate] = useState<ProgressState | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const {
    user,
    authLoading,
    syncStatus,
    syncError,
    signUp,
    signIn,
    logOut,
    retrySync,
  } = useFirebaseSync()

  const authenticate = async (action: 'signIn' | 'signUp') => {
    setAuthError(null)
    try {
      if (action === 'signIn') await signIn(email, password)
      else await signUp(email, password)
      setPassword('')
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Authentication failed.',
      )
    }
  }

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `roadmaptrack-progress-${todayLocal()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const readImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<ProgressState>
      if (
        !parsed.completed ||
        typeof parsed.completed !== 'object' ||
        (parsed.theme !== 'light' && parsed.theme !== 'dark' && parsed.theme !== 'system')
      ) {
        throw new Error('Invalid progress file')
      }

      const completed: Record<string, true> = {}
      Object.entries(parsed.completed).forEach(([id, value]) => {
        if (value === true && activitiesById.has(id)) completed[id] = true
      })

      setImportCandidate({ completed, theme: parsed.theme })
    } catch {
      message.error('Could not import this progress file.')
    }
  }

  const confirmImport = () => {
    if (!importCandidate) return
    dispatch(importProgress(importCandidate))
    setImportCandidate(null)
    message.success('Progress imported.')
  }

  const confirmReset = () => {
    Modal.confirm({
      title: 'Reset all progress?',
      content: 'This clears completed activities and restores the system theme.',
      okText: 'Reset',
      okButtonProps: { danger: true },
      onOk: () => dispatch(resetProgress()),
    })
  }

  const doneCount = Object.keys(progress.completed).length

  return (
    <>
      <Drawer
        title="Settings"
        open={open}
        onClose={onClose}
        width="min(100vw, 360px)"
      >
        <div className="settings-section">
          <strong>Cloud account</strong>
          {authLoading ? (
            <p>Checking authentication…</p>
          ) : user ? (
            <>
              <span>{user.email}</span>
              <span>
                {syncStatus === 'loading'
                  ? 'Loading cloud progress…'
                  : syncStatus === 'syncing'
                    ? 'Syncing progress…'
                    : syncStatus === 'error'
                      ? 'Cloud sync needs attention'
                      : 'Cloud progress synced'}
              </span>
              {syncError && (
                <Alert
                  type="error"
                  showIcon
                  message="Cloud sync error"
                  description={syncError}
                  action={<Button size="small" onClick={retrySync}>Retry</Button>}
                />
              )}
              <Button
                onClick={() => {
                  setAuthError(null)
                  void logOut().catch((error: unknown) =>
                    setAuthError(
                      error instanceof Error ? error.message : 'Sign out failed.',
                    ),
                  )
                }}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Input
                type="email"
                autoComplete="email"
                placeholder="Email"
                aria-label="Account email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Input.Password
                autoComplete="current-password"
                placeholder="Password"
                aria-label="Account password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <div className="settings-actions">
                <Button
                  type="primary"
                  disabled={!email || !password}
                  onClick={() => void authenticate('signIn')}
                >
                  Log in
                </Button>
                <Button
                  disabled={!email || !password}
                  onClick={() => void authenticate('signUp')}
                >
                  Create account
                </Button>
              </div>
              {authError && (
                <Alert type="error" showIcon message={authError} />
              )}
            </>
          )}
        </div>
        <div className="settings-section">
          <label htmlFor="theme-preference">Theme</label>
          <Select<ThemePreference>
            id="theme-preference"
            aria-label="Theme"
            value={preference}
            onChange={(theme) => dispatch(setTheme(theme))}
            options={themeOptions}
            style={{ display: 'block', marginTop: 8, width: '100%' }}
          />
        </div>
        <div className="settings-section">
          <strong>Backup</strong>
          <div className="settings-actions">
            <Button onClick={exportProgress}>Export progress</Button>
            <input
              aria-label="Import progress JSON"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void readImport(file)
              }}
            />
          </div>
        </div>
        <div className="settings-section">
          <strong>Reset</strong>
          <Button danger onClick={confirmReset}>Reset progress</Button>
        </div>
        <small className="storage-key">
          Local backup and migration source: {PROGRESS_STORAGE_KEY}
        </small>
      </Drawer>
      <Modal
        open={Boolean(importCandidate)}
        title="Import progress?"
        onCancel={() => setImportCandidate(null)}
        onOk={confirmImport}
        okText="Replace progress"
      >
        <p>
          This file contains {Object.keys(importCandidate?.completed ?? {}).length} completed activities
          and theme “{importCandidate?.theme}”. It will replace your current {doneCount} completed items.
        </p>
      </Modal>
    </>
  )
}

function AppLayout({ children }: { children: ReactNode }) {
  const today = todayLocal()
  const left = daysLeft(roadmap, today)
  const headerLabel =
    today < roadmap.meta.startDate
      ? left
      : today > roadmap.meta.endDate
        ? 'Plan complete'
        : `Day ${currentDayNumber(roadmap, today)} of ${roadmap.meta.totalDays}`

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" to="/" aria-label="RoadmapTrack dashboard">
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          <span>RoadmapTrack</span>
        </Link>
        <div className="header-center">
          <span className="day-count">{headerLabel}</span>
          <nav className="desktop-nav" aria-label="Main navigation">
            <NavigationLinks />
          </nav>
        </div>
        <div className="header-actions">{children}</div>
      </header>
      <main className="page-content">
        <Outlet />
      </main>
      <nav className="mobile-nav" aria-label="Main navigation">
        <NavigationLinks />
      </nav>
    </div>
  )
}

function Layout() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <AppLayout>
        <Tooltip title="Settings">
          <Button
            className="settings-button"
            type="text"
            shape="circle"
            icon={<SettingOutlined />}
            aria-label="Open settings"
            onClick={() => setSettingsOpen(true)}
          />
        </Tooltip>
      </AppLayout>
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  )
}

export default Layout

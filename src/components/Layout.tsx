import {
  BookOutlined,
  CalendarOutlined,
  HomeOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { Button, Drawer, Select, Tooltip } from 'antd'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useProgressStore, type ThemePreference } from '@/store/progress'

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
  const preference = useProgressStore((state) => state.settings.theme)
  const setPreference = useProgressStore((state) => state.setTheme)

  return (
    <Drawer title="Settings" open={open} onClose={onClose} width={320}>
      <label htmlFor="theme-preference">Theme</label>
      <Select<ThemePreference>
        id="theme-preference"
        aria-label="Theme"
        value={preference}
        onChange={setPreference}
        options={themeOptions}
        style={{ display: 'block', marginTop: 8, width: '100%' }}
      />
    </Drawer>
  )
}

function AppLayout({ children }: { children: ReactNode }) {
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
          <span className="day-count">Day 1 of 90</span>
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

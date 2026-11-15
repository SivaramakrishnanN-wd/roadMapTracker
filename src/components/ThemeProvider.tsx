import { ConfigProvider, theme } from 'antd'
import { useEffect, useState, type ReactNode } from 'react'
import { useProgressStore } from '@/store/progress'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const preference = useProgressStore((state) => state.settings.theme)
  const [systemDark, setSystemDark] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateSystemTheme = () => setSystemDark(mediaQuery.matches)

    updateSystemTheme()
    mediaQuery.addEventListener('change', updateSystemTheme)

    return () => mediaQuery.removeEventListener('change', updateSystemTheme)
  }, [])

  const isDark =
    preference === 'dark' || (preference === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
  }, [isDark])

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#4263b4', borderRadius: 10 },
      }}
    >
      {children}
    </ConfigProvider>
  )
}

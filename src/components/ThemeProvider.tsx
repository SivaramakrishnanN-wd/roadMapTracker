import { ConfigProvider, theme } from 'antd'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemePreference } from '@/components/ThemeContext'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreference] = useState<ThemePreference>('system')
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

  const contextValue = useMemo(
    () => ({ preference, setPreference }),
    [preference],
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      <ConfigProvider
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: { colorPrimary: '#4263b4', borderRadius: 10 },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}

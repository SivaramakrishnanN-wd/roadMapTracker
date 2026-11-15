import { createContext, useContext } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
)

export function useThemePreference() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useThemePreference must be used within ThemeProvider')
  }

  return context
}

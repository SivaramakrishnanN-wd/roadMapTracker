import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { activitiesById, getDay } from '@/lib/roadmap'

export type ThemePreference = 'light' | 'dark' | 'system'

export interface ProgressState {
  completed: Record<string, true>
  theme: ThemePreference
}

export const PROGRESS_STORAGE_KEY = 'roadmaptrack:v1'

export const initialProgressState: ProgressState = {
  completed: {},
  theme: 'system',
}

export function loadProgress(): ProgressState {
  try {
    const saved = localStorage.getItem(PROGRESS_STORAGE_KEY)
    if (!saved) return initialProgressState

    const parsed = JSON.parse(saved) as Partial<ProgressState>
    const completed =
      parsed.completed && typeof parsed.completed === 'object'
        ? parsed.completed
        : {}
    const theme: ThemePreference =
      parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
        ? parsed.theme
        : 'system'

    return { completed, theme }
  } catch {
    return initialProgressState
  }
}

const progressSlice = createSlice({
  name: 'progress',
  initialState: loadProgress,
  reducers: {
    toggleActivity(state, action: PayloadAction<string>) {
      if (!activitiesById.has(action.payload)) {
        throw new RangeError(`Unknown activity id: ${action.payload}`)
      }
      if (state.completed[action.payload]) {
        delete state.completed[action.payload]
      } else {
        state.completed[action.payload] = true
      }
    },
    setDayDone(state, action: PayloadAction<{ date: string; done: boolean }>) {
      const day = getDay(action.payload.date)
      if (!day) {
        throw new RangeError(`Date is outside the roadmap: ${action.payload.date}`)
      }
      day.activities.forEach(({ id }) => {
        if (action.payload.done) state.completed[id] = true
        else delete state.completed[id]
      })
    },
    setTheme(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload
    },
    importProgress(_state, action: PayloadAction<ProgressState>) {
      return {
        completed: { ...action.payload.completed },
        theme: action.payload.theme,
      }
    },
    resetProgress() {
      return initialProgressState
    },
  },
})

export const {
  toggleActivity,
  setDayDone,
  setTheme,
  importProgress,
  resetProgress,
} = progressSlice.actions

export const store = configureStore({
  reducer: { progress: progressSlice.reducer },
})

store.subscribe(() => {
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(store.getState().progress))
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

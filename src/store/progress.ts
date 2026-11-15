import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { persist } from 'zustand/middleware'
import { activitiesById, getDay } from '@/lib/roadmap'

export type ThemePreference = 'light' | 'dark' | 'system'

export interface ProgressState {
  version: 1
  completed: Record<string, string>
  notes: Record<string, string>
  carried: Record<string, string>
  settings: { theme: ThemePreference }
}

interface ProgressActions {
  toggleActivity: (id: string) => void
  setDayDone: (date: string, done: boolean) => void
  setNote: (date: string, text: string) => void
  carryForward: (activityId: string, targetDate: string) => void
  uncarry: (activityId: string) => void
  importState: (state: ProgressState) => void
  reset: () => void
  setTheme: (theme: ThemePreference) => void
}

export type ProgressStore = ProgressState & ProgressActions

export const PROGRESS_STORAGE_KEY = 'roadmaptrack:progress:v1'

function createInitialState(): ProgressState {
  return {
    version: 1,
    completed: {},
    notes: {},
    carried: {},
    settings: { theme: 'system' },
  }
}

export function createProgressStore() {
  return createStore<ProgressStore>()(
    persist(
      (set) => ({
        ...createInitialState(),
        toggleActivity: (id) => {
          if (!activitiesById.has(id)) {
            throw new RangeError(`Unknown activity id: ${id}`)
          }

          set((state) => {
            const completed = { ...state.completed }

            if (completed[id]) {
              delete completed[id]
            } else {
              completed[id] = new Date().toISOString()
            }

            return { completed }
          })
        },
        setDayDone: (date, done) => {
          const day = getDay(date)

          if (!day) {
            throw new RangeError(`Date is outside the roadmap: ${date}`)
          }

          set((state) => {
            const completed = { ...state.completed }

            day.activities.forEach(({ id }) => {
              if (done) {
                completed[id] = completed[id] ?? new Date().toISOString()
              } else {
                delete completed[id]
              }
            })

            return { completed }
          })
        },
        setNote: (date, text) =>
          set((state) => ({ notes: { ...state.notes, [date]: text } })),
        carryForward: (activityId, targetDate) => {
          if (!activitiesById.has(activityId)) {
            throw new RangeError(`Unknown activity id: ${activityId}`)
          }
          if (!getDay(targetDate)) {
            throw new RangeError(`Date is outside the roadmap: ${targetDate}`)
          }

          set((state) => ({
            carried: { ...state.carried, [activityId]: targetDate },
          }))
        },
        uncarry: (activityId) =>
          set((state) => {
            const carried = { ...state.carried }
            delete carried[activityId]
            return { carried }
          }),
        importState: (state) =>
          set({
            version: state.version,
            completed: { ...state.completed },
            notes: { ...state.notes },
            carried: { ...state.carried },
            settings: { ...state.settings },
          }),
        reset: () => set(createInitialState()),
        setTheme: (theme) =>
          set((state) => ({ settings: { ...state.settings, theme } })),
      }),
      { name: PROGRESS_STORAGE_KEY },
    ),
  )
}

export const progressStore = createProgressStore()

export function useProgressStore<T>(selector: (state: ProgressStore) => T): T {
  return useStore(progressStore, selector)
}

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createProgressStore,
  PROGRESS_STORAGE_KEY,
  type ProgressState,
} from '@/store/progress'
import { roadmap } from '@/lib/roadmap'

const firstDay = roadmap.days[0]
const firstActivity = firstDay.activities[0]
const secondActivity = firstDay.activities[1]

describe('progress store', () => {
  let store: ReturnType<typeof createProgressStore>

  beforeEach(() => {
    localStorage.clear()
    store = createProgressStore()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('toggles an activity and records an ISO timestamp', () => {
    store.getState().toggleActivity(firstActivity.id)
    const timestamp = store.getState().completed[firstActivity.id]

    expect(new Date(timestamp).toISOString()).toBe(timestamp)

    store.getState().toggleActivity(firstActivity.id)

    expect(store.getState().completed[firstActivity.id]).toBeUndefined()
  })

  it('marks or clears every activity on a day without changing prior timestamps', () => {
    store.getState().toggleActivity(firstActivity.id)
    const timestamp = store.getState().completed[firstActivity.id]

    store.getState().setDayDone(firstDay.date, true)

    expect(
      firstDay.activities.every(({ id }) =>
        Boolean(store.getState().completed[id]),
      ),
    ).toBe(true)
    expect(store.getState().completed[firstActivity.id]).toBe(timestamp)

    store.getState().setDayDone(firstDay.date, false)

    expect(store.getState().completed).toEqual({})
  })

  it('sets a note for a date', () => {
    store.getState().setNote(firstDay.date, 'Review closures')

    expect(store.getState().notes[firstDay.date]).toBe('Review closures')
  })

  it('carries an activity to a target date and removes the carry', () => {
    const targetDate = roadmap.days[1].date

    store.getState().carryForward(firstActivity.id, targetDate)

    expect(store.getState().carried[firstActivity.id]).toBe(targetDate)

    store.getState().uncarry(firstActivity.id)

    expect(store.getState().carried[firstActivity.id]).toBeUndefined()
  })

  it('imports all progress data and settings', () => {
    const imported: ProgressState = {
      version: 1,
      completed: { [firstActivity.id]: '2026-11-16T08:00:00.000Z' },
      notes: { [firstDay.date]: 'Imported note' },
      carried: { [secondActivity.id]: roadmap.days[1].date },
      settings: { theme: 'dark' },
    }

    store.getState().importState(imported)

    expect(store.getState()).toMatchObject(imported)
  })

  it('resets progress and settings to their defaults', () => {
    store.getState().toggleActivity(firstActivity.id)
    store.getState().setNote(firstDay.date, 'Note')
    store.getState().carryForward(firstActivity.id, roadmap.days[1].date)
    store.getState().setTheme('dark')

    store.getState().reset()

    expect(store.getState()).toMatchObject({
      version: 1,
      completed: {},
      notes: {},
      carried: {},
      settings: { theme: 'system' },
    })
  })

  it('sets the theme preference', () => {
    store.getState().setTheme('dark')

    expect(store.getState().settings.theme).toBe('dark')
  })

  it('persists progress and restores it in a newly created store', () => {
    store.getState().toggleActivity(firstActivity.id)
    store.getState().setNote(firstDay.date, 'Persisted note')
    store.getState().setTheme('light')

    expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).not.toBeNull()

    const restoredStore = createProgressStore()

    expect(restoredStore.getState().completed[firstActivity.id]).toBe(
      store.getState().completed[firstActivity.id],
    )
    expect(restoredStore.getState().notes[firstDay.date]).toBe('Persisted note')
    expect(restoredStore.getState().settings.theme).toBe('light')
  })
})

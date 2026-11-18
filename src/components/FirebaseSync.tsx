import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import {
  doc,
  getDocFromServer,
  onSnapshot,
  setDoc,
  type DocumentReference,
} from 'firebase/firestore'
import { auth, authPersistenceReady, firestore } from '@/firebase'
import {
  importProgress,
  PROGRESS_STORAGE_KEY,
  store,
  type ProgressState,
} from '@/store/progress'
import { activitiesById } from '@/lib/roadmap'
import { FirebaseContext, type SyncStatus } from '@/contexts/FirebaseContext'

function migrationKey(uid: string): string {
  return `roadmaptrack:firebase-migrated:${uid}`
}

function parseProgress(value: unknown): ProgressState | null {
  if (!value || typeof value !== 'object') return null
  const record = value as { completed?: unknown; theme?: unknown }
  if (!record.completed || typeof record.completed !== 'object') return null

  const completed: Record<string, true> = {}
  Object.entries(record.completed).forEach(([id, done]) => {
    if (done === true && activitiesById.has(id)) completed[id] = true
  })

  const theme =
    record.theme === 'light' ||
    record.theme === 'dark' ||
    record.theme === 'system'
      ? record.theme
      : 'system'

  return { completed, theme }
}

function parseLocalBackup(): ProgressState | null {
  try {
    const saved = localStorage.getItem(PROGRESS_STORAGE_KEY)
    return saved ? parseProgress(JSON.parse(saved)) : null
  } catch {
    return null
  }
}

function mergeProgress(
  cloud: ProgressState | null,
  local: ProgressState | null,
): ProgressState {
  const completed: Record<string, true> = {
    ...(cloud?.completed ?? {}),
    ...(local?.completed ?? {}),
  }
  return {
    completed,
    theme: cloud?.theme ?? local?.theme ?? 'system',
  }
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected Firebase error occurred.'
}

function progressDocument(uid: string): DocumentReference {
  return doc(firestore, 'users', uid, 'progress', 'main')
}

export function FirebaseSync({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [progressReady, setProgressReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined
    void authPersistenceReady
      .then(() => {
        if (!active) return
        unsubscribe = onAuthStateChanged(
          auth,
          (currentUser) => {
            setUser(currentUser)
            setAuthLoading(false)
            setProgressReady(false)
            if (!currentUser) {
              setSyncStatus('synced')
              setSyncError(null)
            }
          },
          (error) => {
            setSyncError(readableError(error))
            setAuthLoading(false)
          },
        )
      })
      .catch((error: unknown) => {
        setSyncError(readableError(error))
        setAuthLoading(false)
      })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) return

    let active = true
    let applyingRemote = false
    let writeQueue = Promise.resolve()
    let unsubscribeSnapshot: (() => void) | undefined
    let unsubscribeStore: (() => void) | undefined
    const reference = progressDocument(user.uid)

    const applyRemote = (state: ProgressState) => {
      const current = store.getState().progress
      if (JSON.stringify(current) !== JSON.stringify(state)) {
        applyingRemote = true
        store.dispatch(importProgress(state))
        applyingRemote = false
      }
    }

    const startSync = async () => {
      setSyncStatus('loading')
      setSyncError(null)
      try {
        const snapshot = await getDocFromServer(reference)
        if (!active) return

        const cloudProgress = snapshot.exists()
          ? parseProgress(snapshot.data())
          : null
        if (snapshot.exists() && !cloudProgress) {
          throw new Error(
            'The saved Firestore progress document is invalid. The local backup was kept unchanged.',
          )
        }
        const migrated = localStorage.getItem(migrationKey(user.uid)) === 'true'
        const localProgress = parseLocalBackup() ?? store.getState().progress

        if (!migrated) {
          const merged = mergeProgress(cloudProgress, localProgress)
          setSyncStatus('syncing')
          await setDoc(reference, merged)
          if (!active) return
          localStorage.setItem(migrationKey(user.uid), 'true')
          applyRemote(merged)
        } else if (cloudProgress) {
          applyRemote(cloudProgress)
        } else {
          const backup = store.getState().progress
          setSyncStatus('syncing')
          await setDoc(reference, backup)
          if (!active) return
          applyRemote(backup)
        }

        if (!active) return
        setSyncStatus('synced')
        setProgressReady(true)

        let lastSaved = JSON.stringify(store.getState().progress)
        unsubscribeStore = store.subscribe(() => {
          if (!active || applyingRemote) return
          const current = store.getState().progress
          const serialized = JSON.stringify(current)
          if (serialized === lastSaved) return
          lastSaved = serialized
          setSyncStatus('syncing')
          writeQueue = writeQueue
            .then(() => setDoc(reference, current))
            .then(() => {
              if (active) {
                setSyncStatus('synced')
                setSyncError(null)
              }
            })
            .catch((error: unknown) => {
              if (active) {
                setSyncStatus('error')
                setSyncError(readableError(error))
              }
            })
        })

        unsubscribeSnapshot = onSnapshot(
          reference,
          (remoteSnapshot) => {
            if (!active || !remoteSnapshot.exists()) return
            const remoteState = parseProgress(remoteSnapshot.data())
            if (remoteState) applyRemote(remoteState)
          },
          (error) => {
            if (active) {
              setSyncStatus('error')
              setSyncError(readableError(error))
            }
          },
        )
      } catch (error) {
        if (active) {
          setSyncStatus('error')
          setSyncError(readableError(error))
        }
      }
    }

    void startSync()

    return () => {
      active = false
      unsubscribeSnapshot?.()
      unsubscribeStore?.()
    }
  }, [authLoading, retryCount, user])

  const signUp = useCallback(async (email: string, password: string) => {
    await authPersistenceReady
    await createUserWithEmailAndPassword(auth, email, password)
  }, [])
  const signIn = useCallback(async (email: string, password: string) => {
    await authPersistenceReady
    await signInWithEmailAndPassword(auth, email, password)
  }, [])
  const logOut = useCallback(async () => {
    await authPersistenceReady
    await signOut(auth)
  }, [])
  const retrySync = useCallback(() => {
    if (!user || !progressReady) {
      setRetryCount((count) => count + 1)
      return
    }
    setSyncStatus('syncing')
    setSyncError(null)
    void setDoc(progressDocument(user.uid), store.getState().progress)
      .then(() => setSyncStatus('synced'))
      .catch((error: unknown) => {
        setSyncStatus('error')
        setSyncError(readableError(error))
      })
  }, [progressReady, user])

  const value = useMemo(
    () => ({
      user,
      authLoading,
      progressReady,
      syncStatus,
      syncError,
      signUp,
      signIn,
      logOut,
      retrySync,
    }),
    [
      user,
      authLoading,
      progressReady,
      syncStatus,
      syncError,
      signUp,
      signIn,
      logOut,
      retrySync,
    ],
  )

  return (
    <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>
  )
}

import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'

export type SyncStatus = 'loading' | 'syncing' | 'synced' | 'error'

export interface FirebaseContextValue {
  user: User | null
  authLoading: boolean
  progressReady: boolean
  syncStatus: SyncStatus
  syncError: string | null
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  logOut: () => Promise<void>
  retrySync: () => void
}

export const FirebaseContext = createContext<FirebaseContextValue | null>(null)

export function useFirebaseSync(): FirebaseContextValue {
  const context = useContext(FirebaseContext)
  if (!context) {
    throw new Error('useFirebaseSync must be used within FirebaseSync.')
  }
  return context
}

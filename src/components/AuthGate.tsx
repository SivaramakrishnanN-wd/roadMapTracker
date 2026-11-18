import { useState, type FormEvent, type ReactNode } from 'react'
import { Alert, Button, Card, Input, Spin, Typography } from 'antd'
import { useFirebaseSync } from '@/contexts/FirebaseContext'

function authErrorMessage(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : ''

  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password is incorrect.'
    case 'auth/email-already-in-use':
      return 'An account already exists for this email. Log in instead.'
    case 'auth/weak-password':
      return 'Choose a password with at least 6 characters.'
    case 'auth/network-request-failed':
      return 'Network connection failed. Check your internet connection and try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a while before trying again.'
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled in Firebase Authentication.'
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Try again.'
  }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const {
    user,
    authLoading,
    progressReady,
    syncStatus,
    syncError,
    signIn,
    signUp,
    logOut,
    retrySync,
  } = useFirebaseSync()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (authLoading) {
    return (
      <div className="auth-loading">
        <Spin size="large" />
        <Typography.Text>Checking your account…</Typography.Text>
      </div>
    )
  }

  if (!user) {
    const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setSubmitting(true)
      setError(null)
      try {
        if (mode === 'login') await signIn(email, password)
        else await signUp(email, password)
      } catch (authError) {
        setError(authErrorMessage(authError))
      } finally {
        setSubmitting(false)
      }
    }

    return (
      <main className="auth-page">
        <Card className="auth-card">
          <div className="auth-brand">
            <span className="brand-mark" aria-hidden="true">R</span>
            <Typography.Title level={3}>RoadmapTrack</Typography.Title>
          </div>
          <Typography.Paragraph>
            {mode === 'login'
              ? 'Log in to continue to your study tracker.'
              : 'Create your account to save your study progress.'}
          </Typography.Paragraph>
          <form onSubmit={(event) => void submit(event)} className="auth-form">
            <Input
              type="email"
              autoComplete="email"
              placeholder="Email"
              aria-label="Email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input.Password
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Password (at least 6 characters)"
              aria-label="Password"
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && <Alert type="error" showIcon message={error} />}
            <Button type="primary" htmlType="submit" loading={submitting} block>
              {mode === 'login' ? 'Log in' : 'Create account'}
            </Button>
          </form>
          <Button
            type="link"
            block
            onClick={() => {
              setMode((current) => current === 'login' ? 'signup' : 'login')
              setError(null)
            }}
          >
            {mode === 'login'
              ? 'New here? Create an account'
              : 'Already registered? Log in'}
          </Button>
          {syncError && !error && (
            <Alert type="warning" showIcon message={syncError} />
          )}
        </Card>
      </main>
    )
  }

  if (!progressReady) {
    return (
      <div className="auth-loading">
        {syncStatus === 'error' ? (
          <Card className="auth-card">
            <Alert
              type="error"
              showIcon
              message="Could not load cloud progress"
              description={syncError}
            />
            <div className="auth-loading-actions">
              <Button type="primary" onClick={retrySync}>Retry</Button>
              <Button onClick={() => void logOut()}>Log out</Button>
            </div>
          </Card>
        ) : (
          <>
            <Spin size="large" />
            <Typography.Text>Loading your saved progress…</Typography.Text>
          </>
        )}
      </div>
    )
  }

  return <>{children}</>
}

import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './app/router'
import { PreferencesProvider } from './app/preferences'
import { VaultProvider } from './app/vault'
import StatusScreen from './app/StatusScreen'
import { FeedbackToastRegion } from './components/ui/FeedbackToast'
import { initializeDatabase } from './data/database'
import { loadBootState, type BootState } from './data/setup'
import OnboardingPage from './features/onboarding/OnboardingPage'
import UnlockPage from './features/security/UnlockPage'

type AppStartupState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; route: BootState }

export function App() {
  const [attempt, setAttempt] = useState(0)
  const [startup, setStartup] = useState<AppStartupState>({ status: 'loading' })
  // Unlock lives in memory for this process only. It is never persisted.
  const [enteredApp, setEnteredApp] = useState(false)

  useEffect(() => {
    let active = true
    setStartup({ status: 'loading' })
    setEnteredApp(false)

    async function openApplication() {
      try {
        await initializeDatabase()
        const route = await loadBootState()

        if (active) {
          setStartup({ status: 'ready', route })
        }
      } catch (error) {
        if (active) {
          setStartup({ status: 'error', error })
        }
      }
    }

    void openApplication()
    return () => {
      active = false
    }
  }, [attempt])

  if (startup.status === 'loading') {
    return <StatusScreen status="loading" />
  }

  if (startup.status === 'error') {
    return <StatusScreen status="error" error={startup.error} onRetry={() => setAttempt((value) => value + 1)} />
  }

  const route: BootState = enteredApp ? 'ready' : startup.route

  return <BootRoute route={route} onEnterApp={() => setEnteredApp(true)} />
}

function BootRoute({ route, onEnterApp }: { route: BootState; onEnterApp: () => void }) {
  if (route === 'onboarding') {
    return (
      <main
        aria-label="Kivo application"
        className="h-screen overflow-hidden bg-background text-foreground"
      >
        <OnboardingPage onCompleted={onEnterApp} />
      </main>
    )
  }

  if (route === 'locked') {
    return (
      <main
        aria-label="Kivo application"
        className="min-h-screen bg-background text-foreground"
      >
        <div id="kivo-content">
          <UnlockPage onUnlocked={onEnterApp} />
        </div>
      </main>
    )
  }

  return <ReadyApplication />
}

function ReadyApplication() {
  return (
    <PreferencesProvider>
      <BrowserRouter>
        <VaultProvider>
          <AppRoutes />
        </VaultProvider>
      </BrowserRouter>
      <FeedbackToastRegion />
    </PreferencesProvider>
  )
}

export default App

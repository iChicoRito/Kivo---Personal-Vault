import { buttonVariants, Typography } from '@heroui/react'
import { Outlet } from 'react-router-dom'

import { AnimatedThemeToggler } from '../components/ui/animated-theme-toggler'
import { cn } from '../lib/utils'
import AppDock from './AppDock'
import { usePreferences } from './preferences'

function ThemeToggle() {
  const { resolvedTheme, updatePreferences } = usePreferences()

  return (
    <AnimatedThemeToggler
      className={cn(
        buttonVariants({ isIconOnly: true, variant: 'ghost' }),
        'kivo-theme-toggler [&_svg]:size-4',
      )}
      theme={resolvedTheme}
      onThemeChange={(theme) => {
        // The toggler runs its own view transition, so the provider applies the
        // palette without starting a second one.
        void updatePreferences({ theme }, { transition: false }).catch(() => {})
      }}
    />
  )
}

function AppNavbar() {
  return (
    <header
      id="kivo-navbar"
      className="sticky top-0 z-20 flex min-h-12 items-center justify-between gap-3 border-b border-separator bg-surface px-4"
    >
      <Typography className="truncate text-foreground" type="body" weight="semibold">
        Kivo
      </Typography>
      <ThemeToggle />
    </header>
  )
}

export default function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground" id="kivo-shell">
      <div id="kivo-workspace" className="min-w-0">
        <AppNavbar />

        <main aria-label="Kivo application" className="min-w-0" id="kivo-main" tabIndex={-1}>
          <div id="kivo-content">
            <Outlet />
          </div>
        </main>

        <AppDock />
      </div>
    </div>
  )
}

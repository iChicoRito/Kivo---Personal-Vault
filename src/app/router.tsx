import { Link, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './AppShell'
import PageHeader, { textLinkClass } from './PageHeader'
import DashboardPage from '../features/dashboard/DashboardPage'
import ModulePage, { moduleRoutes } from '../features/modules/ModulePage'
import SettingsPage from '../features/settings/SettingsPage'

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title" className="grid gap-8">
      <PageHeader
        description="This Kivo destination does not exist."
        eyebrow="KIVO"
        title="Not Found"
        titleId="not-found-title"
      />
      <Link className={textLinkClass} to="/dashboard">
        Return to Dashboard
      </Link>
    </section>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {moduleRoutes
          .filter((module) => module.path !== 'settings')
          .map((module) => (
            <Route key={module.path} path={module.path} element={<ModulePage module={module} />} />
          ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes

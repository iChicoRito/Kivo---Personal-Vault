import { Link, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './AppShell'
import PageHeader, { textLinkClass } from './PageHeader'
import DashboardPage from '../features/dashboard/DashboardPage'
import ModulePage, { moduleRoutes } from '../features/modules/ModulePage'
import SettingsPage from '../features/settings/SettingsPage'
import { ItemsPage } from '../features/items/ItemsPage'
import { NotesPage } from '../features/notes/NotesPage'
import { NoteEditor } from '../features/notes/NoteEditor'
import { SourcesPage } from '../features/sources/SourcesPage'
import { FilesPage } from '../features/files/FilesPage'
import { CollectionsPage } from '../features/collections/CollectionsPage'
import { TagsPage } from '../features/tags/TagsPage'

// Favorites, Recent, and Trash keep the shared placeholder shell until Phase 4.
const placeholderPaths = new Set(['favorites', 'recent', 'trash'])

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title" className="grid gap-8">
      <PageHeader
        description="This Kivo destination does not exist."
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
        <Route path="items" element={<ItemsPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="notes/:id" element={<NoteEditor />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="tags" element={<TagsPage />} />
        {moduleRoutes
          .filter((module) => placeholderPaths.has(module.path))
          .map((module) => (
            <Route key={module.path} path={module.path} element={<ModulePage module={module} />} />
          ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes

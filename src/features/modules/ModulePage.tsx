import { Alert, Button, Card, EmptyState, Spinner, Typography } from '@heroui/react'
import { Link } from 'react-router-dom'

import PageHeader, { textLinkClass } from '../../app/PageHeader'

export type ModuleState = 'empty' | 'loading' | 'error'

export type ModuleRoute = {
  path: string
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  emptyNextStep?: { label: string; to: string }
  loadingTitle: string
  loadingDescription: string
  errorTitle: string
  errorDescription: string
}

const dashboardNextStep = { label: 'Return to Dashboard', to: '/dashboard' }

export const moduleRoutes: ModuleRoute[] = [
  {
    path: 'items',
    title: 'All Items',
    description: 'Browse saved items from one place.',
    emptyTitle: 'No items yet.',
    emptyDescription: 'Saved notes, sources, files, and other items will appear here.',
    emptyNextStep: dashboardNextStep,
    loadingTitle: 'Loading your items',
    loadingDescription: 'Kivo is reading saved items on this device.',
    errorTitle: 'Your items could not load',
    errorDescription: 'Kivo could not read saved items. Try again to reload this list.',
  },
  {
    path: 'notes',
    title: 'Notes',
    description: 'Keep written notes on this device.',
    emptyTitle: 'No Notes Yet',
    emptyDescription:
      "You haven't created any notes yet. Get started by creating your first note.",
    emptyNextStep: dashboardNextStep,
    loadingTitle: 'Loading your notes',
    loadingDescription: 'Kivo is reading notes saved on this device.',
    errorTitle: 'Your notes could not load',
    errorDescription: 'Kivo could not read saved notes. Try again to reload this list.',
  },
  {
    path: 'sources',
    title: 'Source',
    description: 'Keep links and source material together.',
    emptyTitle: 'No sources yet.',
    emptyDescription: 'Saved links and source material will appear here.',
    emptyNextStep: dashboardNextStep,
    loadingTitle: 'Loading your sources',
    loadingDescription: 'Kivo is reading saved links and sources.',
    errorTitle: 'Your sources could not load',
    errorDescription: 'Kivo could not read saved sources. Try again to reload this list.',
  },
  {
    path: 'files',
    title: 'Files',
    description: 'Keep local files within reach.',
    emptyTitle: 'No files yet.',
    emptyDescription: 'Files added to this device will appear here.',
    emptyNextStep: dashboardNextStep,
    loadingTitle: 'Loading your files',
    loadingDescription: 'Kivo is reading file records for this vault.',
    errorTitle: 'Your files could not load',
    errorDescription: 'Kivo could not read saved file records. Try again to reload this list.',
  },
  {
    path: 'collections',
    title: 'Collections',
    description: 'Organize items into named collections.',
    emptyTitle: 'No collections yet.',
    emptyDescription: 'Collections you create will appear here.',
    emptyNextStep: dashboardNextStep,
    loadingTitle: 'Loading your collections',
    loadingDescription: 'Kivo is reading collections saved in this vault.',
    errorTitle: 'Your collections could not load',
    errorDescription: 'Kivo could not read saved collections. Try again to reload this list.',
  },
  {
    path: 'tags',
    title: 'Tags',
    description: 'Use tags to describe saved items.',
    emptyTitle: 'No tags yet.',
    emptyDescription: 'Tags assigned to saved items will appear here.',
    emptyNextStep: dashboardNextStep,
    loadingTitle: 'Loading your tags',
    loadingDescription: 'Kivo is reading tags used in this vault.',
    errorTitle: 'Your tags could not load',
    errorDescription: 'Kivo could not read saved tags. Try again to reload this list.',
  },
  {
    path: 'favorites',
    title: 'Favorites',
    description: 'Keep priority items easy to find.',
    emptyTitle: 'No favorites yet.',
    emptyDescription: 'Items marked as favorites will appear here.',
    emptyNextStep: dashboardNextStep,
    loadingTitle: 'Loading your favorites',
    loadingDescription: 'Kivo is reading favorites marked in this vault.',
    errorTitle: 'Your favorites could not load',
    errorDescription: 'Kivo could not read favorite items. Try again to reload this list.',
  },
  {
    path: 'recent',
    title: 'Recent',
    description: 'Return to items opened lately.',
    emptyTitle: 'Nothing recent yet.',
    emptyDescription: 'Recent items will appear here when saving becomes available.',
    emptyNextStep: dashboardNextStep,
    loadingTitle: 'Loading recent items',
    loadingDescription: 'Kivo is reading items opened on this device.',
    errorTitle: 'Recent items could not load',
    errorDescription: 'Kivo could not read recent items. Try again to reload this list.',
  },
  {
    path: 'trash',
    title: 'Trash',
    description: 'Review deleted items before permanent removal.',
    emptyTitle: 'Trash is empty.',
    emptyDescription: 'Deleted items will appear here before permanent removal is available.',
    emptyNextStep: dashboardNextStep,
    loadingTitle: 'Loading trash',
    loadingDescription: 'Kivo is reading items waiting in trash.',
    errorTitle: 'Trash could not load',
    errorDescription: 'Kivo could not read items in trash. Try again to reload this list.',
  },
]

// The loading and error branches are contract-only until modules have data:
// no route passes `state`, so only the empty state renders from navigation today.
type ModulePageProps = {
  module: ModuleRoute
  state?: ModuleState
  onRetry?: () => void
}

const stateLabels: Record<ModuleState, string> = {
  empty: 'EMPTY STATE',
  loading: 'LOADING',
  error: 'ERROR',
}

const panelLabelClass = 'uppercase'

export default function ModulePage({ module, state = 'empty', onRetry }: ModulePageProps) {
  const titleId = `${module.path}-title`
  const stateTitleId = `${module.path}-state-title`

  return (
    <section aria-labelledby={titleId} className="grid gap-8">
      <PageHeader
        description={module.description}
        title={module.title}
        titleId={titleId}
      />

      {state === 'empty' && (
        <EmptyState aria-labelledby={stateTitleId} className="grid justify-items-start gap-3">
          <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
            {stateLabels.empty}
          </Typography>
          <Typography id={stateTitleId} type="h2">
            {module.emptyTitle}
          </Typography>
          <Typography color="muted" type="body">
            {module.emptyDescription}
          </Typography>
          {module.emptyNextStep && (
            <Link className={textLinkClass} to={module.emptyNextStep.to}>
              {module.emptyNextStep.label}
            </Link>
          )}
        </EmptyState>
      )}

      {state === 'loading' && (
        <Card aria-labelledby={stateTitleId} aria-live="polite" role="status">
          <Card.Content className="grid gap-3">
            <div className="flex items-center gap-3">
              <span aria-hidden="true">
                <Spinner size="sm" />
              </span>
              <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
                {stateLabels.loading}
              </Typography>
            </div>
            <Typography id={stateTitleId} type="h2">
              {module.loadingTitle}
            </Typography>
            <Typography color="muted" type="body">
              {module.loadingDescription}
            </Typography>
          </Card.Content>
        </Card>
      )}

      {state === 'error' && (
        <Alert aria-labelledby={stateTitleId} role="alert" status="danger">
          <Alert.Content className="grid gap-3">
            <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
              {stateLabels.error}
            </Typography>
            <Typography id={stateTitleId} type="h2">
              {module.errorTitle}
            </Typography>
            <Typography type="body">{module.errorDescription}</Typography>
            {onRetry && (
              <Button className="justify-self-start" variant="secondary" onPress={onRetry}>
                Try again
              </Button>
            )}
          </Alert.Content>
        </Alert>
      )}
    </section>
  )
}

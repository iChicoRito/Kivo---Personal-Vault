import { useEffect, useState } from 'react'
import { Alert, Button, Card, Skeleton, Tooltip } from '@heroui/react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  Database01Icon,
  Delete02Icon,
  File01Icon,
  HardDriveIcon,
  Image01Icon,
  Pdf01Icon,
  TextIcon,
} from '@hugeicons/core-free-icons'

import PageHeader from '../../app/PageHeader'
import { MonoRoundedDonutChart } from '../../components/charts/MonoRoundedDonutChart'
import { ConfirmDialog } from '../../components/items/dialogs'
import { FileTypeIcon } from '../../components/items/FileTypeIcon'
import { formatSize } from '../../components/items/fileSize'
import { Panel } from '../../components/ui/Panel'
import { loadStorageReport, type StorageReport } from '../../data/storage'
import { trashItems } from '../../data/items'
import { ItemDetailsDialog } from '../items/ItemDetailsDialog'

// Same accent steps as the dashboard charts, biggest share first.
const SHADES = ['bg-accent', 'bg-accent/70', 'bg-accent/45', 'bg-accent/25', 'bg-accent/15']

const GROUP_ICONS: Record<string, IconSvgElement> = {
  Images: Image01Icon,
  PDFs: Pdf01Icon,
  Text: TextIcon,
  Other: File01Icon,
  Database: Database01Icon,
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date)
}

function percentOf(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

export function StorageManagerPage() {
  const [report, setReport] = useState<StorageReport | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [trashId, setTrashId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setError(false)
    loadStorageReport()
      .then((value) => {
        if (active) setReport(value)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [attempt])

  async function trash() {
    if (!trashId) return
    try {
      await trashItems([trashId])
      setTrashId(null)
      setAttempt((value) => value + 1)
    } catch {
      setError(true)
      setTrashId(null)
    }
  }

  const loading = !report && !error

  // Database plus each file group, largest first, so the bar and the rows share one order.
  const usage = report
    ? [
        ...report.groups.map((group) => ({ ...group })),
        { label: 'Database', count: null as number | null, bytes: report.databaseBytes },
      ]
        .filter((entry) => entry.bytes > 0 || entry.count)
        .sort((a, b) => b.bytes - a.bytes)
    : []
  const largestBytes = report?.largest[0]?.byteSize ?? 0

  const stats = report
    ? [
        {
          label: 'Total use',
          value: formatSize(report.totalBytes),
          hint: 'Database and managed files',
          icon: HardDriveIcon,
        },
        {
          label: 'Database',
          value: formatSize(report.databaseBytes),
          hint: `${percentOf(report.databaseBytes, report.totalBytes)}% of total`,
          icon: Database01Icon,
        },
        {
          label: 'Managed files',
          value: formatSize(report.fileBytes),
          hint: `${percentOf(report.fileBytes, report.totalBytes)}% of total`,
          icon: File01Icon,
        },
        {
          label: 'Files',
          value: String(report.fileCount),
          hint: report.fileCount === 1 ? 'file in the vault' : 'files in the vault',
          icon: Image01Icon,
        },
      ]
    : []

  return (
    <section aria-labelledby="storage-title" className="grid gap-4">
      <PageHeader
        description="See how much space your local vault uses."
        title="Storage Manager"
        titleId="storage-title"
      />

      {loading ? (
        <p className="sr-only" role="status">
          Loading storage report...
        </p>
      ) : null}

      {error ? (
        <Alert role="alert" status="danger">
          <Alert.Content className="grid gap-2">
            <p className="m-0 text-sm font-semibold">Storage report could not load.</p>
            <Button
              className="justify-self-start"
              size="sm"
              variant="secondary"
              onPress={() => setAttempt((value) => value + 1)}
            >
              Try again
            </Button>
          </Alert.Content>
        </Alert>
      ) : null}

      {loading || report ? (
        <>
          <Card className="overflow-hidden p-0">
            <ul className="m-0 grid list-none grid-cols-2 gap-px bg-separator p-0 lg:grid-cols-4">
              {loading
                ? Array.from({ length: 4 }, (_, index) => (
                    <li key={index} aria-hidden="true" className="grid gap-2 bg-surface p-4">
                      <Skeleton animationType="shimmer" className="h-3 w-16 rounded-md" />
                      <Skeleton animationType="shimmer" className="h-7 w-14 rounded-md" />
                      <Skeleton animationType="shimmer" className="h-3 w-24 rounded-md" />
                    </li>
                  ))
                : stats.map((stat) => (
                    <li key={stat.label} className="grid min-w-0 gap-1 bg-surface p-4">
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <HugeiconsIcon aria-hidden="true" icon={stat.icon} size={14} strokeWidth={1.75} />
                        {stat.label}
                      </span>
                      <span className="text-2xl font-semibold tracking-tight tabular-nums">
                        {stat.value}
                      </span>
                      <span className="truncate text-xs text-muted">{stat.hint}</span>
                    </li>
                  ))}
            </ul>
          </Card>

          <div className="grid gap-3 lg:grid-cols-12">
            <Panel className="lg:col-span-8" id="storage-usage" title="Space by type">
              {report ? (
                <>
                  <div
                    aria-label={usage
                      .map((entry) => `${entry.label} ${formatSize(entry.bytes)}`)
                      .join(', ')}
                    className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-default"
                    role="img"
                  >
                    {usage.map((entry, index) =>
                      entry.bytes > 0 ? (
                        <span
                          key={entry.label}
                          className={`h-full first:rounded-l-full last:rounded-r-full ${SHADES[index % SHADES.length]}`}
                          style={{ width: `${(entry.bytes / Math.max(report.totalBytes, 1)) * 100}%` }}
                        />
                      ) : null,
                    )}
                  </div>

                  <ul className="m-0 grid list-none divide-y divide-separator p-0">
                    {usage.map((entry, index) => (
                      <li key={entry.label} className="flex items-center gap-3 py-2.5">
                        <span className={`size-2.5 shrink-0 rounded-full ${SHADES[index % SHADES.length]}`} />
                        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-default">
                          <HugeiconsIcon
                            aria-hidden="true"
                            className="text-muted"
                            icon={GROUP_ICONS[entry.label] ?? File01Icon}
                            size={14}
                            strokeWidth={1.75}
                          />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{entry.label}</span>
                        <span className="text-xs text-muted tabular-nums">
                          {entry.count === null
                            ? 'Notes, sources, settings'
                            : `${entry.count} ${entry.count === 1 ? 'file' : 'files'}`}
                        </span>
                        <span className="w-16 text-right text-sm font-semibold tabular-nums">
                          {formatSize(entry.bytes)}
                        </span>
                        <span className="w-10 text-right text-xs text-muted tabular-nums">
                          {percentOf(entry.bytes, report.totalBytes)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div aria-hidden="true" className="grid gap-3">
                  <Skeleton animationType="shimmer" className="h-3 rounded-full" />
                  {Array.from({ length: 4 }, (_, index) => (
                    <Skeleton key={index} animationType="shimmer" className="h-7 rounded-md" />
                  ))}
                </div>
              )}
            </Panel>

            <Panel className="lg:col-span-4" id="storage-kinds" title="Files by type">
              {report ? (
                report.fileCount === 0 ? (
                  <p className="m-0 py-6 text-center text-sm text-muted">No files yet.</p>
                ) : (
                  <MonoRoundedDonutChart
                    data={report.groups.map((group) => ({ name: group.label, value: group.count }))}
                    label={report.groups.map((group) => `${group.label} ${group.count}`).join(', ')}
                  />
                )
              ) : (
                <Skeleton aria-hidden="true" animationType="shimmer" className="h-44 rounded-[14px]" />
              )}
            </Panel>

            <Panel
              className="lg:col-span-12"
              id="storage-largest"
              meta={
                report && report.largest.length > 0 ? (
                  <span className="text-xs text-muted">Top {report.largest.length} by size</span>
                ) : null
              }
              title="Largest files"
            >
              {!report ? (
                <div aria-hidden="true" className="grid gap-2">
                  {Array.from({ length: 4 }, (_, index) => (
                    <Skeleton key={index} animationType="shimmer" className="h-10 rounded-md" />
                  ))}
                </div>
              ) : report.largest.length === 0 ? (
                <p className="m-0 py-6 text-center text-sm text-muted">
                  No managed files yet. Add a file to see it here.
                </p>
              ) : (
                <ul className="-mx-2 m-0 grid list-none p-0">
                  {report.largest.map((file) => (
                    <li
                      key={file.itemId}
                      className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-default"
                    >
                      <button
                        className={`flex min-w-0 flex-1 items-center gap-3 rounded-md text-left ${focusRing}`}
                        type="button"
                        onClick={() => setOpenId(file.itemId)}
                      >
                        <span className="grid size-8 shrink-0 place-items-center">
                          <FileTypeIcon name={file.originalName} size={24} />
                        </span>
                        <span className="grid min-w-0 flex-1">
                          <span className="truncate text-sm font-medium">{file.title}</span>
                          <span className="truncate text-xs text-muted">
                            {file.originalName}
                            {file.importedAt ? ` · Added ${formatDate(file.importedAt)}` : ''}
                          </span>
                        </span>
                      </button>
                      <span
                        aria-hidden="true"
                        className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-default sm:block"
                      >
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{ width: `${(file.byteSize / Math.max(largestBytes, 1)) * 100}%` }}
                        />
                      </span>
                      <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
                        {formatSize(file.byteSize)}
                      </span>
                      <Tooltip.Root closeDelay={0} delay={200}>
                        <Button
                          isIconOnly
                          aria-label={`Move ${file.title} to Trash`}
                          size="sm"
                          variant="ghost"
                          onPress={() => setTrashId(file.itemId)}
                        >
                          <HugeiconsIcon
                            aria-hidden="true"
                            className="text-danger"
                            icon={Delete02Icon}
                            size={16}
                            strokeWidth={1.75}
                          />
                        </Button>
                        <Tooltip.Content placement="top">Move to Trash</Tooltip.Content>
                      </Tooltip.Root>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      ) : null}

      <ItemDetailsDialog
        itemId={openId}
        onChanged={() => setAttempt((value) => value + 1)}
        onClose={() => setOpenId(null)}
      />
      <ConfirmDialog
        confirmLabel="Move to Trash"
        description="You can restore it from Trash."
        open={trashId !== null}
        title="Move this file to Trash?"
        tone="danger"
        onCancel={() => setTrashId(null)}
        onConfirm={() => void trash()}
      />
    </section>
  )
}

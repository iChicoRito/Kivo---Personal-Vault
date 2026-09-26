import { useEffect, useState } from 'react'
import { Button, Card, Chip } from '@heroui/react'
import PageHeader from '../../app/PageHeader'
import { ConfirmDialog } from '../../components/items/dialogs'
import { loadStorageReport, type StorageReport } from '../../data/storage'
import { trashItems } from '../../data/items'
import { ItemDetailsDialog } from '../items/ItemDetailsDialog'
import { formatSize } from '../../components/items/fileSize'

export function StorageManagerPage() {
  const [report, setReport] = useState<StorageReport | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [trashId, setTrashId] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    setError(false)
    loadStorageReport().then((value) => { if (active) setReport(value) }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [attempt])
  async function trash() {
    if (!trashId) return
    try { await trashItems([trashId]); setTrashId(null); setAttempt((value) => value + 1) }
    catch { setError(true); setTrashId(null) }
  }
  return <section className="grid gap-5" aria-labelledby="storage-title">
    <PageHeader title="Storage Manager" titleId="storage-title" description="See how much space your local vault uses." />
    {!report && !error ? <p role="status">Loading storage report...</p> : null}
    {error ? <div role="alert">Storage report could not load. <Button variant="secondary" onPress={() => setAttempt((value) => value + 1)}>Try again</Button></div> : null}
    {report ? <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{([['Total use', report.totalBytes], ['Database', report.databaseBytes], ['Managed files', report.fileBytes]] as const).map(([label, bytes]) => <Card key={label}><Card.Content><p className="text-muted">{label}</p><p className="text-xl font-semibold">{formatSize(bytes)}</p></Card.Content></Card>)}<Card><Card.Content><p className="text-muted">Files</p><p className="text-xl font-semibold">{report.fileCount}</p></Card.Content></Card></div>
      <div className="flex flex-wrap gap-2">{report.groups.map((group) => <Chip key={group.label} variant="soft">{group.label}: {group.count} ({formatSize(group.bytes)})</Chip>)}</div>
      <h2 className="text-lg font-semibold">Largest files</h2>
      {report.largest.length === 0 ? <p>No managed files yet. Add a file to see it here.</p> : <ul className="grid gap-2">{report.largest.map((file) => <li key={file.itemId} className="flex flex-wrap items-center gap-2 rounded-lg border border-default p-3"><Button variant="secondary" onPress={() => setOpenId(file.itemId)}>{file.title}</Button><span className="min-w-0 flex-1 break-all text-muted">{file.originalName}</span><span>{formatSize(file.byteSize)}</span><Button variant="danger" onPress={() => setTrashId(file.itemId)}>Move to Trash</Button></li>)}</ul>}
    </> : null}
    <ItemDetailsDialog itemId={openId} onClose={() => setOpenId(null)} onChanged={() => setAttempt((value) => value + 1)} />
    <ConfirmDialog open={trashId !== null} title="Move this file to Trash?" description="You can restore it from Trash." confirmLabel="Move to Trash" tone="danger" onCancel={() => setTrashId(null)} onConfirm={() => void trash()} />
  </section>
}

import { useState } from 'react'
import { Button, Card, Typography } from '@heroui/react'
import { invoke } from '../../data/runtime'
import { exportVaultJson, importJson, importMarkdown, pickFolderDestination, type ImportReport } from '../../data/portability'

export default function PortabilitySettings() {
  const [report, setReport] = useState<ImportReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function run(action: () => Promise<ImportReport | void>) {
    setBusy(true); setError(null)
    try { const result = await action(); if (result) setReport(result) }
    catch { setError('Could not move these items. Check the selected file and try again.') }
    finally { setBusy(false) }
  }
  return <Card aria-labelledby="portability-title"><Card.Content className="grid gap-3">
    <Typography id="portability-title" type="h2">Import and export</Typography>
    <Typography color="muted" type="body">JSON and Markdown exports are plaintext, even when encryption is on. Store exports where others cannot read them. Import adds new items and never deletes source files.</Typography>
    <Typography color="muted" type="body">Markdown loses rich formatting, managed file bytes, and exact timestamps. Kivo JSON keeps tags, collection names, favorites, pins, and dates. Unsupported files are reported below.</Typography>
    <div className="flex flex-wrap gap-2">
      <Button isDisabled={busy} variant="secondary" onPress={() => void run(async () => { const paths = await invoke<string[] | null>('pick_files'); return paths?.length ? importMarkdown(paths) : undefined })}>Import Markdown</Button>
      <Button isDisabled={busy} variant="secondary" onPress={() => void run(async () => { const path = await invoke<string | null>('pick_file'); return path ? importJson(path) : undefined })}>Import Kivo JSON</Button>
      <Button isDisabled={busy} onPress={() => void run(async () => { const path = await pickFolderDestination(); if (path) await exportVaultJson(path) })}>Export full vault</Button>
    </div>
    {busy ? <Typography role="status" type="body">Moving items...</Typography> : null}
    {report ? <div role="status"><Typography type="body">Imported {report.imported} items.</Typography>{report.skipped.map((entry, index) => <Typography key={`${entry.title}-${index}`} type="body">Skipped {entry.title}: {entry.reason}</Typography>)}{report.losses.map((loss) => <Typography key={loss} color="muted" type="body">{loss}</Typography>)}</div> : null}
    {error ? <Typography className="text-danger" role="alert" type="body">{error}</Typography> : null}
  </Card.Content></Card>
}

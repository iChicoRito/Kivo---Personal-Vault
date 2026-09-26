import { useState } from 'react'
import { Button, Card, Typography } from '@heroui/react'

import { summarizeItem } from '../../data/insights'
import { saveItem } from '../../data/items'
import { notifyError, notifySuccess } from '../../lib/feedback'
import { toEditorHtml } from './noteContent'

type SummaryCardProps = {
  id: string
  title: string
}

const SUMMARY_ERROR = 'Kivo could not build a summary. Try again.'
const COPY_ERROR = 'Kivo could not copy the summary. Try again.'
const SAVE_ERROR = 'Kivo could not save the summary as a note. Try again.'

/**
 * Builds an extractive summary of the open note through the local command. The
 * sentences stay on screen only: nothing is stored against the source, and Save
 * as note is the one action that writes, creating a new note.
 */
export function SummaryCard({ id, title }: SummaryCardProps) {
  const [sentences, setSentences] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const plainText = sentences?.join('\n\n') ?? ''
  const hasSummary = sentences !== null

  async function summarize() {
    setBusy(true)
    setError(null)
    setSaved(false)

    try {
      const loaded = await summarizeItem(id)
      setSentences(Array.isArray(loaded) ? loaded : [])
    } catch {
      setError(SUMMARY_ERROR)
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!plainText) return

    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(plainText)
      notifySuccess('Summary copied')
    } catch {
      notifyError(COPY_ERROR)
    }
  }

  async function save() {
    if (!plainText) return

    setSaving(true)
    setError(null)

    try {
      await saveItem({
        kind: 'note',
        title: `Summary — ${title.trim() || 'Untitled note'}`,
        content: toEditorHtml((sentences ?? []).join('\n')),
      })
      setSaved(true)
      notifySuccess('Summary saved as a note')
    } catch {
      setError(SAVE_ERROR)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card aria-labelledby="summary-card-title">
      <Card.Content className="grid gap-3">
        <Typography id="summary-card-title" type="h2">
          Summary
        </Typography>
        <Typography color="muted" type="body-xs">
          Made on this device. Your note is not changed.
        </Typography>

        <Button
          className="justify-self-start"
          isDisabled={busy}
          variant="secondary"
          onPress={() => void summarize()}
        >
          {hasSummary ? 'Regenerate' : 'Summarize'}
        </Button>

        {sentences && sentences.length > 0 ? (
          <div className="grid gap-2">
            {sentences.map((sentence, index) => (
              <Typography key={index} type="body">
                {sentence}
              </Typography>
            ))}
          </div>
        ) : null}

        {sentences && sentences.length === 0 ? (
          <Typography color="muted" type="body">
            No summary available.
          </Typography>
        ) : null}

        {hasSummary ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button isDisabled={busy} variant="secondary" onPress={() => void copy()}>
              Copy
            </Button>
            <Button isDisabled={saving || saved || !plainText} onPress={() => void save()}>
              {saved ? 'Saved as a note' : 'Save as note'}
            </Button>
          </div>
        ) : null}

        {error ? (
          <Typography className="font-semibold text-danger" role="alert" type="body">
            {error}
          </Typography>
        ) : null}
      </Card.Content>
    </Card>
  )
}

export default SummaryCard

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Input,
  Label,
  Spinner,
  Switch,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import PageHeader, { textLinkClass } from '../../app/PageHeader'
import { CollectionSelect, ConfirmDialog, TagPicker } from '../../components/items/dialogs'
import {
  loadItem,
  saveItem,
  setItemPinned,
  setItemTags,
  setItemsFavorite,
  trashItems,
  type VaultItem,
} from '../../data/items'

const AUTOSAVE_DELAY = 800

const UNTITLED = 'Untitled note'

const STATUS_TEXT: Record<'idle' | 'saving' | 'saved', string> = {
  idle: '',
  saving: 'Saving...',
  saved: 'Saved',
}

type LoadState = 'loading' | 'ready' | 'missing'

type EditorMeta = {
  description: string
  collectionId: string | null
  isFavorite: boolean
  isPinned: boolean
}

export function NoteEditor() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [item, setItem] = useState<VaultItem | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [actionError, setActionError] = useState<string | null>(null)
  const [trashOpen, setTrashOpen] = useState(false)

  const titleRef = useRef('')
  const contentRef = useRef('')
  const savedRef = useRef({ title: '', content: '' })
  const metaRef = useRef<EditorMeta>({
    description: '',
    collectionId: null,
    isFavorite: false,
    isPinned: false,
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const current = { title: titleRef.current, content: contentRef.current }

    if (current.title === savedRef.current.title && current.content === savedRef.current.content) {
      return
    }

    if (!id) return

    setSaveStatus('saving')

    try {
      await saveItem({
        id,
        kind: 'note',
        title: current.title,
        content: current.content,
        description: metaRef.current.description,
        collectionId: metaRef.current.collectionId,
        isFavorite: metaRef.current.isFavorite,
        isPinned: metaRef.current.isPinned,
      })
      savedRef.current = current
      setSaveStatus('saved')
    } catch {
      setSaveStatus('idle')
      setActionError('Kivo could not save this note. Your changes are still here. Try again.')
    }
  }, [id])

  const scheduleSave = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void flush()
    }, AUTOSAVE_DELAY)
  }, [flush])

  useEffect(() => {
    let active = true
    setLoadState('loading')

    loadItem(id)
      .then((loaded) => {
        if (!active) return
        const initialContent = loaded.content ?? ''

        setItem(loaded)
        setTitle(loaded.title)
        setContent(initialContent)
        titleRef.current = loaded.title
        contentRef.current = initialContent
        savedRef.current = { title: loaded.title, content: initialContent }
        metaRef.current = {
          description: loaded.description,
          collectionId: loaded.collectionId,
          isFavorite: loaded.isFavorite,
          isPinned: loaded.isPinned,
        }
        setLoadState('ready')
      })
      .catch(() => {
        if (active) setLoadState('missing')
      })

    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    const handleBlur = () => void flush()

    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('blur', handleBlur)
      void flush()
    }
  }, [flush])

  function handleTitleChange(next: string) {
    titleRef.current = next
    setTitle(next)
    setSaveStatus('idle')
    scheduleSave()
  }

  function handleContentChange(next: string) {
    contentRef.current = next
    setContent(next)
    setSaveStatus('idle')
    scheduleSave()
  }

  async function handlePin(enabled: boolean) {
    if (!item) return

    try {
      await setItemPinned(item.id, enabled)
      metaRef.current.isPinned = enabled
      setItem({ ...item, isPinned: enabled })
    } catch {
      setActionError('Kivo could not change the pin. Try again.')
    }
  }

  async function handleFavorite(enabled: boolean) {
    if (!item) return

    try {
      await setItemsFavorite([item.id], enabled)
      metaRef.current.isFavorite = enabled
      setItem({ ...item, isFavorite: enabled })
    } catch {
      setActionError('Kivo could not change the favorite. Try again.')
    }
  }

  async function handleTags(next: string[]) {
    if (!item) return

    try {
      await setItemTags(item.id, next)
      setItem({ ...item, tags: next })
    } catch {
      setActionError('Kivo could not save the tags. Try again.')
    }
  }

  async function handleCollection(next: string | null) {
    if (!item) return
    const previousCollection = metaRef.current.collectionId

    metaRef.current.collectionId = next
    setItem({ ...item, collectionId: next })

    try {
      const saved = await saveItem({
        id: item.id,
        kind: 'note',
        title: titleRef.current,
        content: contentRef.current,
        description: metaRef.current.description,
        collectionId: next,
        isFavorite: metaRef.current.isFavorite,
        isPinned: metaRef.current.isPinned,
      })
      savedRef.current = { title: saved.title, content: saved.content ?? '' }
    } catch {
      metaRef.current.collectionId = previousCollection
      setItem({ ...item, collectionId: previousCollection })
      setActionError('Kivo could not save the collection. Try again.')
    }
  }

  async function confirmTrash() {
    if (!item) return

    try {
      await trashItems([item.id])
      navigate('/notes')
    } catch {
      setActionError('Kivo could not move this note to Trash. Try again.')
      setTrashOpen(false)
    }
  }

  if (loadState === 'loading') {
    return (
      <section aria-labelledby="note-editor-title" className="grid gap-8">
        <PageHeader title="Note" titleId="note-editor-title" />
        <Card aria-live="polite" role="status">
          <Card.Content className="grid gap-3">
            <div className="flex items-center gap-3">
              <span aria-hidden="true">
                <Spinner size="sm" />
              </span>
              <Typography className="uppercase" color="muted" type="body-xs" weight="bold">
                LOADING
              </Typography>
            </div>
            <Typography type="h2">Loading your note</Typography>
            <Typography color="muted" type="body">
              Kivo is reading this note on this device.
            </Typography>
          </Card.Content>
        </Card>
      </section>
    )
  }

  if (loadState === 'missing' || !item) {
    return (
      <section aria-labelledby="note-editor-title" className="grid gap-8">
        <PageHeader title="Note not found" titleId="note-editor-title" />
        <Alert role="alert" status="danger">
          <Alert.Content className="grid gap-3">
            <Typography type="body">
              This note could not be found. It may have been removed from the vault.
            </Typography>
            <Link className={textLinkClass} to="/notes">
              Return to Notes
            </Link>
          </Alert.Content>
        </Alert>
      </section>
    )
  }

  return (
    <section aria-labelledby="note-editor-title" className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title={title.trim() || UNTITLED} titleId="note-editor-title" />
        <div className="flex flex-wrap items-center gap-3">
          <Typography aria-live="polite" color="muted" type="body-xs">
            {STATUS_TEXT[saveStatus]}
          </Typography>
          <Button variant="danger" onPress={() => setTrashOpen(true)}>
            Trash
          </Button>
        </div>
      </div>

      <Link className={textLinkClass} to="/notes">
        Back to Notes
      </Link>

      {actionError ? (
        <Typography className="font-semibold text-danger" role="alert" type="body">
          {actionError}
        </Typography>
      ) : null}

      <Card>
        <Card.Content className="grid gap-4">
          <TextField value={title} onChange={handleTitleChange}>
            <Label>Title</Label>
            <Input fullWidth variant="secondary" />
          </TextField>

          <TextField value={content} onChange={handleContentChange}>
            <Label>Content</Label>
            <TextArea className="min-h-64 font-mono" fullWidth variant="secondary" />
          </TextField>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content className="grid gap-4">
          <Switch isSelected={item.isPinned} onChange={(enabled) => void handlePin(enabled)}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Pinned
            </Switch.Content>
          </Switch>

          <Switch isSelected={item.isFavorite} onChange={(enabled) => void handleFavorite(enabled)}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Favorite
            </Switch.Content>
          </Switch>

          <TagPicker label="Tags" value={item.tags} onChange={(next) => void handleTags(next)} />

          <CollectionSelect
            label="Collection"
            value={item.collectionId}
            onChange={(next) => void handleCollection(next)}
          />
        </Card.Content>
      </Card>

      <ConfirmDialog
        confirmLabel="Move to Trash"
        description="This note leaves the Notes list and stays recoverable in the vault."
        open={trashOpen}
        title="Move this note to Trash?"
        tone="danger"
        onCancel={() => setTrashOpen(false)}
        onConfirm={() => void confirmTrash()}
      />
    </section>
  )
}

export default NoteEditor

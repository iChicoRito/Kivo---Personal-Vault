import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  ButtonGroup,
  Skeleton,
  Separator,
  Typography,
} from '@heroui/react'
import {
  ArrowLeft01Icon,
  Delete02Icon,
  PinIcon,
  PinOffIcon,
  StarIcon,
  StarOffIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import PageHeader, { textLinkClass } from '../../app/PageHeader'
import { CollectionSelect, ConfirmDialog } from '../../components/items/dialogs'
import { markItemOpened } from '../../data/activity'
import {
  loadItem,
  saveItem,
  setItemPinned,
  setItemTags,
  setItemsFavorite,
  type VaultItem,
} from '../../data/items'
import { trashWithUndo } from '../../lib/feedback'
import { NoteContentEditor } from './NoteContentEditor'
import { NoteTagField } from './NoteTagField'
import { toEditorHtml, toStoredContent } from './noteContent'

const AUTOSAVE_DELAY = 800

/** Base title size in pixels; matches the title field's `text-[2.5rem]` class. */
const TITLE_FONT_SIZE = 40

/** Size the title shrinks to before it clips instead of shrinking further. */
const MIN_TITLE_FONT_SIZE = 16

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
  const titleFieldRef = useRef<HTMLInputElement | null>(null)
  const contentRef = useRef('')
  const savedRef = useRef({ title: '', content: '' })
  const loadedRef = useRef(false)
  const draftSavingRef = useRef(false)
  const createdIdRef = useRef<string | null>(null)
  const editorKeyRef = useRef('draft')
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

    // Development mounts run every effect twice, so the cleanup that flushes on
    // the way out can fire before the note has loaded. Nothing is editable until
    // then, and saving the still-empty fields would overwrite the stored note.
    if (!loadedRef.current) return

    // The vault refuses a blank title, and autosave can fire while the field is
    // mid-edit, so a blank title goes in under the untitled name.
    const current = {
      title: titleRef.current.trim() || UNTITLED,
      content: contentRef.current,
    }

    if (current.title === savedRef.current.title && current.content === savedRef.current.content) {
      return
    }

    if (!id) return

    // A draft has no record yet. The first real change creates one, keeps the
    // new id, and swaps the URL for the saved note's route.
    if (id === 'new') {
      if (draftSavingRef.current) return

      draftSavingRef.current = true
      setSaveStatus('saving')

      try {
        const created = await saveItem({
          kind: 'note',
          title: current.title,
          content: current.content,
        })
        createdIdRef.current = created.id
        savedRef.current = current
        setItem(created)
        setSaveStatus('saved')
        setActionError(null)
        navigate(`/notes/${created.id}`, { replace: true })
      } catch {
        setSaveStatus('idle')
        setActionError('Kivo could not save this note. Your changes are still here. Try again.')
      } finally {
        draftSavingRef.current = false
      }

      return
    }

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
      setActionError(null)
    } catch {
      setSaveStatus('idle')
      setActionError('Kivo could not save this note. Your changes are still here. Try again.')
    }
  }, [id, navigate])

  const scheduleSave = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void flush()
    }, AUTOSAVE_DELAY)
  }, [flush])

  useEffect(() => {
    // After a draft is created the route param becomes the new id, but the
    // local state already holds the saved note. Reloading would remount the
    // content editor and drop the caret, so skip the whole load.
    if (createdIdRef.current === id) return

    // Any other route is a fresh load; the created note is no longer local.
    createdIdRef.current = null

    let active = true
    loadedRef.current = false
    setLoadState('loading')

    if (id === 'new') {
      setItem(null)
      setTitle('')
      setContent('')
      titleRef.current = ''
      contentRef.current = ''
      savedRef.current = { title: UNTITLED, content: '' }
      metaRef.current = {
        description: '',
        collectionId: null,
        isFavorite: false,
        isPinned: false,
      }
      editorKeyRef.current = 'draft'
      loadedRef.current = true
      setLoadState('ready')
      return
    }

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
        editorKeyRef.current = loaded.id
        loadedRef.current = true
        setLoadState('ready')
        void markItemOpened(loaded.id).catch(() => undefined)
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

  // The title holds one line inside the note panel's column. When the text
  // outgrows that room its size steps down instead of clipping at the edge.
  useLayoutEffect(() => {
    const field = titleFieldRef.current
    if (!field) return

    const fit = () => {
      field.style.fontSize = ''

      const room = field.clientWidth
      const needed = field.scrollWidth

      if (room > 0 && needed > room) {
        const fitted = Math.max(MIN_TITLE_FONT_SIZE, (TITLE_FONT_SIZE * room) / needed)
        field.style.fontSize = `${fitted}px`
      }
    }

    fit()
    window.addEventListener('resize', fit)

    return () => window.removeEventListener('resize', fit)
  }, [title, loadState])

  function handleTitleChange(next: string) {
    titleRef.current = next
    setTitle(next)
    setSaveStatus('idle')
    scheduleSave()
  }

  function handleContentChange(html: string) {
    contentRef.current = toStoredContent(html)
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
        title: titleRef.current.trim() || UNTITLED,
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

    const moved = await trashWithUndo({ ids: [item.id], label: 'Note' })
    if (moved) navigate('/notes')
    else setTrashOpen(false)
  }

  const isDraft = loadState === 'ready' && item === null

  if (loadState === 'loading') {
    return (
      <section aria-labelledby="note-editor-title" className="grid gap-8">
        <PageHeader title="Note" titleId="note-editor-title" />
        <div aria-live="polite" className="grid gap-5" role="status">
          <Typography className="sr-only">
            Loading your note. Kivo is reading this note on this device.
          </Typography>
          <div aria-hidden="true" className="grid gap-5">
            <Skeleton className="h-12 w-3/4 rounded-md" />
            <Skeleton className="h-[60vh] min-h-[24rem] rounded-3xl" />
          </div>
        </div>
      </section>
    )
  }

  if (loadState === 'missing') {
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
    <section aria-labelledby="note-editor-title" className="grid gap-5">
      <h1 className="sr-only" id="note-editor-title">
        {title.trim() || UNTITLED}
      </h1>

      <Link
        className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        to="/notes"
      >
        <HugeiconsIcon aria-hidden="true" icon={ArrowLeft01Icon} size={18} />
        Back
      </Link>

      <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <input
          aria-label="Title"
          className="min-w-0 border-0 bg-transparent text-[2.5rem] leading-tight font-semibold tracking-tight text-foreground outline-none placeholder:text-muted"
          placeholder={UNTITLED}
          ref={titleFieldRef}
          value={title}
          onChange={(event) => handleTitleChange(event.target.value)}
        />
        {!isDraft && item ? (
          <div className="flex justify-end">
            <ButtonGroup aria-label="Note actions" size="lg" variant="tertiary">
              <Button
                variant={item.isPinned ? 'primary' : undefined}
                onPress={() => void handlePin(!item.isPinned)}
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={item.isPinned ? PinOffIcon : PinIcon}
                  size={18}
                />
                {item.isPinned ? 'Unpin' : 'Pin'}
              </Button>
              <Button
                variant={item.isFavorite ? 'primary' : undefined}
                onPress={() => void handleFavorite(!item.isFavorite)}
              >
                <ButtonGroup.Separator />
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={item.isFavorite ? StarOffIcon : StarIcon}
                  size={18}
                />
                {item.isFavorite ? 'Remove from Favorite' : 'Add to Favorite'}
              </Button>
            </ButtonGroup>
          </div>
        ) : null}
      </div>

      {actionError ? (
        <Typography className="font-semibold text-danger" role="alert" type="body">
          {actionError}
        </Typography>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <NoteContentEditor
          key={editorKeyRef.current}
          initialHtml={toEditorHtml(content)}
          status={STATUS_TEXT[saveStatus]}
          onChange={handleContentChange}
        />

        {!isDraft && item ? (
          <div className="grid gap-4">
            <aside
              aria-label="Note settings"
              className="grid gap-4 rounded-3xl border border-default bg-surface p-4"
            >
              <NoteTagField value={item.tags} onChange={(next) => void handleTags(next)} />

              <Separator />

              <CollectionSelect
                label="Collection"
                value={item.collectionId}
                onChange={(next) => void handleCollection(next)}
              />
            </aside>

            <Button className="w-full" size="lg" variant="danger" onPress={() => setTrashOpen(true)}>
              <HugeiconsIcon aria-hidden="true" icon={Delete02Icon} size={18} />
              Delete Note
            </Button>
          </div>
        ) : null}
      </div>

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

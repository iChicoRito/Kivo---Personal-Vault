import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Chip,
  EmptyState,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
  Typography,
} from '@heroui/react'
import { Delete02Icon, EyeIcon, FolderOpenIcon, NoteEditIcon } from '@hugeicons/core-free-icons'

import PageHeader from '../../app/PageHeader'
import { CollectionSelect, ConfirmDialog } from '../../components/items/dialogs'
import { FileTypeIcon } from '../../components/items/FileTypeIcon'
import { ItemCard, type ItemCardAction } from '../../components/items/ItemCard'
import {
  importFile,
  listItems,
  loadItem,
  moveItemsToCollection,
  saveItem,
  trashItems,
  type ItemSummary,
} from '../../data/items'
import { openItemFile, pickFile, revealItemFile } from '../../data/files'

type LoadState = 'loading' | 'ready' | 'error'

const stateLabelClass = 'uppercase'

const IMPORT_ERROR = 'Kivo could not import that file. Try again.'
const OPEN_ERROR = 'Kivo could not open this file. It may be missing from this device.'
const REVEAL_ERROR = 'Kivo could not reveal this file. It may be missing from this device.'
const RENAME_ERROR = 'Kivo could not rename this file. Try again.'
const MOVE_ERROR = 'Kivo could not move this file. Try again.'
const TRASH_ERROR = 'Kivo could not move this file to Trash. Try again.'

function formatSize(bytes: number | null | undefined) {
  if (typeof bytes !== 'number' || bytes < 0) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let unit = 0

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }

  const rounded = size >= 10 ? Math.round(size) : Math.round(size * 10) / 10
  return `${rounded} ${units[unit]}`
}

type RenameState = { id: string; title: string } | null
type MoveState = { id: string; collectionId: string | null } | null

export function FilesPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)
  const [files, setFiles] = useState<ItemSummary[]>([])

  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [renameTarget, setRenameTarget] = useState<RenameState>(null)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState<MoveState>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [trashTarget, setTrashTarget] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    setLoadState('loading')

    try {
      const loaded = await listItems({ kind: 'file' })
      setFiles(loaded)
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void loadFiles()
  }, [loadFiles, attempt])

  async function handleImport() {
    setActionError(null)

    let path: string | null

    try {
      path = await pickFile()
    } catch {
      setActionError(IMPORT_ERROR)
      return
    }

    if (!path) return

    setBusy(true)

    try {
      await importFile(path)
      await loadFiles()
    } catch {
      setActionError(IMPORT_ERROR)
    } finally {
      setBusy(false)
    }
  }

  async function handleOpen(id: string) {
    setActionError(null)

    try {
      await openItemFile(id)
    } catch {
      setActionError(OPEN_ERROR)
    }
  }

  async function handleReveal(id: string) {
    setActionError(null)

    try {
      await revealItemFile(id)
    } catch {
      setActionError(REVEAL_ERROR)
    }
  }

  function handleFileAction(file: ItemSummary, key: string) {
    if (key === 'open') void handleOpen(file.id)
    else if (key === 'reveal') void handleReveal(file.id)
    else if (key === 'rename') openRename(file)
    else if (key === 'move') {
      setMoveError(null)
      setMoveTarget({ id: file.id, collectionId: file.collectionId })
    } else if (key === 'trash') setTrashTarget(file.id)
  }

  function openRename(file: ItemSummary) {
    setRenameError(null)
    setRenameTarget({ id: file.id, title: file.title })
  }

  async function handleRename() {
    if (!renameTarget) return

    const title = renameTarget.title.trim()

    if (!title) {
      setRenameError('File title is required.')
      return
    }

    setRenameError(null)

    try {
      const loaded = await loadItem(renameTarget.id)

      await saveItem({
        id: loaded.id,
        kind: loaded.kind,
        title,
        description: loaded.description,
        collectionId: loaded.collectionId,
        isFavorite: loaded.isFavorite,
        isPinned: loaded.isPinned,
      })

      setRenameTarget(null)
      await loadFiles()
    } catch {
      setRenameError(RENAME_ERROR)
    }
  }

  async function handleMove() {
    if (!moveTarget) return

    setMoveError(null)

    try {
      await moveItemsToCollection([moveTarget.id], moveTarget.collectionId)
      setMoveTarget(null)
      await loadFiles()
    } catch {
      setMoveError(MOVE_ERROR)
    }
  }

  async function handleTrash() {
    if (!trashTarget) return

    const id = trashTarget
    setTrashTarget(null)
    setActionError(null)

    try {
      await trashItems([id])
      await loadFiles()
    } catch {
      setActionError(TRASH_ERROR)
    }
  }

  const heading = (
    <PageHeader
      description="Keep local files within reach."
      title="Files"
      titleId="files-title"
    />
  )

  if (loadState === 'loading') {
    return (
      <section aria-labelledby="files-title" className="grid gap-5">
        {heading}
        <Card aria-labelledby="files-loading-title" aria-live="polite" role="status">
          <Card.Content className="grid gap-2">
            <Typography className={stateLabelClass} color="muted" type="body-xs" weight="bold">
              LOADING
            </Typography>
            <Typography id="files-loading-title" type="h2">
              Loading your files
            </Typography>
            <Typography color="muted" type="body">
              Kivo is reading file records for this vault.
            </Typography>
          </Card.Content>
        </Card>
      </section>
    )
  }

  if (loadState === 'error') {
    return (
      <section aria-labelledby="files-title" className="grid gap-5">
        {heading}
        <Alert aria-labelledby="files-error-title" role="alert" status="danger">
          <Alert.Content className="grid gap-3">
            <Typography className={stateLabelClass} color="muted" type="body-xs" weight="bold">
              ERROR
            </Typography>
            <Typography id="files-error-title" type="h2">
              Your files could not load
            </Typography>
            <Typography type="body">
              Kivo could not read saved file records. Try again to reload this list.
            </Typography>
            <Button
              className="justify-self-start"
              variant="secondary"
              onPress={() => setAttempt((value) => value + 1)}
            >
              Try again
            </Button>
          </Alert.Content>
        </Alert>
      </section>
    )
  }

  return (
    <section aria-labelledby="files-title" className="grid gap-5">
      {heading}

      <div className="flex flex-wrap items-center gap-3">
        <Button isDisabled={busy} onPress={() => void handleImport()}>
          Import file
        </Button>
      </div>

      {actionError ? (
        <Typography className="font-semibold text-danger" role="alert" type="body">
          {actionError}
        </Typography>
      ) : null}

      {files.length === 0 ? (
        <EmptyState className="grid justify-items-start gap-3">
          <Typography type="h2">No files yet.</Typography>
          <Typography color="muted" type="body">
            Files added to this device will appear here.
          </Typography>
        </EmptyState>
      ) : (
        <ul className="grid gap-2">
          {files.map((file) => {
            const actions: ItemCardAction[] = [
              { id: 'open', label: 'Open', icon: EyeIcon, isDisabled: file.fileMissing },
              { id: 'reveal', label: 'Reveal', icon: FolderOpenIcon, isDisabled: file.fileMissing },
              { id: 'rename', label: 'Rename', icon: NoteEditIcon },
              { id: 'move', label: 'Move to collection', icon: FolderOpenIcon },
              { id: 'trash', label: 'Move to trash', icon: Delete02Icon, danger: true },
            ]

            return (
              <li key={file.id} className="min-w-0">
                <ItemCard
                  actions={actions}
                  chips={
                    file.fileMissing ? (
                      <Chip color="danger" size="sm" variant="soft">
                        File is missing
                      </Chip>
                    ) : undefined
                  }
                  isOpenDisabled={file.fileMissing}
                  leading={
                    <span className="grid size-11 place-items-center rounded-xl bg-default">
                      <FileTypeIcon name={file.file?.originalName ?? file.title} size={22} />
                    </span>
                  }
                  subtitle={
                    <Typography color="muted" type="body-xs">
                      {formatSize(file.file?.byteSize)}
                    </Typography>
                  }
                  title={file.title}
                  onAction={(key) => handleFileAction(file, key)}
                  onOpen={() => {
                    void handleOpen(file.id)
                  }}
                />
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        isOpen={renameTarget !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setRenameTarget(null)
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Rename file</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <TextField
                  isInvalid={renameError !== null}
                  value={renameTarget?.title ?? ''}
                  onChange={(value) =>
                    setRenameTarget((current) => (current ? { ...current, title: value } : current))
                  }
                >
                  <Label>File title</Label>
                  <Input fullWidth variant="secondary" />
                  {renameError ? <FieldError>{renameError}</FieldError> : null}
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setRenameTarget(null)}>
                  Cancel
                </Button>
                <Button onPress={() => void handleRename()}>Save name</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal
        isOpen={moveTarget !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setMoveTarget(null)
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Move file to collection</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-3">
                <CollectionSelect
                  label="Collection"
                  value={moveTarget?.collectionId ?? null}
                  onChange={(value) =>
                    setMoveTarget((current) =>
                      current ? { ...current, collectionId: value } : current,
                    )
                  }
                />
                {moveError ? (
                  <Typography className="font-semibold text-danger" role="alert" type="body">
                    {moveError}
                  </Typography>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setMoveTarget(null)}>
                  Cancel
                </Button>
                <Button onPress={() => void handleMove()}>Move</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ConfirmDialog
        confirmLabel="Move to Trash"
        description="This file leaves your library and stays in Trash. The stored file is not deleted."
        open={trashTarget !== null}
        title="Move this file to Trash?"
        tone="danger"
        onCancel={() => setTrashTarget(null)}
        onConfirm={() => void handleTrash()}
      />
    </section>
  )
}

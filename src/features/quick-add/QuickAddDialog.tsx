import { useState } from 'react'
import {
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
  Typography,
} from '@heroui/react'
import { useNavigate } from 'react-router-dom'

import { saveCollection } from '../../data/collections'
import { importFile, saveItem } from '../../data/items'
import { pickFile } from '../../data/files'
import SaveSourceDialog from '../sources/SaveSourceDialog'

type QuickAddDialogProps = {
  open: boolean
  onClose: () => void
}

const NOTE_ERROR = 'Kivo could not create a note. Try again.'
const IMPORT_ERROR = 'Kivo could not import that file. Try again.'
const COLLECTION_ERROR = 'Kivo could not create the collection. Try again.'
const COLLECTION_REQUIRED = 'Collection name is required.'

export function QuickAddDialog({ open, onClose }: QuickAddDialogProps) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'menu' | 'collection'>('menu')
  const [collectionName, setCollectionName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)

  function close() {
    setMode('menu')
    setCollectionName('')
    setError(null)
    onClose()
  }

  async function handleNewNote() {
    setError(null)
    setBusy(true)

    try {
      const note = await saveItem({ kind: 'note', title: 'Untitled note' })
      close()
      navigate(`/notes/${note.id}`)
    } catch {
      setError(NOTE_ERROR)
    } finally {
      setBusy(false)
    }
  }

  function handleNewSource() {
    setError(null)
    setSourceOpen(true)
    close()
  }

  async function handleImport() {
    setError(null)

    let path: string | null

    try {
      path = await pickFile()
    } catch {
      setError(IMPORT_ERROR)
      return
    }

    if (!path) {
      close()
      return
    }

    setBusy(true)

    try {
      await importFile(path)
      close()
      navigate('/files')
    } catch {
      setError(IMPORT_ERROR)
    } finally {
      setBusy(false)
    }
  }

  async function handleNewCollection() {
    const name = collectionName.trim()

    if (!name) {
      setError(COLLECTION_REQUIRED)
      return
    }

    setError(null)
    setBusy(true)

    try {
      await saveCollection({ name })
      close()
      navigate('/collections')
    } catch {
      setError(COLLECTION_ERROR)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal
        isOpen={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) close()
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Quick add</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-4">
                {error ? (
                  <Typography className="font-semibold text-danger" role="alert" type="body">
                    {error}
                  </Typography>
                ) : null}

                {mode === 'menu' ? (
                  <div className="grid gap-2">
                    <Button isDisabled={busy} onPress={() => void handleNewNote()}>
                      New note
                    </Button>
                    <Button isDisabled={busy} variant="secondary" onPress={handleNewSource}>
                      New source
                    </Button>
                    <Button isDisabled={busy} variant="secondary" onPress={() => void handleImport()}>
                      Import file
                    </Button>
                    <Button
                      isDisabled={busy}
                      variant="secondary"
                      onPress={() => {
                        setError(null)
                        setMode('collection')
                      }}
                    >
                      New collection
                    </Button>
                  </div>
                ) : (
                  <TextField
                    isInvalid={error === COLLECTION_REQUIRED}
                    value={collectionName}
                    onChange={setCollectionName}
                  >
                    <Label>Collection name</Label>
                    <Input fullWidth variant="secondary" />
                    {error === COLLECTION_REQUIRED ? <FieldError>{error}</FieldError> : null}
                  </TextField>
                )}
              </Modal.Body>
              <Modal.Footer>
                {mode === 'collection' ? (
                  <>
                    <Button variant="secondary" onPress={() => setMode('menu')}>
                      Back
                    </Button>
                    <Button isDisabled={busy} onPress={() => void handleNewCollection()}>
                      Create collection
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" onPress={close}>
                    Cancel
                  </Button>
                )}
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <SaveSourceDialog
        itemId={null}
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onSaved={() => setSourceOpen(false)}
      />
    </>
  )
}

export default QuickAddDialog

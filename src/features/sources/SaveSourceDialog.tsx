import { useEffect, useState } from 'react'
import {
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react'

import { loadItem, saveItem, type VaultItem } from '../../data/items'

const ADDRESS_REQUIRED = 'Address is required.'
const ADDRESS_INVALID = 'Address must start with http:// or https://.'
const TITLE_REQUIRED = 'Title is required.'
const SAVE_ERROR = 'Kivo could not save this source. Try again.'
const LOAD_ERROR = 'Kivo could not load this source.'

type FieldErrors = {
  address?: string
  title?: string
}

type SaveSourceDialogProps = {
  open: boolean
  onClose: () => void
  itemId?: string | null
  onSaved: () => void
}

export function SaveSourceDialog({ open, onClose, itemId, onSaved }: SaveSourceDialogProps) {
  const [address, setAddress] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState<VaultItem | null>(null)

  useEffect(() => {
    if (!open) return

    setErrors({})
    setFormError(null)

    if (!itemId) {
      setAddress('')
      setTitle('')
      setDescription('')
      setNote('')
      setLoaded(null)
      return
    }

    let active = true
    setLoading(true)

    loadItem(itemId)
      .then((item) => {
        if (!active) return
        setAddress(item.url ?? '')
        setTitle(item.title)
        setDescription(item.description)
        setNote(item.content ?? '')
        setLoaded(item)
      })
      .catch(() => {
        if (active) setFormError(LOAD_ERROR)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [open, itemId])

  function validate() {
    const next: FieldErrors = {}
    const addressValue = address.trim()

    if (!addressValue) next.address = ADDRESS_REQUIRED
    else if (!/^https?:\/\//i.test(addressValue)) next.address = ADDRESS_INVALID

    if (!title.trim()) next.title = TITLE_REQUIRED

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit() {
    setFormError(null)
    if (!validate()) return

    setBusy(true)

    try {
      await saveItem({
        id: itemId ?? undefined,
        kind: 'source',
        title: title.trim(),
        description: description.trim(),
        url: address.trim(),
        content: note,
        collectionId: loaded?.collectionId ?? null,
        isFavorite: loaded?.isFavorite ?? false,
        isPinned: loaded?.isPinned ?? false,
      })
      onSaved()
      onClose()
    } catch {
      setFormError(SAVE_ERROR)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{itemId ? 'Edit source' : 'New source'}</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="grid gap-4">
              <form
                className="grid gap-4"
                id="save-source-form"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleSubmit()
                }}
              >
                <TextField
                  isRequired
                  isInvalid={errors.address !== undefined}
                  type="url"
                  value={address}
                  onChange={(value) => {
                    setAddress(value)
                    setErrors((current) => ({ ...current, address: undefined }))
                  }}
                >
                  <Label>Address</Label>
                  <Input fullWidth placeholder="https://example.com" variant="secondary" />
                  {errors.address ? <FieldError>{errors.address}</FieldError> : null}
                </TextField>

                <TextField
                  isRequired
                  isInvalid={errors.title !== undefined}
                  value={title}
                  onChange={(value) => {
                    setTitle(value)
                    setErrors((current) => ({ ...current, title: undefined }))
                  }}
                >
                  <Label>Title</Label>
                  <Input fullWidth variant="secondary" />
                  {errors.title ? <FieldError>{errors.title}</FieldError> : null}
                </TextField>

                <TextField value={description} onChange={setDescription}>
                  <Label>Description</Label>
                  <Input fullWidth variant="secondary" />
                </TextField>

                <TextField value={note} onChange={setNote}>
                  <Label>Personal note</Label>
                  <TextArea className="min-h-24" fullWidth variant="secondary" />
                </TextField>
              </form>

              {loading ? (
                <Typography color="muted" type="body-xs">
                  Loading source...
                </Typography>
              ) : null}

              {formError ? (
                <Typography className="font-semibold text-danger" role="alert" type="body">
                  {formError}
                </Typography>
              ) : null}
            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Cancel
              </Button>
              <Button isDisabled={busy || loading} onPress={() => void handleSubmit()}>
                Save
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

export default SaveSourceDialog

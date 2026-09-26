import { Button, Modal } from '@heroui/react'
import { shortcuts } from '../../app/shortcuts'

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <Modal isOpen={open} onOpenChange={(next) => { if (!next) onClose() }}><Modal.Backdrop><Modal.Container><Modal.Dialog>
    <Modal.Header><Modal.Heading>Keyboard shortcuts</Modal.Heading></Modal.Header>
    <Modal.Body><dl className="grid gap-2">{shortcuts.map((shortcut) => <div key={shortcut.id} className="flex justify-between gap-3"><dt>{shortcut.label}</dt><dd className="font-mono">Ctrl/{'⌘'}+{shortcut.shift ? 'Shift+' : ''}{shortcut.key.toUpperCase()}</dd></div>)}</dl></Modal.Body>
    <Modal.Footer><Button onPress={onClose}>Close</Button></Modal.Footer>
  </Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>
}

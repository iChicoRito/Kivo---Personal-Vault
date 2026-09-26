import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LockProvider, useLock } from '../app/lock'
import { getTauriInvoke } from './setup'

function Probe() {
  const lock = useLock()?.lock
  return <><span>Vault content</span><button onClick={() => void lock?.()}>Lock Kivo</button></>
}

beforeEach(() => getTauriInvoke().mockReset())
afterEach(() => vi.useRealTimers())

it('manual lock hides content and clears both content and password manager keys', async () => {
  getTauriInvoke().mockImplementation((command: string) => Promise.resolve(
    command === 'read_protection_state' ? { lockEnabled: true, encryptionEnabled: false } :
    command === 'load_password_verifier' ? 'hash' : command === 'verify_password' ? true : undefined,
  ))
  render(<LockProvider initialLocked={false} autoLockMinutes={0}><Probe /></LockProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Lock Kivo' }))
  await waitFor(() => expect(screen.queryByText('Vault content')).not.toBeInTheDocument())
  expect(getTauriInvoke()).toHaveBeenCalledWith('lock_content_vault')
  expect(getTauriInvoke()).toHaveBeenCalledWith('lock_vault')
  fireEvent.change(screen.getByLabelText('Master Password'), { target: { value: 'secret' } })
  fireEvent.click(screen.getByRole('button', { name: 'Unlock Kivo' }))
  await waitFor(() => expect(screen.getByText('Vault content')).toBeInTheDocument())
})

it('activity resets inactivity deadline, and zero disables automatic lock', async () => {
  vi.useFakeTimers()
  getTauriInvoke().mockResolvedValue(undefined)
  const view = render(<LockProvider initialLocked={false} autoLockMinutes={5}><Probe /></LockProvider>)
  await act(async () => { vi.advanceTimersByTime(4 * 60_000); fireEvent.keyDown(window); vi.advanceTimersByTime(4 * 60_000) })
  expect(screen.getByText('Vault content')).toBeInTheDocument()
  await act(async () => { vi.advanceTimersByTime(60_000) })
  expect(screen.queryByText('Vault content')).not.toBeInTheDocument()
  view.unmount()
  render(<LockProvider initialLocked={false} autoLockMinutes={0}><Probe /></LockProvider>)
  await act(async () => { vi.advanceTimersByTime(60 * 60_000) })
  expect(screen.getByText('Vault content')).toBeInTheDocument()
})

it('hides the routes behind the unlock page while locked, then reveals them after unlock', async () => {
  getTauriInvoke().mockImplementation((command: string) => Promise.resolve(
    command === 'read_protection_state' ? { lockEnabled: true, encryptionEnabled: false } :
    command === 'load_password_verifier' ? '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA' :
    command === 'verify_password' ? true : undefined,
  ))

  render(
    <MemoryRouter>
      <LockProvider initialLocked autoLockMinutes={0}>
        <Routes>
          <Route path="*" element={<div>Dashboard routes</div>} />
        </Routes>
      </LockProvider>
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'Unlock your vault' })).toBeInTheDocument()
  expect(screen.queryByText('Dashboard routes')).not.toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Master Password'), { target: { value: 'secret' } })
  fireEvent.click(screen.getByRole('button', { name: 'Unlock Kivo' }))

  await waitFor(() => expect(screen.getByText('Dashboard routes')).toBeInTheDocument())
})

import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { completeSetup, type SetupInput } from '../data/setup'
import { hashPassword } from '../data/security'
import OnboardingPage from '../features/onboarding/OnboardingPage'
import { STARTER_COLLECTIONS } from '../features/onboarding/onboarding'

vi.mock('../data/setup', () => ({
  completeSetup: vi.fn(),
}))

vi.mock('../data/security', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}))

const completeSetupMock = vi.mocked(completeSetup)
const hashPasswordMock = vi.mocked(hashPassword)

function renderOnboarding(onCompleted = vi.fn()) {
  render(<OnboardingPage onCompleted={onCompleted} />)

  return { onCompleted }
}

function clickButton(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

function ownerInput() {
  return screen.getByLabelText('Your name')
}

function passwordInput() {
  return screen.getByLabelText('Master Password')
}

function confirmInput() {
  return screen.getByLabelText('Confirm Password')
}

function typeInto(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } })
}

function reachProfile(ownerName = 'Ada') {
  clickButton('Get Started')
  typeInto(ownerInput(), ownerName)
}

function reachCollections(ownerName = 'Ada') {
  reachProfile(ownerName)
  clickButton('Save name')
}

function reachLock(ownerName = 'Ada') {
  reachCollections(ownerName)
  clickButton('Submit')
}

async function createVault(ownerName = 'Ada') {
  reachLock(ownerName)
  clickButton('Create Password')

  await waitFor(() => expect(screen.getByRole('heading', { name: 'Congrats! Your vault has been created' })).toBeInTheDocument())
}

function lastSetupInput(): SetupInput {
  const calls = completeSetupMock.mock.calls

  return calls[calls.length - 1][0]
}

describe('OnboardingPage steps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hashPasswordMock.mockResolvedValue('encoded-verifier')
    completeSetupMock.mockResolvedValue(undefined)
  })

  it('starts with Figma chrome and no step-label strip', () => {
    renderOnboarding()

    expect(screen.getByRole('heading', { name: 'Everything important, in one place.' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Keep your notes, files, useful links, documents, and personal information organized inside your own private vault.',
      ),
    ).toHaveClass('text-center')
    expect(screen.queryByRole('list', { name: 'Setup steps' })).not.toBeInTheDocument()
    expect(screen.queryByText('KIVO', { selector: 'p' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('matches the Figma welcome and profile controls', () => {
    renderOnboarding()

    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set Up My Vault' })).not.toBeInTheDocument()

    clickButton('Get Started')

    expect(screen.getByRole('heading', { name: 'Make Kivo yours' })).toBeInTheDocument()
    expect(screen.getByText('Tell us a little about how you want your personal vault to be set up.')).toBeInTheDocument()
    expect(ownerInput()).toHaveAttribute('placeholder', 'Enter your Name')
    expect(screen.getByRole('button', { name: 'Save name' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Go back' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Name your vault')).not.toBeInTheDocument()
  })

  it('renders onboarding content without a Card surface', () => {
    const { container } = render(<OnboardingPage />)

    expect(container.querySelector('[data-slot="card"]')).not.toBeInTheDocument()
  })

  it('moves focus to the step heading on every forward transition', async () => {
    renderOnboarding()

    expect(screen.getByRole('heading', { name: 'Everything important, in one place.' })).toHaveFocus()

    clickButton('Get Started')
    expect(screen.getByRole('heading', { name: 'Make Kivo yours' })).toHaveFocus()

    typeInto(ownerInput(), 'Ada')
    clickButton('Save name')
    expect(screen.getByRole('heading', { name: 'What will you keep in Kivo' })).toHaveFocus()

    clickButton('Submit')
    expect(screen.getByRole('heading', { name: 'Keep your vault private' })).toHaveFocus()

    clickButton('Create Password')
    expect(
      await screen.findByRole('heading', { name: 'Congrats! Your vault has been created' }),
    ).toHaveFocus()
  })

  it('supports back transitions from collections and lock and keeps the draft', () => {
    renderOnboarding()
    reachCollections('Ada')

    clickButton('Go back')
    expect(screen.getByRole('heading', { name: 'Make Kivo yours' })).toBeInTheDocument()
    expect(ownerInput()).toHaveValue('Ada')

    clickButton('Save name')
    clickButton('Submit')
    expect(screen.getByRole('heading', { name: 'Keep your vault private' })).toBeInTheDocument()

    clickButton('Go back')
    expect(screen.getByRole('heading', { name: 'What will you keep in Kivo' })).toBeInTheDocument()
  })
})

describe('OnboardingPage owner name', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hashPasswordMock.mockResolvedValue('encoded-verifier')
    completeSetupMock.mockResolvedValue(undefined)
  })

  it('renders the profile field as a visible full-width HeroUI input', () => {
    renderOnboarding()
    reachProfile()

    expect(ownerInput()).toHaveClass('input--secondary', 'input--full-width')
    expect(screen.queryByLabelText('Name your vault')).not.toBeInTheDocument()
  })

  it('requires a trimmed owner name and focuses the invalid field', () => {
    renderOnboarding()
    clickButton('Get Started')

    clickButton('Save name')

    expect(screen.getByText('Enter the name Kivo should use for you.')).toBeInTheDocument()
    expect(ownerInput()).toHaveFocus()
    expect(ownerInput()).toHaveAttribute('aria-invalid', 'true')
    expect(ownerInput()).toHaveAccessibleDescription('Enter the name Kivo should use for you.')
    expect(screen.getByRole('heading', { name: 'Make Kivo yours' })).toBeInTheDocument()

    typeInto(ownerInput(), '   ')
    clickButton('Save name')
    expect(screen.getByText('Enter the name Kivo should use for you.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Make Kivo yours' })).toBeInTheDocument()
  })

  it('generates the vault name from the trimmed owner name when the vault field is empty', async () => {
    renderOnboarding()
    await createVault('  Ada  ')

    expect(lastSetupInput()).toEqual({
      ownerName: 'Ada',
      vaultName: "Ada's Vault",
      starterCollections: [],
      passwordVerifier: null,
    })
  })

})

describe('OnboardingPage starter collections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hashPasswordMock.mockResolvedValue('encoded-verifier')
    completeSetupMock.mockResolvedValue(undefined)
  })

  it('shows the documented collections unselected with descriptions', () => {
    renderOnboarding()
    reachCollections()

    for (const collection of STARTER_COLLECTIONS) {
      expect(screen.getByRole('checkbox', { name: collection })).not.toBeChecked()
    }

    expect(screen.getAllByRole('checkbox')).toHaveLength(STARTER_COLLECTIONS.length)
    expect(screen.getByRole('group', { name: 'Starter collections' })).toBeInTheDocument()
    expect(screen.getByText('Active plans, tasks, and work in progress')).toBeInTheDocument()
  })

  it('passes the selected collections to setup', async () => {
    renderOnboarding()
    reachCollections()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Projects' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Work' }))
    clickButton('Submit')
    clickButton('Create Password')

    await waitFor(() => expect(completeSetupMock).toHaveBeenCalledTimes(1))
    expect(lastSetupInput().starterCollections).toEqual(['Projects', 'Work'])
  })

  it('saves no collections when the user skips', async () => {
    renderOnboarding()
    reachCollections()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Projects' }))
    clickButton('Skip for now')
    clickButton('Create Password')

    await waitFor(() => expect(completeSetupMock).toHaveBeenCalledTimes(1))
    expect(lastSetupInput().starterCollections).toEqual([])
  })
})

describe('OnboardingPage app lock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hashPasswordMock.mockResolvedValue('encoded-verifier')
    completeSetupMock.mockResolvedValue(undefined)
  })

  it('shows the Figma lock copy without extra paragraphs', () => {
    renderOnboarding()
    reachLock()

    expect(
      screen.getByText(
        "Add a Master Password to lock Kivo and help protect your personal information when you're away from your device",
      ),
    ).toBeInTheDocument()
    expect(passwordInput()).toHaveAttribute('placeholder', 'Enter master password')
    expect(confirmInput()).toHaveAttribute('placeholder', 'Enter master password')
    expect(screen.queryByText('Storage: This Device')).not.toBeInTheDocument()
    expect(
      screen.queryByText('App lock keeps Kivo closed to other people. It does not encrypt your files.'),
    ).not.toBeInTheDocument()
  })

  it('renders both password fields as password inputs', () => {
    renderOnboarding()
    reachLock()

    expect(passwordInput()).toHaveAttribute('type', 'password')
    expect(confirmInput()).toHaveAttribute('type', 'password')
  })

  it('rejects a password mismatch, focuses the confirm field, and does not save', () => {
    renderOnboarding()
    reachLock()
    typeInto(passwordInput(), 'hunter two')
    typeInto(confirmInput(), 'hunter three')
    clickButton('Create Password')

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(confirmInput()).toHaveFocus()
    expect(confirmInput()).toHaveAttribute('aria-invalid', 'true')
    expect(confirmInput()).toHaveAccessibleDescription('Passwords do not match.')
    expect(hashPasswordMock).not.toHaveBeenCalled()
    expect(completeSetupMock).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Keep your vault private' })).toBeInTheDocument()
  })

  it('hashes the password and passes only the verifier to setup', async () => {
    renderOnboarding()
    reachLock()
    typeInto(passwordInput(), 'hunter two')
    typeInto(confirmInput(), 'hunter two')
    clickButton('Create Password')

    await waitFor(() => expect(completeSetupMock).toHaveBeenCalledTimes(1))

    expect(hashPasswordMock).toHaveBeenCalledWith('hunter two')
    const input = lastSetupInput()
    expect(input.passwordVerifier).toBe('encoded-verifier')
    expect(JSON.stringify(input)).not.toContain('hunter two')
  })

  it('skips the password without hashing', async () => {
    renderOnboarding()
    reachLock()
    clickButton('Skip for now')

    await waitFor(() => expect(completeSetupMock).toHaveBeenCalledTimes(1))

    expect(hashPasswordMock).not.toHaveBeenCalled()
    expect(lastSetupInput().passwordVerifier).toBeNull()
    expect(screen.getByRole('heading', { name: 'Congrats! Your vault has been created' })).toBeInTheDocument()
  })

  it('shows an error and does not save when hashing the password fails', async () => {
    hashPasswordMock.mockRejectedValue(new Error('hash failed'))
    renderOnboarding()
    reachLock()
    typeInto(passwordInput(), 'hunter two')
    typeInto(confirmInput(), 'hunter two')
    clickButton('Create Password')

    await waitFor(() =>
      expect(
        screen.getByText('We could not create your vault. Your details are still here. Try again.'),
      ).toBeInTheDocument(),
    )

    expect(completeSetupMock).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Keep your vault private' })).toBeInTheDocument()
  })

  it('keeps the draft and shows a generic error when saving fails', async () => {
    completeSetupMock.mockRejectedValue(new Error('transaction failed'))
    renderOnboarding()
    reachCollections()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Work' }))
    clickButton('Submit')
    typeInto(passwordInput(), 'hunter two')
    typeInto(confirmInput(), 'hunter two')
    clickButton('Create Password')

    await waitFor(() =>
      expect(
        screen.getByText('We could not create your vault. Your details are still here. Try again.'),
      ).toBeInTheDocument(),
    )

    expect(screen.getByRole('heading', { name: 'Keep your vault private' })).toBeInTheDocument()

    clickButton('Go back')
    expect(
      screen.queryByText('We could not create your vault. Your details are still here. Try again.'),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Work' })).toBeChecked()
    clickButton('Submit')
    expect(
      screen.queryByText('We could not create your vault. Your details are still here. Try again.'),
    ).not.toBeInTheDocument()
    expect(passwordInput()).toHaveValue('hunter two')
    expect(confirmInput()).toHaveValue('hunter two')
  })
})

describe('OnboardingPage completion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hashPasswordMock.mockResolvedValue('encoded-verifier')
    completeSetupMock.mockResolvedValue(undefined)
  })

  it('shows the Figma completion screen without a summary list', async () => {
    renderOnboarding()
    reachCollections('Ada')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Projects' }))
    clickButton('Submit')
    typeInto(passwordInput(), 'hunter two')
    typeInto(confirmInput(), 'hunter two')
    clickButton('Create Password')

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Congrats! Your vault has been created' })).toBeInTheDocument())

    expect(screen.queryByText("Ada's Vault")).not.toBeInTheDocument()
    expect(screen.queryByText('This Device')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Let's Go!" })).toBeInTheDocument()
  })

  it('lands on the completion screen after skipping the password', async () => {
    renderOnboarding()
    reachLock()
    clickButton('Skip for now')

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Congrats! Your vault has been created' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: "Let's Go!" })).toBeInTheDocument()
  })

  it('hands off to the dashboard only after the setup resolves and Open Kivo is pressed', async () => {
    const { onCompleted } = renderOnboarding()
    reachLock()
    clickButton('Create Password')

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Congrats! Your vault has been created' })).toBeInTheDocument(),
    )
    expect(onCompleted).not.toHaveBeenCalled()

    clickButton("Let's Go!")
    expect(onCompleted).toHaveBeenCalledTimes(1)
  })

  it('renders a safe disabled final action when no completion callback is provided', async () => {
    render(<OnboardingPage />)
    reachLock()
    clickButton('Create Password')

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Congrats! Your vault has been created' }),
      ).toBeInTheDocument(),
    )

    const action = screen.getByRole('button', { name: "Let's Go! (not available)" })
    expect(action).toBeDisabled()

    fireEvent.click(action)
    expect(
      screen.getByRole('heading', { name: 'Congrats! Your vault has been created' }),
    ).toBeInTheDocument()
  })
})

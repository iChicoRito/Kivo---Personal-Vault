import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Description,
  FieldError,
  Input,
  Label,
  TextField,
  Typography,
} from '@heroui/react'

import { hashPassword } from '../../data/security'
import { completeSetup } from '../../data/setup'
import {
  STARTER_COLLECTIONS,
  STARTER_COLLECTION_DETAILS,
  createOnboardingDraft,
  getNextStep,
  getPreviousStep,
  resolveVaultName,
  toSetupInput,
  validateOwnerName,
  validatePasswordConfirmation,
  type OnboardingDraft,
  type OnboardingStep,
} from './onboarding'

export type OnboardingPageProps = {
  onCompleted?: () => void
}

const STEP_CONTENT: Record<OnboardingStep, { title: string; description: string }> = {
  welcome: {
    title: 'Everything important, in one place.',
    description:
      'Keep your notes, files, useful links, documents, and personal information organized inside your own private vault.',
  },
  profile: {
    title: 'Make Kivo yours',
    description: 'Tell us a little about how you want your personal vault to be set up.',
  },
  collections: {
    title: 'What will you keep in Kivo',
    description: 'Choose anything that applies. Kivo can prepare some starter collections for you.',
  },
  lock: {
    title: 'Keep your vault private',
    description:
      "Add a Master Password to lock Kivo and help protect your personal information when you're away from your device",
  },
  complete: {
    title: 'Congrats! Your vault has been created',
    description:
      'Your personal space is ready. Start organizing your notes, files, links, and important information.',
  },
}

const SAVE_ERROR_MESSAGE =
  'We could not create your vault. Your details are still here. Try again.'

function GoBackButton({ onPress, isDisabled = false }: { onPress: () => void; isDisabled?: boolean }) {
  return (
    <Button variant="ghost" isDisabled={isDisabled} onPress={onPress}>
      <span aria-hidden="true">←</span> Go back
    </Button>
  )
}

export default function OnboardingPage({ onCompleted }: OnboardingPageProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [draft, setDraft] = useState<OnboardingDraft>(createOnboardingDraft)
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const ownerInputRef = useRef<HTMLInputElement>(null)
  const confirmInputRef = useRef<HTMLInputElement>(null)

  const currentStep = STEP_CONTENT[step]

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  function updateDraft(patch: Partial<OnboardingDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function goForward() {
    const next = getNextStep(step)
    setOwnerError(null)
    setPasswordError(null)
    setSaveError(null)
    if (next) setStep(next)
  }

  function goBack() {
    const previous = getPreviousStep(step)
    setOwnerError(null)
    setPasswordError(null)
    setSaveError(null)
    if (previous) setStep(previous)
  }

  function handleProfileContinue() {
    const error = validateOwnerName(draft.ownerName)

    setOwnerError(error)
    if (error) {
      ownerInputRef.current?.focus()
      return
    }

    goForward()
  }

  function handleSkipCollections() {
    updateDraft({ starterCollections: [] })
    goForward()
  }

  async function createVault(password: string) {
    setSaving(true)
    setSaveError(null)

    try {
      const verifier = password ? await hashPassword(password) : null

      await completeSetup(toSetupInput(draft, verifier))

      setDraft((current) => ({ ...current, password: '', confirmPassword: '' }))
      setStep('complete')
    } catch {
      setSaveError(SAVE_ERROR_MESSAGE)
    } finally {
      setSaving(false)
    }
  }

  function handleCreateVault() {
    const error = validatePasswordConfirmation(draft.password, draft.confirmPassword)

    setPasswordError(error)
    if (error) {
      confirmInputRef.current?.focus()
      return
    }

    void createVault(draft.password)
  }

  function handleSkipPassword() {
    setPasswordError(null)
    void createVault('')
  }

  // Welcome and Complete are centered statements; the form steps align left.
  const isCenteredStep = step === 'welcome' || step === 'complete'

  return (
    <section
      aria-labelledby="onboarding-heading"
      aria-busy={saving}
      className="flex min-h-[calc(100dvh_-_2_*_clamp(2rem,6vw,5rem))] w-full flex-col items-center justify-center"
    >
      <div className="grid w-full max-w-2xl gap-10">
        <header className={isCenteredStep ? 'grid justify-items-center gap-3 text-center' : 'grid gap-3'}>
          <Typography id="onboarding-heading" ref={headingRef} tabIndex={-1} type="h1">
            {currentStep.title}
          </Typography>
          <Typography color="muted" type="body" className={isCenteredStep ? 'text-center' : undefined}>
            {currentStep.description}
          </Typography>
        </header>

        {step === 'welcome' && (
          <div className="flex justify-center">
            <Button variant="primary" onPress={goForward}>
              Get Started
            </Button>
          </div>
        )}

        {step === 'profile' && (
          <div className="grid gap-6">
            <TextField
              className="w-full"
              isRequired
              isInvalid={ownerError !== null}
              value={draft.ownerName}
              onChange={(value) => updateDraft({ ownerName: value })}
            >
              <Label>Your name</Label>
              <Input
                fullWidth
                ref={ownerInputRef}
                autoComplete="name"
                placeholder="Enter your Name"
                variant="secondary"
              />
              {ownerError ? <FieldError>{ownerError}</FieldError> : null}
            </TextField>

            <div>
              <Button variant="primary" onPress={handleProfileContinue}>
                Save name
              </Button>
            </div>
          </div>
        )}

        {step === 'collections' && (
          <div className="grid gap-8">
            <CheckboxGroup
              className="grid gap-4"
              value={draft.starterCollections}
              onChange={(values) => updateDraft({ starterCollections: values })}
            >
              <Label className="sr-only">Starter collections</Label>
              <div className="grid gap-x-12 gap-y-6 sm:grid-cols-2">
                {STARTER_COLLECTIONS.map((collection) => (
                  <Checkbox key={collection} value={collection}>
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="font-semibold">{collection}</span>
                    </Checkbox.Content>
                    <Description>{STARTER_COLLECTION_DETAILS[collection]}</Description>
                  </Checkbox>
                ))}
              </div>
            </CheckboxGroup>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <GoBackButton onPress={goBack} />
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onPress={handleSkipCollections}>
                  Skip for now
                </Button>
                <Button variant="primary" onPress={goForward}>
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'lock' && (
          <div className="grid gap-6">
            <TextField
              className="w-full"
              type="password"
              value={draft.password}
              onChange={(value) => updateDraft({ password: value })}
            >
              <Label>Master Password</Label>
              <Input
                fullWidth
                autoComplete="new-password"
                placeholder="Enter master password"
                variant="secondary"
              />
            </TextField>

            <TextField
              className="w-full"
              type="password"
              isInvalid={passwordError !== null}
              value={draft.confirmPassword}
              onChange={(value) => updateDraft({ confirmPassword: value })}
            >
              <Label>Confirm Password</Label>
              <Input
                fullWidth
                ref={confirmInputRef}
                autoComplete="new-password"
                placeholder="Enter master password"
                variant="secondary"
              />
              {passwordError ? <FieldError>{passwordError}</FieldError> : null}
            </TextField>

            {saveError ? (
              <Typography className="font-semibold text-danger" role="alert" type="body">
                {saveError}
              </Typography>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <GoBackButton onPress={goBack} isDisabled={saving} />
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" isDisabled={saving} onPress={handleSkipPassword}>
                  Skip for now
                </Button>
                <Button variant="primary" isDisabled={saving} onPress={handleCreateVault}>
                  {saving ? 'Creating your vault...' : 'Create Password'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="flex justify-center">
            {onCompleted ? (
              <Button variant="primary" onPress={onCompleted}>
                Let's Go!
              </Button>
            ) : (
              <Button variant="primary" isDisabled>
                Let's Go! (not available)
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

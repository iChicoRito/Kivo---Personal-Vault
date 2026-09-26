import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
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

import SplitText from '../../components/ui/SplitText'
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
  validateMasterPassword,
  validatePasswordConfirmation,
  type OnboardingDraft,
  type OnboardingStep,
} from './onboarding'

export type OnboardingPageProps = {
  onCompleted?: () => void
}

const STEP_CONTENT: Record<OnboardingStep, { title: string; description: string }> = {
  intro: {
    title: 'Kivo',
    description: 'Your personal space for everything you want to keep close',
  },
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

const INTRO_DURATION_MS = 5000

/** Kept in step with the exit animations under `.kivo-intro-leaving` in `styles/globals.css`. */
const INTRO_EXIT_MS = 500

// SplitText's default end state, plus a start delay added per line.
const INTRO_TEXT_TO = { opacity: 1, y: 0 }

const SAVE_ERROR_MESSAGE =
  'We could not create your vault. Your details are still here. Try again.'

// The mark from `assets/logo/Logo - Blue.svg` without its square. `currentColor`
// keeps it white on the dark theme and dark on the light one.
function KivoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="71 55 134 166" fill="currentColor" aria-hidden="true" className={className}>
      <path className="kivo-logo-intro-left" d="M153.165 62.3281L142.524 56.4024C141.047 55.5795 139.401 55.1059 137.713 55.0177C136.025 54.9295 134.339 55.2291 132.784 55.8936L76.3798 79.9811C74.7821 80.6735 73.4215 81.8193 72.4655 83.2771C71.5096 84.7349 71.0002 86.4412 71 88.1856V147.122C70.9783 154.915 72.5467 162.63 75.609 169.793C78.6713 176.956 83.1628 183.416 88.8075 188.777C99.7847 199.132 114.576 208.063 129.687 218.704C131.769 220.169 134.242 220.972 136.786 221.007C139.329 221.042 141.824 220.308 143.945 218.901L154.867 211.633C155.124 211.462 155.337 211.233 155.487 210.963C155.637 210.693 155.72 210.391 155.729 210.082C155.738 209.773 155.673 209.466 155.54 209.188C155.406 208.909 155.207 208.667 154.961 208.482L113.266 177.169C111.684 175.981 110.4 174.441 109.516 172.669C108.632 170.898 108.172 168.944 108.172 166.964V102.73C108.173 101.38 108.493 100.05 109.105 98.8475C109.718 97.6452 110.606 96.6053 111.696 95.8128L153.361 65.5817C153.625 65.3922 153.837 65.1386 153.977 64.8445C154.117 64.5505 154.18 64.2256 154.161 63.9005C154.141 63.5753 154.039 63.2605 153.865 62.9855C153.691 62.7104 153.45 62.4842 153.165 62.3281Z" />
      <path className="kivo-logo-intro-right" d="M203.217 81.0841L197.355 78.5188C196.425 78.111 195.403 77.9587 194.394 78.0774C193.386 78.1961 192.427 78.5816 191.617 79.1943L120.318 133.064C119.541 133.646 118.907 134.398 118.462 135.262C118.018 136.127 117.776 137.081 117.754 138.053C117.731 139.025 117.93 139.989 118.334 140.873C118.739 141.757 119.338 142.537 120.088 143.154L176.156 189.11C177.754 190.426 179.764 191.137 181.833 191.119C183.903 191.1 185.899 190.353 187.474 189.007C192.367 184.796 196.105 179.661 198.993 173.616C202.973 165.251 205.014 156.093 204.966 146.827V83.816C204.967 83.2403 204.803 82.6763 204.493 82.1918C204.183 81.7072 203.74 81.3226 203.217 81.0841Z" />
    </svg>
  )
}

function GoBackButton({ onPress, isDisabled = false }: { onPress: () => void; isDisabled?: boolean }) {
  return (
    <Button variant="ghost" isDisabled={isDisabled} onPress={onPress}>
      <span aria-hidden="true">←</span> Go back
    </Button>
  )
}

export default function OnboardingPage({ onCompleted }: OnboardingPageProps) {
  const [step, setStep] = useState<OnboardingStep>('intro')
  const [draft, setDraft] = useState<OnboardingDraft>(createOnboardingDraft)
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [masterError, setMasterError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [introLeaving, setIntroLeaving] = useState(false)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const ownerInputRef = useRef<HTMLInputElement>(null)
  const masterInputRef = useRef<HTMLInputElement>(null)
  const confirmInputRef = useRef<HTMLInputElement>(null)

  const currentStep = STEP_CONTENT[step]

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  // The logo intro moves on by itself; nothing on it needs input. It starts its
  // exit animation just before the step changes.
  useEffect(() => {
    if (step !== 'intro') return
    const exitTimer = window.setTimeout(() => setIntroLeaving(true), INTRO_DURATION_MS - INTRO_EXIT_MS)
    const nextTimer = window.setTimeout(() => setStep('welcome'), INTRO_DURATION_MS)
    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(nextTimer)
    }
  }, [step])

  // The intro text leaves as SplitText's entrance in reverse: the last letter
  // or word goes first, dropping back down as it fades.
  useEffect(() => {
    const header = headingRef.current?.closest('header')
    if (!introLeaving || !header) return

    const title = header.querySelectorAll('h1 .split-char')
    const words = header.querySelectorAll('p .split-word')
    const exit = { opacity: 0, y: 40, ease: 'power3.in', stagger: { each: 0.03, from: 'end' as const } }

    if (title.length > 0) gsap.to(title, { ...exit, duration: 0.3 })
    if (words.length > 0) gsap.to(words, { ...exit, duration: 0.3, stagger: { each: 0.02, from: 'end' } })
  }, [introLeaving])

  function updateDraft(patch: Partial<OnboardingDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function goForward() {
    const next = getNextStep(step)
    setOwnerError(null)
    setMasterError(null)
    setPasswordError(null)
    setSaveError(null)
    if (next) setStep(next)
  }

  function goBack() {
    const previous = getPreviousStep(step)
    setOwnerError(null)
    setMasterError(null)
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
    const emptyError = validateMasterPassword(draft.password)

    setMasterError(emptyError)
    if (emptyError) {
      setPasswordError(null)
      masterInputRef.current?.focus()
      return
    }

    const error = validatePasswordConfirmation(draft.password, draft.confirmPassword)

    setPasswordError(error)
    if (error) {
      confirmInputRef.current?.focus()
      return
    }

    void createVault(draft.password)
  }

  function handleSkipPassword() {
    setMasterError(null)
    setPasswordError(null)
    void createVault('')
  }

  // Intro, Welcome, and Complete are centered statements; the form steps align left.
  const isIntro = step === 'intro'
  const isCenteredStep = isIntro || step === 'welcome' || step === 'complete'

  return (
    <section
      aria-labelledby="onboarding-heading"
      aria-busy={saving}
      className="flex h-full w-full flex-col items-center justify-center px-6 py-8 sm:px-10"
    >
      <div className="grid w-full max-w-2xl gap-10">
        {/* Same SplitText settings as the page headers (see `app/PageHeader.tsx`).
            The key remounts the header per step so each step's text plays its entrance. */}
        <header
          key={step}
          className={[
            isCenteredStep ? 'grid justify-items-center gap-3 text-center' : 'grid gap-3',
            introLeaving && isIntro ? 'kivo-intro-leaving' : '',
          ].join(' ')}
        >
          {isIntro && <KivoMark className="kivo-logo-intro h-28 w-auto overflow-visible text-foreground" />}
          <SplitText
            className="typography typography--h1 outline-none"
            delay={30}
            duration={0.55}
            id="onboarding-heading"
            ref={headingRef}
            splitType="chars"
            tag="h1"
            tabIndex={-1}
            text={currentStep.title}
            textAlign={isCenteredStep ? 'center' : 'start'}
            // On the intro the text waits for the two halves of the mark to meet.
            to={isIntro ? { ...INTRO_TEXT_TO, delay: 0.7 } : undefined}
          />
          <SplitText
            className={`typography typography--body typography--color-muted${isIntro ? ' max-w-74 text-lg' : ''}`}
            delay={25}
            duration={0.5}
            splitType="words"
            tag="p"
            text={currentStep.description}
            textAlign={isCenteredStep ? 'center' : 'start'}
            to={isIntro ? { ...INTRO_TEXT_TO, delay: 0.9 } : undefined}
          />
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
              <div className="grid gap-1.5 sm:grid-cols-2">
                {STARTER_COLLECTIONS.map((collection) => (
                  <Checkbox
                    key={collection}
                    value={collection}
                    className="relative mt-0! flex cursor-pointer flex-col gap-1 rounded-3xl border border-default bg-surface p-4 transition-colors duration-200 ease-out hover:bg-surface-hover data-[selected=true]:border-accent data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-offset-2 data-[focus-visible=true]:outline-focus"
                  >
                    {/* The overlay stretches the label's click area over the whole card. */}
                    <Checkbox.Content className="static after:absolute after:inset-0 after:rounded-3xl">
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
              isInvalid={masterError !== null}
              value={draft.password}
              onChange={(value) => updateDraft({ password: value })}
            >
              <Label>Master Password</Label>
              <Input
                fullWidth
                ref={masterInputRef}
                autoComplete="new-password"
                placeholder="Enter master password"
                variant="secondary"
              />
              {masterError ? <FieldError>{masterError}</FieldError> : null}
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

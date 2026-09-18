import { useRef, useState } from 'react'
import { Alert, Button, Card, Spinner, Typography } from '@heroui/react'

export type StatusScreenProps =
  | { status: 'loading'; error?: never; onRetry?: never }
  | { status: 'error'; error: unknown; onRetry: () => void }

export function diagnosticMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error) {
    return error
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message
  ) {
    return error.message
  }

  try {
    const serialized = JSON.stringify(error)
    return serialized && serialized !== '{}' ? serialized : 'Unknown local database error'
  } catch {
    return 'Unknown local database error'
  }
}

export function StatusScreen(props: StatusScreenProps) {
  if (props.status === 'loading') {
    return (
      <main
        aria-label="Kivo application"
        className="min-h-screen bg-background px-6 py-12 text-foreground sm:px-10"
      >
        <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl flex-col justify-center gap-5">
          <Typography
            className="uppercase tracking-[0.18em]"
            color="muted"
            type="body-xs"
            weight="medium"
          >
            Kivo
          </Typography>

          <section aria-live="polite" className="grid gap-3" role="status">
            <div className="flex items-center gap-3">
              <span aria-hidden="true">
                <Spinner size="sm" />
              </span>
              <Typography type="h1">Opening Kivo</Typography>
            </div>
            <Typography color="muted" type="body">
              Preparing your local archive.
            </Typography>
          </section>
        </div>
      </main>
    )
  }

  return <DatabaseErrorScreen error={props.error} onRetry={props.onRetry} />
}

export default StatusScreen

function DatabaseErrorScreen({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const diagnostic = diagnosticMessage(error)
  const diagnosticField = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  async function copyDiagnostic() {
    diagnosticField.current?.focus()
    diagnosticField.current?.select()

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(diagnostic)
      }
    } catch {
      // Selecting diagnostic text keeps copy available when clipboard permission is denied.
    }

    setCopied(true)
  }

  return (
    <main
      aria-label="Kivo application"
      className="min-h-screen bg-background px-6 py-12 text-foreground sm:px-10"
    >
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl flex-col justify-center gap-5">
        <Typography
          className="uppercase tracking-[0.18em]"
          color="muted"
          type="body-xs"
          weight="medium"
        >
          Kivo
        </Typography>

        <section aria-live="assertive" className="grid gap-4" role="alert">
          <Typography type="h1">Kivo could not start</Typography>

          <Typography color="muted" type="body">
            Your local data was not reset. Retry startup, or copy this diagnostic for support.
          </Typography>

          <Card>
            <Card.Content className="grid gap-2">
              <Typography color="muted" type="body-xs" weight="medium">
                Diagnostic
              </Typography>
              <Typography className="break-words" type="code">
                {diagnostic}
              </Typography>
            </Card.Content>
          </Card>

          <input
            ref={diagnosticField}
            aria-label="Diagnostic details"
            readOnly
            className="sr-only"
            value={diagnostic}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onPress={onRetry}>
              Retry
            </Button>
            <Button variant="secondary" onPress={() => void copyDiagnostic()}>
              {copied ? 'Copied' : 'Copy diagnostic'}
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}

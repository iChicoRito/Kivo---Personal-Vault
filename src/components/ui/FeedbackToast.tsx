import { useEffect, useState } from 'react'
import { ProgressBar, Spinner, Toast, type ToastContentValue } from '@heroui/react'

/** The undo toast stays open this long, and its bar drains over the same window. */
const UNDO_WINDOW_MS = 8000

type FeedbackToastProps = { toast: Parameters<typeof Toast>[0]['toast'] }

/**
 * The one toast host for the whole app. Every toast routes through it, so they
 * all share one look: a loading spinner that settles into either a success
 * message with an Undo button and a bar draining over the undo window, or a
 * plain failure.
 */
export function FeedbackToastRegion() {
  return (
    <Toast.Provider placement="bottom">
      {renderProps => <FeedbackToast toast={renderProps.toast} />}
    </Toast.Provider>
  )
}

/**
 * Drains from 100 to 0 across the undo window while `active`, and sits full
 * otherwise. Keyed on the undo action arriving so the drain always spans the
 * window the toast's timeout starts.
 */
function useUndoProgress(active: boolean) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!active) {
      setProgress(100)
      return
    }

    const startedAt = performance.now()
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt
      setProgress(Math.max(0, 100 - (elapsed / UNDO_WINDOW_MS) * 100))
    }, 100)

    return () => window.clearInterval(timer)
  }, [active])

  return progress
}

function FeedbackToast({ toast }: FeedbackToastProps) {
  const content: ToastContentValue = toast.content ?? {}
  const { actionProps, description, indicator, isLoading, title, variant } = content
  const canUndo = Boolean(actionProps?.children)
  const progress = useUndoProgress(canUndo)
  const showBar = Boolean(isLoading) || canUndo

  return (
    <Toast toast={toast} variant={variant}>
      {indicator === null ? null : isLoading ? (
        <Toast.Indicator variant={variant}>
          <Spinner color="current" size="sm" />
        </Toast.Indicator>
      ) : (
        <Toast.Indicator variant={variant}>{indicator}</Toast.Indicator>
      )}

      <Toast.Content>
        {title ? <Toast.Title>{title}</Toast.Title> : null}
        {description ? <Toast.Description>{description}</Toast.Description> : null}
        {showBar ? (
          <ProgressBar
            aria-label="Time left to undo"
            isIndeterminate={isLoading}
            value={progress}
            color="success"
            size="sm"
          >
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        ) : null}
      </Toast.Content>

      {actionProps?.children ? <Toast.ActionButton {...actionProps} /> : null}
      <Toast.CloseButton />
    </Toast>
  )
}

import { Chip, Typography } from '@heroui/react'

import type { ItemSummary } from '../../data/items'
import { notePreview } from './noteContent'
import {
  NOTE_STATUS_BAR_CLASS,
  NOTE_STATUS_CHIP_COLOR,
  noteStatus,
} from './noteStatus'

export type NoteGridCardProps = {
  item: ItemSummary
  onOpen: () => void
}

/** Stands in for the body preview while a grid card's note is still empty. */
const EMPTY_PREVIEW =
  "Your note currently doesn't have any content. Your content will be displayed here."

/**
 * Grid view of one note: state chips, the color bar beside the title, and a two
 * line preview of the body. The whole card is the open action, so a click
 * anywhere on it opens the note.
 */
export function NoteGridCard({ item, onOpen }: NoteGridCardProps) {
  const status = noteStatus(item)
  const preview = notePreview(item.content ?? '') || EMPTY_PREVIEW

  return (
    <button
      aria-label={item.title}
      className="kivo-item-card relative flex h-full w-full cursor-pointer gap-3 rounded-3xl border border-default bg-surface p-4 text-left transition-[background-color,scale] duration-300 ease-out hover:z-10 hover:scale-[1.02] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      type="button"
      onClick={onOpen}
    >
      <span
        aria-hidden="true"
        className={`h-1/2 w-1 shrink-0 self-center rounded-full ${NOTE_STATUS_BAR_CLASS[status]}`}
        data-note-status={status}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {status === 'plain' ? (
            <Chip size="sm" variant="soft">
              Notes
            </Chip>
          ) : (
            <>
              {item.isPinned ? (
                <Chip color={NOTE_STATUS_CHIP_COLOR[status]} size="sm" variant="soft">
                  Pinned
                </Chip>
              ) : null}
              {item.isFavorite ? (
                <Chip color={NOTE_STATUS_CHIP_COLOR[status]} size="sm" variant="soft">
                  Favorite
                </Chip>
              ) : null}
            </>
          )}
        </div>

        <div className="grid min-w-0 gap-1">
          <Typography className="truncate font-semibold" type="body">
            {item.title}
          </Typography>
          <Typography className="line-clamp-2" color="muted" type="body-sm">
            {preview}
          </Typography>
        </div>
      </div>
    </button>
  )
}

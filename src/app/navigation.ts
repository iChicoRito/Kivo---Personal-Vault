import {
  Clock01Icon,
  DashboardSquare01Icon,
  Delete02Icon,
  FolderOpenIcon,
  Layers01Icon,
  LibraryIcon,
  Link02Icon,
  NoteEditIcon,
  Settings01Icon,
  StarIcon,
  Tag01Icon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'

export type NavigationLink = {
  label: string
  to: string
  icon: IconSvgElement
}

export const navigationGroups: Array<{ label: string; links: NavigationLink[] }> = [
  {
    label: 'KIVO',
    links: [
      { label: 'Dashboard', to: '/dashboard', icon: DashboardSquare01Icon },
      { label: 'All Items', to: '/items', icon: LibraryIcon },
    ],
  },
  {
    label: 'LIBRARY',
    links: [
      { label: 'Notes', to: '/notes', icon: NoteEditIcon },
      { label: 'Sources', to: '/sources', icon: Link02Icon },
      { label: 'Files', to: '/files', icon: FolderOpenIcon },
      { label: 'Collections', to: '/collections', icon: Layers01Icon },
      { label: 'Tags', to: '/tags', icon: Tag01Icon },
    ],
  },
  {
    label: 'QUICK ACCESS',
    links: [
      { label: 'Favorites', to: '/favorites', icon: StarIcon },
      { label: 'Recent', to: '/recent', icon: Clock01Icon },
    ],
  },
  {
    label: 'SYSTEM',
    links: [
      { label: 'Trash', to: '/trash', icon: Delete02Icon },
      { label: 'Settings', to: '/settings', icon: Settings01Icon },
    ],
  },
]

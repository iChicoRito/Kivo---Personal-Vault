import { useEffect, useState } from 'react'

import { credentialIcon } from '../../data/passwords'

const iconCache = new Map<string, Promise<string | null>>()

export function hostnameOf(url: string): string | null {
  const trimmed = url.trim()

  if (!trimmed) return null

  for (const candidate of [trimmed, `https://${trimmed}`]) {
    try {
      const host = new URL(candidate).hostname.toLowerCase()

      if (host) return host
    } catch {
      // Try the next shape: the field may hold a bare domain.
    }
  }

  return null
}

function loadIcon(host: string): Promise<string | null> {
  const cached = iconCache.get(host)

  if (cached) return cached

  const pending = credentialIcon(host).catch(() => null)

  iconCache.set(host, pending)

  return pending
}

export type CredentialAvatarProps = {
  service: string
  url: string
}

export function CredentialAvatar({ service, url }: CredentialAvatarProps) {
  const host = hostnameOf(url)
  const [icon, setIcon] = useState<string | null>(null)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    let active = true

    setBroken(false)

    if (!host) {
      setIcon(null)

      return
    }

    void loadIcon(host).then((value) => {
      if (active) setIcon(value)
    })

    return () => {
      active = false
    }
  }, [host])

  const initial = service.trim().charAt(0).toUpperCase() || '?'

  if (host && icon && !broken) {
    return (
      <img
        alt=""
        className="size-12 shrink-0 rounded-full bg-default object-cover"
        src={icon}
        onError={() => setBroken(true)}
      />
    )
  }

  return (
    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-default text-base font-semibold">
      {initial}
    </span>
  )
}

export default CredentialAvatar

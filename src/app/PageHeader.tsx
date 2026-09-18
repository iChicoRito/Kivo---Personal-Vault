import { Typography } from '@heroui/react'
import type { Ref } from 'react'

export const textLinkClass =
  'inline-flex w-fit items-center gap-1 rounded-sm font-bold text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

type PageHeaderProps = {
  eyebrow?: string
  titleId: string
  title: string
  description?: string
  titleRef?: Ref<HTMLHeadingElement>
  titleTabIndex?: number
}

export default function PageHeader({
  eyebrow,
  titleId,
  title,
  description,
  titleRef,
  titleTabIndex,
}: PageHeaderProps) {
  return (
    <header className="grid max-w-3xl gap-3">
      {eyebrow ? (
        <Typography className="uppercase tracking-[0.14em]" color="muted" type="body-xs" weight="bold">
          {eyebrow}
        </Typography>
      ) : null}

      <Typography id={titleId} ref={titleRef} tabIndex={titleTabIndex} type="h1">
        {title}
      </Typography>

      {description ? (
        <Typography color="muted" type="body">
          {description}
        </Typography>
      ) : null}
    </header>
  )
}

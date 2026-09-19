import type { Ref } from 'react'

import SplitText from '../components/ui/SplitText'

export const textLinkClass =
  'inline-flex w-fit items-center gap-1 rounded-sm font-bold text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

type PageHeaderProps = {
  titleId: string
  title: string
  description?: string
  titleRef?: Ref<HTMLElement>
  titleTabIndex?: number
}

export default function PageHeader({
  titleId,
  title,
  description,
  titleRef,
  titleTabIndex,
}: PageHeaderProps) {
  return (
    <header className="grid max-w-3xl gap-0.5">
      <SplitText
        className="typography typography--h1 text-[28px] leading-9"
        delay={30}
        duration={0.55}
        id={titleId}
        ref={titleRef}
        splitType="chars"
        tag="h1"
        tabIndex={titleTabIndex}
        text={title}
        textAlign="start"
      />

      {description ? (
        <SplitText
          className="typography typography--body typography--color-muted"
          delay={25}
          duration={0.5}
          splitType="words"
          tag="p"
          text={description}
          textAlign="start"
        />
      ) : null}
    </header>
  )
}

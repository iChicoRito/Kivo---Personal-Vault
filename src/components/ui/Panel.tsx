import type { ReactNode } from 'react'
import { Card } from '@heroui/react'

/** A titled dashboard card: small heading on the left, optional meta or link on the right. */
export function Panel({
  id,
  title,
  meta,
  className = '',
  children,
}: {
  id: string
  title: string
  meta?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className={`min-w-0 ${className}`}>
      <Card className="h-full">
        <div className="flex min-h-6 items-center justify-between gap-2">
          <h2 className="text-sm font-semibold" id={id}>
            {title}
          </h2>
          {meta}
        </div>
        {children}
      </Card>
    </section>
  )
}

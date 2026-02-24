import Link from 'next/link'
import type { ReactNode } from 'react'

export const PageHeader = ({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  badges
}: {
  title: ReactNode
  subtitle?: ReactNode
  backHref?: string
  backLabel?: ReactNode
  actions?: ReactNode
  badges?: ReactNode
}) => {
  return (
    <div className='mb-6'>
      {backHref ? (
        <div className='mb-2'>
          <Link
            href={backHref}
            className='inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white'
          >
            <span aria-hidden>←</span>
            <span>{backLabel ?? 'Back'}</span>
          </Link>
        </div>
      ) : null}

      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-3xl font-semibold tracking-tight'>{title}</h1>
            {badges}
          </div>
          {subtitle ? (
            <div className='mt-1 text-sm text-zinc-400'>{subtitle}</div>
          ) : null}
        </div>

        {actions ? <div className='shrink-0'>{actions}</div> : null}
      </div>
    </div>
  )
}

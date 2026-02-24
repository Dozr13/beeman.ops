import clsx from 'clsx'
import React from 'react'

export const Card = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={clsx(
      'min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-sm',
      className
    )}
    {...props}
  />
)

export const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('px-5 pt-5 pb-3', className)} {...props} />
)

export const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={clsx('text-base font-semibold tracking-tight', className)}
    {...props}
  />
)

export const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('px-5 pb-5', className)} {...props} />
)

export const Pill = ({
  children,
  tone = 'neutral'
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
}) => {
  const cls =
    tone === 'good'
      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
      : tone === 'warn'
        ? 'bg-amber-500/15 text-amber-200 border-amber-500/30'
        : tone === 'bad'
          ? 'bg-red-500/15 text-red-200 border-red-500/30'
          : 'bg-zinc-500/15 text-zinc-200 border-zinc-500/30'
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs',
        cls
      )}
    >
      {children}
    </span>
  )
}

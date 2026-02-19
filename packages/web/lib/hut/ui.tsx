import React from 'react'
import { cn } from './utils'

export const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle
}) => (
  <div className='space-y-1'>
    <div className='text-lg font-semibold tracking-tight'>{title}</div>
    {subtitle ? <div className='text-sm text-zinc-400'>{subtitle}</div> : null}
  </div>
)

export const Card: React.FC<
  React.PropsWithChildren<{ className?: string }>
> = ({ className, children }) => (
  <div
    className={cn(
      'p-24 rounded-2xl border border-zinc-800 bg-zinc-900/40',
      'shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_60px_rgba(0,0,0,0.55)]',
      className
    )}
  >
    {children}
  </div>
)

export const CardBody: React.FC<
  React.PropsWithChildren<{ className?: string }>
> = ({ className, children }) => (
  <div className={cn('p-5 sm:p-6', className)}>{children}</div>
)

export const Badge: React.FC<{
  tone: 'ok' | 'warn' | 'crit' | 'muted'
  children: React.ReactNode
}> = ({ tone, children }) => {
  const cls =
    tone === 'ok'
      ? 'border-emerald-700/60 bg-emerald-500/15 text-emerald-200'
      : tone === 'warn'
        ? 'border-amber-700/60 bg-amber-500/15 text-amber-200'
        : tone === 'crit'
          ? 'border-rose-700/60 bg-rose-500/15 text-rose-200'
          : 'border-zinc-700/60 bg-zinc-500/10 text-zinc-300'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
        cls
      )}
    >
      {children}
    </span>
  )
}

export const Button: React.FC<
  React.PropsWithChildren<{
    className?: string
    onClick?: () => void
    variant?: 'solid' | 'ghost'
    disabled?: boolean
    title?: string
    type?: 'button' | 'submit' | 'reset'
  }>
> = ({
  className,
  onClick,
  children,
  variant = 'solid',
  disabled = false,
  title,
  type = 'button'
}) => {
  const base =
    variant === 'solid'
      ? 'bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/40 text-white'
      : 'bg-transparent hover:bg-zinc-800 border border-zinc-800 text-zinc-200'

  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition',
        base,
        disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : '',
        className
      )}
    >
      {children}
    </button>
  )
}

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (
  props
) => (
  <input
    {...props}
    className={cn(
      'w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 outline-none',
      'placeholder:text-zinc-600 focus:border-zinc-600',
      props.className
    )}
  />
)

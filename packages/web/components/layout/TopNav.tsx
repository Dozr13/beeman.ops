'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const itemClass = (active: boolean) =>
  [
    'inline-flex items-center rounded-full px-3 py-1.5 text-sm transition',
    active
      ? 'bg-zinc-900/60 text-white ring-1 ring-zinc-700/60'
      : 'text-zinc-300 hover:text-white hover:bg-zinc-900/30'
  ].join(' ')

export const TopNav = () => {
  const pathname = usePathname() ?? '/'
  const onSites = pathname === '/' || pathname.startsWith('/sites')
  const onHuts = pathname.startsWith('/huts')
  const onAlerts = pathname.startsWith('/alerts')

  return (
    <nav className='flex items-center gap-2'>
      <Link href='/sites' className={itemClass(onSites)}>
        Sites
      </Link>
      <Link href='/huts' className={itemClass(onHuts)}>
        Huts
      </Link>
      <Link href='/alerts' className={itemClass(onAlerts)}>
        Alerts
      </Link>
    </nav>
  )
}

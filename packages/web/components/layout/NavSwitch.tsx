'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const NavSwitch = () => {
  const pathname = usePathname()

  const onHuts = pathname?.startsWith('/huts')
  const onSites = pathname?.startsWith('/sites') || pathname === '/'

  return (
    <nav className='flex gap-4 text-sm text-zinc-300'>
      {onHuts ? (
        <Link href='/sites' className='hover:text-white'>
          Sites
        </Link>
      ) : (
        <Link href='/huts' className='hover:text-white'>
          Huts
        </Link>
      )}

      <Link href='/alerts' className='hover:text-white'>
        Alerts
      </Link>
    </nav>
  )
}

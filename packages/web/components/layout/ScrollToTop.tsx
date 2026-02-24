'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export const ScrollToTop = () => {
  const pathname = usePathname()

  useEffect(() => {
    // only path changes (not ?sort=...), so list sorting doesn't jump you to top
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0 })
    })
  }, [pathname])

  return null
}

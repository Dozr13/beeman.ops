import type { Metadata } from 'next'
import Link from 'next/link'
import { ScrollToTop } from '../components/layout/ScrollToTop'
import { TopNav } from '../components/layout/TopNav'
import './globals.css'

export const metadata: Metadata = {
  title: 'Beeman Ops',
  description: 'Unified monitoring for wells + hashhuts'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className='min-h-dvh bg-black text-zinc-100 overflow-x-hidden'>
        <ScrollToTop />
        <header className='sticky top-0 z-40 flex items-center justify-between border-b border-zinc-800 bg-black/70 px-4 py-4 backdrop-blur sm:px-6'>
          <Link href='/' className='text-lg font-semibold tracking-tight'>
            Beeman Ops
          </Link>

          <TopNav />
        </header>
        {/* smaller padding on mobile, same on desktop */}
        <main className='min-h-screen p-4 sm:p-6'>{children}</main>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { ScrollToTop } from '../components/layout/ScrollToTop'
import { TopNav } from '../components/layout/TopNav'
import { CommandPaletteProvider } from '../components/search/CommandPaletteProvider'
import { SearchLauncher } from '../components/search/SearchLauncher'
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
        <CommandPaletteProvider>
          <ScrollToTop />

          <header className='sticky top-0 z-40 border-b border-zinc-800 bg-black/70 backdrop-blur'>
            <div className='mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6'>
              <Link href='/' className='text-lg font-semibold tracking-tight'>
                Beeman Ops
              </Link>
              <TopNav />
            </div>

            {/* Visible search bar users can use (no keyboard required) */}
            <div className='mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6'>
              <SearchLauncher />
            </div>
          </header>

          <main className='px-4 pb-10 sm:px-6'>
            <div className='mx-auto w-full max-w-7xl py-6'>{children}</div>
          </main>
        </CommandPaletteProvider>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { NavSwitch } from '../components/layout/NavSwitch'
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
      <body className='min-h-screen bg-black text-zinc-100'>
        <header className='flex items-center justify-between border-b border-zinc-800 bg-black/60 px-4 py-4 backdrop-blur sm:px-6'>
          <Link href='/' className='text-lg font-semibold tracking-tight'>
            Beeman Ops
          </Link>

          <NavSwitch />
        </header>

        {/* smaller padding on mobile, same on desktop */}
        <main className='min-h-screen p-4 sm:p-6'>{children}</main>
      </body>
    </html>
  )
}

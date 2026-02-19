import Link from 'next/link'
import { NavSwitch } from '../components/layout/NavSwitch'
import './globals.css'

export const metadata = {
  title: 'Beeman Ops',
  description: 'Unified monitoring for wells + hashhuts'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en'>
      <body className='min-h-screen bg-black text-zinc-100'>
        <header className='flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-black/60 backdrop-blur'>
          <Link href='/' className='font-semibold tracking-tight text-lg'>
            Beeman Ops
          </Link>

          {/* <NavClient /> */}

          <NavSwitch />
        </header>

        <main className='p-6'>{children}</main>
      </body>
    </html>
  )
}

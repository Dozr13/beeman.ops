import type { Metadata } from 'next'
import { NavSwitch } from '../components/layout/NavSwitch'
import './globals.css'

export const metadata: Metadata = {
  title: 'Beeman Ops',
  description: 'Oilfield & hut monitoring'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body>
        <NavSwitch />
        {/* KEY CHANGE: smaller padding on mobile, same on desktop */}
        <main className='min-h-screen p-4 sm:p-6'>{children}</main>
      </body>
    </html>
  )
}

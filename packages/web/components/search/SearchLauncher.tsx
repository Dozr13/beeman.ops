'use client'

import { Search } from 'lucide-react'
import { useCommandPalette } from './CommandPaletteProvider'

export const SearchLauncher = () => {
  const { open } = useCommandPalette()
  return (
    <button
      type='button'
      onClick={open}
      className='inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900/40'
      aria-label='Search (Command-K)'
      title='Search (⌘K / Ctrl-K)'
    >
      <Search className='h-4 w-4' />
      <span className='hidden sm:inline'>Search</span>
      <span className='hidden sm:inline text-xs text-zinc-500'>⌘K</span>
    </button>
  )
}

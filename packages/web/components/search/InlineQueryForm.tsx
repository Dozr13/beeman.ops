import React from 'react'

export const InlineQueryForm = ({
  q,
  placeholder,
  extra
}: {
  q: string
  placeholder: string
  extra?: Record<string, string>
}) => {
  return (
    <form method='get' className='w-full'>
      {extra
        ? Object.entries(extra).map(([k, v]) => (
            <input key={k} type='hidden' name={k} value={v} />
          ))
        : null}

      <div className='flex w-full items-center gap-2'>
        <input
          name='q'
          defaultValue={q}
          placeholder={placeholder}
          className='w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30'
        />
        <button
          type='submit'
          className='rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900/40'
        >
          Search
        </button>
      </div>
    </form>
  )
}

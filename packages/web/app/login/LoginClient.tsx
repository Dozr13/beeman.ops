'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

export default function LoginClient() {
  const [username, setUsername] = useState('beeman')
  const [password, setPassword] = useState('')
  const searchParams = useSearchParams()

  const callbackUrl = useMemo(() => {
    const next = searchParams.get('next')
    if (next && next.startsWith('/')) return next
    return '/sites' // better default than hardcoding a hut
  }, [searchParams])

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Login</h1>

      <label style={{ display: 'block', marginBottom: 8 }}>Username</label>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 14 }}
        autoComplete='username'
      />

      <label style={{ display: 'block', marginBottom: 8 }}>Password</label>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type='password'
        style={{ width: '100%', padding: 10, marginBottom: 18 }}
        autoComplete='current-password'
      />

      <button
        onClick={async () => {
          await signIn('credentials', {
            username,
            password,
            callbackUrl
          })
        }}
        style={{ width: '100%', padding: 12, fontWeight: 700 }}
      >
        Sign in
      </button>
    </div>
  )
}

import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

const handler = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Password',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(creds) {
        const expectedUser = (process.env.AUTH_USERNAME ?? '').trim()
        const expectedHash = (process.env.AUTH_PASSWORD_HASH ?? '').trim()

        const user = (creds?.username ?? '').trim()
        const pass = (creds?.password ?? '').trim()

        // DEBUG (safe: no password printed)
        console.log('[AUTH]', {
          haveExpectedUser: !!expectedUser,
          haveExpectedHash: !!expectedHash,
          expectedUser,
          gotUser: user,
          gotPassLen: pass.length,
          hashPrefix: expectedHash.slice(0, 7)
        })

        if (!expectedUser || !expectedHash) return null
        if (user !== expectedUser) return null

        const ok = await bcrypt.compare(pass, expectedHash)
        console.log('[AUTH] bcrypt ok =', ok)

        if (!ok) return null

        return { id: 'beeman', name: expectedUser }
      }
    })
  ],
  pages: {
    signIn: '/login'
  }
})

export { handler as GET, handler as POST }

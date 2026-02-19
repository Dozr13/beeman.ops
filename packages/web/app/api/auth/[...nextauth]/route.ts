import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

// console.log('AUTH_USERNAME =', process.env.AUTH_USERNAME)
// console.log(
//   'AUTH_PASSWORD_HASH =',
//   process.env.AUTH_PASSWORD_HASH?.slice(0, 20),
//   '...'
// )

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

        if (!expectedUser || !expectedHash) return null
        if (user !== expectedUser) return null

        const ok = await bcrypt.compare(pass, expectedHash)
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

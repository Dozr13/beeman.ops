import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __ops_prisma__: PrismaClient | undefined
}

const makeClient = () => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!
  })

  return new PrismaClient({ adapter })
}

export const getPrisma = () => {
  if (process.env.NODE_ENV !== 'production') {
    if (!global.__ops_prisma__) global.__ops_prisma__ = makeClient()
    return global.__ops_prisma__
  }
  return makeClient()
}

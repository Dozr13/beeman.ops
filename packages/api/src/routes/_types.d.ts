import 'fastify'
import type { PrismaClient } from '@ops/db'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

import 'dotenv/config'
import { getPrisma } from '../src/client.js'

const prisma = getPrisma()

const HUTS = [
  { code: 'GH180', name: 'Hash Hut 180' },
  { code: 'GH181', name: 'Hash Hut 181' }
]

const main = async () => {
  for (const h of HUTS) {
    await prisma.hut.upsert({
      where: { code: h.code },
      update: { name: h.name },
      create: { code: h.code, name: h.name }
    })
    console.log(`[seed] hut ${h.code}`)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    return prisma.$disconnect().finally(() => process.exit(1))
  })

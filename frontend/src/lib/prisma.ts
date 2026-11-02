import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { decimalsToNumbers } from '@/lib/decimal'

const prismaClientSingleton = () => {
  // Use environment variable so it works in Vercel with Pooler
  const connectionString = process.env.DATABASE_URL!

  if (!globalThis.poolGlobal) {
    globalThis.poolGlobal = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 2, // Strict limit to avoid exhausting Supabase
      idleTimeoutMillis: 5000 // Close idle connections quickly
    })
  }

  const adapter = new PrismaPg(globalThis.poolGlobal)
  // Los montos Decimal salen como number (ver lib/decimal.ts)
  return new PrismaClient({ adapter }).$extends({
    query: {
      async $allOperations({ args, query }) {
        return decimalsToNumbers(await query(args))
      },
    },
  })
}

declare global {
  var prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined
  var poolGlobal: Pool | undefined
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

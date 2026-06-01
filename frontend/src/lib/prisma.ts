import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  var prismaGlobal: PrismaClient | undefined
  var poolGlobal: Pool | undefined
}

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
  return new PrismaClient({ adapter })
}

// Force recreation by ignoring the cache temporarily
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

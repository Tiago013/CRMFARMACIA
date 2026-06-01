import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  var prismaGlobal: PrismaClient | undefined
  var poolGlobal: Pool | undefined
}

const prismaClientSingleton = () => {
  // Use exact known-good connection string from seed_pg.js
  const connectionString = "postgresql://postgres:Y%212msP_.Vtqtd67@db.bvxkcwjnsobhufvowgsb.supabase.co:5432/postgres"
  
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

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const profile = await prisma.userProfile.findFirst({
    include: { pharmacy: true }
  });
  
  if (!profile) {
    console.log("No profile found");
    return;
  }
  
  const tenantId = profile.tenant_id;
  console.log("Testing with tenantId:", tenantId);
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  try {
    const [usersCount, patientsCount, posCount] = await Promise.all([
      prisma.userProfile.count({ where: { tenant_id: tenantId } }),
      prisma.patient.count({ where: { tenant_id: tenantId } }),
      prisma.sale.count({ where: { tenant_id: tenantId, created_at: { gte: startOfMonth } } })
    ]);
    console.log("SUCCESS:", { usersCount, patientsCount, posCount });
  } catch (err) {
    console.error("PRISMA ERROR:", err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

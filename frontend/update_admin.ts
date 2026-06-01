import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const profile = await prisma.userProfile.findFirst({
    include: { pharmacy: true }
  });
  
  if (profile) {
    console.log('Found profile:', profile.id);
    await prisma.pharmacy.update({
      where: { id: profile.tenant_id },
      data: { plan_type: 'ENTERPRISE' }
    });
    console.log('Updated to ENTERPRISE');
  } else {
    console.log('No user profile found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

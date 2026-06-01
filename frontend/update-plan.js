const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.userProfile.findFirst({
    include: { pharmacy: true }
  });
  
  if (admin) {
    console.log('Found profile:', admin.id, 'Tenant:', admin.tenant_id);
    await prisma.pharmacy.update({
      where: { id: admin.tenant_id },
      data: { plan_type: 'ENTERPRISE' }
    });
    console.log('Successfully updated the primary pharmacy to ENTERPRISE plan.');
  } else {
    console.log('No user profiles found to upgrade.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

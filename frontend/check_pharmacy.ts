import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pharmacy = await prisma.pharmacy.findFirst({
    include: { users: true }
  });
  console.log(JSON.stringify(pharmacy, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const prisma = new PrismaClient();

async function main() {
  const pharmacy = await prisma.pharmacy.findFirst();
  
  if (!pharmacy) {
    console.log("No pharmacies found in db.");
    return;
  }

  const updated = await prisma.pharmacy.update({
    where: { id: pharmacy.id },
    data: {
      name: "Salud Vital S.A.S.",
      tax_id: "900.123.456-7",
      phone: "+57 300 123 4567",
      address: "Calle 123 #45-67, Bogotá, Cundinamarca",
      settings: {
        pharmacy_commercial_name: "Droguería Salud Vital",
        pharmacy_tax_regime: "Responsable de IVA (Común)",
        pharmacy_dian_resolution: "187620000001 - Rango: FE-1 a FE-10000",
        pharmacy_email: "admin@saludvital.com"
      }
    }
  });

  console.log("Pharmacy updated successfully:", updated.id);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

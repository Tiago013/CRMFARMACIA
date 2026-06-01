export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'No pharmacy found' }, { status: 400 });

    const tenant_id = pharmacy.id;

    // Churn Risk = last purchase > 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const patients = await prisma.patient.findMany({
      where: { 
        tenant_id,
        last_purchase_date: { lt: thirtyDaysAgo }
      },
      include: {
        sales: {
          where: { status: 'COMPLETED' }
        }
      }
    });

    const churnRisk = patients.map(p => {
      const daysSincePurchase = p.last_purchase_date ? Math.floor((new Date().getTime() - p.last_purchase_date.getTime()) / (1000 * 3600 * 24)) : 'N/A';
      return {
        Paciente: `${p.first_name} ${p.last_name}`,
        Telefono: p.phone || 'N/A',
        Dias_Inactivo: daysSincePurchase,
        Ultima_Compra: p.last_purchase_date ? p.last_purchase_date.toISOString().split('T')[0] : 'N/A',
        Tratamiento_Sugerido: (p.preferences as any)?.medicamentos || 'N/A',
        Riesgo: Number(daysSincePurchase) > 60 ? 'Alto' : 'Medio'
      };
    }).sort((a, b) => Number(b.Dias_Inactivo) - Number(a.Dias_Inactivo)).slice(0, 50);

    return NextResponse.json(churnRisk);
  } catch (error: any) {
    console.error("Churn risk error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const tenant_id = auth.tenantId;

    // Fetch patients and their sales
    const patients = await prisma.patient.findMany({
      where: { tenant_id },
      include: {
        sales: {
          where: { status: 'COMPLETED' }
        }
      }
    });

    const vipPatients = patients.map(p => {
      const total_spent = p.sales.reduce((sum, sale) => sum + sale.grand_total, 0);
      const orders = p.sales.length;
      return {
        Paciente: `${p.first_name} ${p.last_name}`,
        Documento: p.document_id || 'N/A',
        Telefono: p.phone || 'N/A',
        Compras_Totales: orders,
        Valor_De_Vida_LTV: total_spent,
        Ultima_Compra: p.last_purchase_date ? p.last_purchase_date.toISOString().split('T')[0] : 'N/A'
      };
    }).sort((a, b) => b.Valor_De_Vida_LTV - a.Valor_De_Vida_LTV).slice(0, 50);

    return NextResponse.json(vipPatients);
  } catch (error: any) {
    console.error("VIP patients error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

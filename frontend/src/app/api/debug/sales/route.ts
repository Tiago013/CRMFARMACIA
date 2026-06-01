import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id: { startsWith: '01ea0246' } },
      include: {
        sales: {
          include: {
            items: {
              include: { product: true }
            }
          }
        }
      }
    });

    return NextResponse.json({
      patientId: patient?.id,
      salesCount: patient?.sales.length,
      sales: patient?.sales.map(s => ({
        id: s.id,
        date: s.created_at,
        grand_total: s.grand_total,
        itemsCount: s.items.length,
        itemsTotal: s.items.reduce((acc, i) => acc + i.total, 0)
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

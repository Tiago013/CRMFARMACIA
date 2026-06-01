export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const dateStr = url.searchParams.get('date');

    if (!dateStr) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'No pharmacy found' }, { status: 400 });

    const startDate = new Date(dateStr);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(dateStr);
    endDate.setHours(23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: {
        tenant_id: pharmacy.id,
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { created_at: 'asc' }
    });

    const result = sales.map(s => ({
      time: s.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      id: s.id,
      total: s.grand_total,
      payment_method: s.payment_method
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Sales by date error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

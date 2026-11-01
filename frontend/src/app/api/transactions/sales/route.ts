export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const filterDate = searchParams.get('date'); // format: YYYY-MM-DD
    
    // In MVP we just fetch all sales or default tenant
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const whereClause: any = { tenant_id: auth.tenantId };
    
    if (filterDate) {
      const startDate = new Date(filterDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filterDate);
      endDate.setHours(23, 59, 59, 999);
      whereClause.created_at = {
        gte: startDate,
        lte: endDate
      };
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        patient: true,
        items: {
          include: {
            product: true
          }
        },
        payments: true
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    });

    return NextResponse.json(sales);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

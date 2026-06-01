export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // In MVP we just fetch all sales or default tenant
    let defaultPharmacy = await prisma.pharmacy.findFirst();
    if (!defaultPharmacy) {
      return NextResponse.json({ error: 'No pharmacy found' }, { status: 404 });
    }

    const sales = await prisma.sale.findMany({
      where: {
        tenant_id: defaultPharmacy.id
      },
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

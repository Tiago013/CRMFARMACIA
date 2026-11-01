import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const sales = await prisma.sale.findMany({
      where: { 
        tenant_id: auth.tenantId,
        patient_id: id,
        items: {
          some: {}
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    return NextResponse.json(sales);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

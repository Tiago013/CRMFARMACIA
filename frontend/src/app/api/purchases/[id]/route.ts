import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const tenant_id = auth.tenantId;

    const purchase = await prisma.purchase.findFirst({
      where: { id: id, tenant_id },
      include: {
        supplier: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json(purchase);
  } catch (error: any) {
    console.error("GET purchase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

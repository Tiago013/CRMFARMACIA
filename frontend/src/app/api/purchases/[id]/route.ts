import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'No pharmacy found' }, { status: 400 });

    const tenant_id = pharmacy.id;

    const purchase = await prisma.purchase.findFirst({
      where: { id: params.id, tenant_id },
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

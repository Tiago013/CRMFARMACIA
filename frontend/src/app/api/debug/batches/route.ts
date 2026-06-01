import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const atRiskBatches = await prisma.batch.aggregate({
      where: { quantity: { gt: 0 }, expiration_date: { lte: thirtyDaysFromNow } },
      _sum: { quantity: true }
    });
    
    const safeBatches = await prisma.batch.aggregate({
      where: { quantity: { gt: 0 }, expiration_date: { gt: thirtyDaysFromNow } },
      _sum: { quantity: true }
    });

    const allBatches = await prisma.batch.findMany({
      select: { id: true, expiration_date: true, quantity: true }
    });

    return NextResponse.json({
      atRiskQty: atRiskBatches._sum.quantity,
      safeQty: safeBatches._sum.quantity,
      now: new Date(),
      thirtyDaysFromNow,
      batches: allBatches
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

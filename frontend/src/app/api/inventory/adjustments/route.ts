export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, difference } = body;

    if (!product_id || difference === undefined || difference === 0) {
      return NextResponse.json({ error: 'Faltan parámetros o la diferencia es 0' }, { status: 400 });
    }

    // To adjust inventory, we either add to an existing batch or deduct from the oldest batch.
    // For this MVP, let's just find the first available batch, or create a generic one if missing.
    let batch = await prisma.batch.findFirst({
      where: { product_id },
      orderBy: { expiration_date: 'asc' }
    });

    if (!batch) {
      // If adding, we need a batch. If deducting and no batch, error.
      if (difference < 0) {
        return NextResponse.json({ error: 'No hay stock suficiente en ningún lote para deducir.' }, { status: 400 });
      }

      // We need to know the tenant_id to create a batch. We get it from the product.
      const product = await prisma.product.findUnique({ where: { id: product_id } });
      if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

      batch = await prisma.batch.create({
        data: {
          product_id,
          tenant_id: product.tenant_id,
          batch_number: 'AJUSTE-MANUAL',
          quantity: 0,
          expiration_date: new Date('2099-12-31')
        }
      });
    }

    // Now apply the difference
    const newQuantity = batch.quantity + difference;
    
    if (newQuantity < 0) {
      return NextResponse.json({ error: 'El ajuste dejaría el lote con stock negativo.' }, { status: 400 });
    }

    const updatedBatch = await prisma.batch.update({
      where: { id: batch.id },
      data: { quantity: newQuantity }
    });

    return NextResponse.json({ success: true, updatedBatch });
  } catch (error: any) {
    console.error("Adjustment error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

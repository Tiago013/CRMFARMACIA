export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Allow updating these fields
    const { brand_name, unit_price, cost_price, min_stock, category_id, active_ingredient, expiration_date } = body;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        brand_name,
        unit_price,
        cost_price,
        min_stock,
        category_id,
        active_ingredient
      }
    });

    // If expiration_date or stock is provided, update the nearest batch or the most recently added batch
    if (expiration_date || body.stock !== undefined) {
      const batches = await prisma.batch.findMany({
        where: { product_id: id },
        orderBy: { expiration_date: 'asc' }
      });
      if (batches.length > 0) {
        // Update the closest batch
        await prisma.batch.update({
          where: { id: batches[0].id },
          data: { 
            ...(expiration_date ? { expiration_date: new Date(expiration_date) } : {}),
            ...(body.stock !== undefined ? { quantity: parseInt(body.stock) || 0 } : {})
          }
        });
      } else {
        // If somehow no batches exist, create one
        const product = await prisma.product.findUnique({ where: { id } });
        if (product) {
          await prisma.batch.create({
            data: {
              tenant_id: product.tenant_id,
              product_id: id,
              batch_number: 'LOTE-AJUSTE',
              expiration_date: expiration_date ? new Date(expiration_date) : new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
              quantity: parseInt(body.stock) || 0
            }
          });
        }
      }
    }

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.$transaction([
      prisma.saleItem.deleteMany({ where: { product_id: id } }),
      prisma.batch.deleteMany({ where: { product_id: id } }),
      prisma.product.delete({ where: { id } })
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

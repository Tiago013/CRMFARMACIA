import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'No pharmacy found' }, { status: 400 });

    const tenant_id = pharmacy.id;

    const purchases = await prisma.purchase.findMany({
      where: { tenant_id },
      include: {
        supplier: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(purchases);
  } catch (error: any) {
    console.error("GET purchases error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'No pharmacy found' }, { status: 400 });
    const tenant_id = pharmacy.id;

    // Supabase auth
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { supplier_id, invoice_number, items, total_amount, status } = body;

    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 1. Get or create "Inventario" Expense Category for P&L tracking
    let inventoryCategory = await prisma.expenseCategory.findFirst({
      where: { tenant_id, name: 'Compras de Inventario' }
    });
    
    if (!inventoryCategory) {
      inventoryCategory = await prisma.expenseCategory.create({
        data: {
          tenant_id,
          name: 'Compras de Inventario',
          description: 'Costo de mercadería vendida (COGS) y reabastecimiento',
          color: '#10B981' // Emerald
        }
      });
    }

    // 2. Perform Transaction
    const purchase = await prisma.$transaction(async (tx) => {
      // 2.1 Create Purchase record
      const p = await tx.purchase.create({
        data: {
          tenant_id,
          supplier_id,
          user_id: user.id,
          invoice_number: invoice_number || null,
          total_amount: Number(total_amount),
          status: status || 'COMPLETED',
        }
      });

      // 2.2 Create Purchase Items and Update Stock
      for (const item of items) {
        const itemTotalCost = Number(item.quantity) * Number(item.unit_cost);
        
        await tx.purchaseItem.create({
          data: {
            purchase_id: p.id,
            product_id: item.product_id,
            batch_number: item.batch_number || `COMPRA-${Date.now().toString().slice(-6)}`,
            expiration_date: item.expiration_date ? new Date(item.expiration_date) : null,
            quantity: Number(item.quantity),
            unit_cost: Number(item.unit_cost),
            total_cost: itemTotalCost
          }
        });

        // 2.3 If COMPLETED, add to Inventory Stock by creating a Batch
        if (p.status === 'COMPLETED') {
          const batch = await tx.batch.create({
            data: {
              tenant_id,
              product_id: item.product_id,
              batch_number: item.batch_number || `COMPRA-${Date.now().toString().slice(-6)}`,
              expiration_date: item.expiration_date ? new Date(item.expiration_date) : new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
              quantity: Number(item.quantity)
            }
          });

          // Create stock movement
          await tx.stockMovement.create({
            data: {
              tenant_id,
              product_id: item.product_id,
              batch_id: batch.id,
              user_id: user.id,
              movement_type: 'PURCHASE_IN',
              quantity: Number(item.quantity),
              reference_id: p.id
            }
          });

          // 2.4 Update Product Cost Price (Moving Average or Last Cost)
          // For simplicity, we update it to the last unit_cost
          await tx.product.update({
            where: { id: item.product_id },
            data: {
              cost_price: Number(item.unit_cost)
            }
          });
        }
      }

      // 2.5 If COMPLETED, log Expense for P&L
      if (p.status === 'COMPLETED') {
        await tx.expense.create({
          data: {
            tenant_id,
            category_id: inventoryCategory.id,
            user_id: user.id,
            amount: Number(total_amount),
            date: new Date(),
            description: `Compra de Inventario - Factura ${invoice_number || 'N/A'}`,
            reference_code: p.id,
            status: 'COMPLETED'
          }
        });
      }

      return p;
    });

    return NextResponse.json(purchase);
  } catch (error: any) {
    console.error("POST purchase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

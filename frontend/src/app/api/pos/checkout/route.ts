export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { TAX_RATE, computeSaleTotals, totalsMatch, validateLine } from '@/lib/pos/pricing';
import { allocateFefo } from '@/lib/inventory/fefo';
import { sendWhatsApp } from '@/lib/whatsapp/send';

class ExpiredStockError extends Error {
  constructor(public productId: string) {
    super('Las unidades disponibles de este producto están vencidas');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, patient_id, payment_method, grand_total } = body;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const tenant_id = auth.tenantId;
    const cashier_id = auth.profileId ?? auth.authId;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'La venta no tiene productos' }, { status: 400 });
    }

    // Los productos y el paciente deben pertenecer a la farmacia del usuario
    const productIds = [...new Set(items.map((i: any) => i.product_id))] as string[];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenant_id },
      select: { id: true, unit_price: true }
    });
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    const priceById = new Map(products.map(p => [p.id, Number(p.unit_price)]));

    // Los precios salen de la base de datos, nunca del navegador.
    // computeSaleTotals es la misma función que usa el POS para mostrar el total.
    const pricingInput = items.map((item: any) => ({
      quantity: Number(item.quantity),
      unitPrice: priceById.get(item.product_id)!,
      discountPct: Number(item.discount || 0),
    }));
    for (const line of pricingInput) {
      const invalid = validateLine(line);
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    }
    const totals = computeSaleTotals(pricingInput);
    const lines = totals.lines.map((l, i) => ({ ...l, product_id: items[i].product_id as string }));
    const { subtotal, discountTotal: discount_total, taxTotal: tax_total, grandTotal: serverGrandTotal } = totals;

    // Si el total del POS no coincide (precio cambiado o manipulado), no se cobra.
    if (grand_total !== undefined && !totalsMatch(Number(grand_total), serverGrandTotal)) {
      return NextResponse.json({
        error: 'Los precios cambiaron. Vuelve a cargar los productos e intenta de nuevo.',
        expected_total: serverGrandTotal
      }, { status: 409 });
    }
    if (patient_id) {
      const patient = await prisma.patient.findFirst({ where: { id: patient_id, tenant_id }, select: { id: true } });
      if (!patient) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // We will do this in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Create Sale
      const newSale = await tx.sale.create({
        data: {
          tenant_id,
          patient_id: patient_id || null,
          cashier_id,
          subtotal,
          tax_total,
          discount_total,
          grand_total: serverGrandTotal,
          payment_method: payment_method || 'CASH',
          status: 'COMPLETED',
        }
      });

      // 2. Process Items and Inventory
      for (const item of lines) {
        const saleItem = await tx.saleItem.create({
          data: {
            sale_id: newSale.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: item.net,
            tax_rate: TAX_RATE,
            tax_amount: item.tax,
            total: item.total
          }
        });

        // Descuenta del lote que vence primero (FEFO)
        const batches = await tx.batch.findMany({
          where: { product_id: item.product_id, tenant_id, quantity: { gt: 0 } },
          select: { id: true, quantity: true, expiration_date: true }
        });
        const { allocations, shortfall, expiredUnits } = allocateFefo(batches, item.quantity);

        // Lo que falta solo existe en lotes vencidos: no se vende
        if (shortfall > 0 && expiredUnits > 0) {
          throw new ExpiredStockError(item.product_id);
        }

        for (const allocation of allocations) {
          await tx.batch.update({
            where: { id: allocation.batchId },
            data: { quantity: { decrement: allocation.quantity } }
          });

          await tx.stockMovement.create({
            data: {
              tenant_id,
              product_id: item.product_id,
              batch_id: allocation.batchId,
              user_id: cashier_id,
              movement_type: 'SALE_OUT',
              quantity: -allocation.quantity,
              reference_id: newSale.id
            }
          });
        }

        // Si todo salió de un único lote, se guarda en el ítem (útil para trazabilidad)
        if (allocations.length === 1 && shortfall === 0) {
          await tx.saleItem.update({ where: { id: saleItem.id }, data: { batch_id: allocations[0].batchId } });
        }

        // Sobreventa: el faltante se registra como movimiento sin lote
        if (shortfall > 0) {
          await tx.stockMovement.create({
            data: {
              tenant_id,
              product_id: item.product_id,
              user_id: cashier_id,
              movement_type: 'SALE_OUT',
              quantity: -shortfall,
              reference_id: newSale.id
            }
          });
        }
      }

      // 3. Create Payment
      await tx.payment.create({
        data: {
          sale_id: newSale.id,
          amount: serverGrandTotal,
          payment_method: payment_method || 'CASH'
        }
      });

      return newSale;
    });

    // Automatización "venta completada": recibo por WhatsApp al paciente
    // (en la demo queda en la bandeja simulada). Un fallo aquí no anula la venta.
    if (patient_id) {
      try {
        const auto = await prisma.whatsappAutomation.findFirst({
          where: { trigger_event: 'SALE_COMPLETED', is_active: true, tenant_id },
          select: { template_id: true },
        });
        if (auto) {
          await sendWhatsApp({ tenantId: tenant_id, patientId: patient_id, templateId: auto.template_id, saleId: sale.id, userId: auth.profileId, trigger: 'SALE_COMPLETED' });
        }
      } catch (e) {
        console.error('WhatsApp tras la venta', e);
      }
    }

    return NextResponse.json({ success: true, sale });
  } catch (error: any) {
    if (error instanceof ExpiredStockError) {
      return NextResponse.json({ error: error.message, product_id: error.productId }, { status: 409 });
    }
    console.error("Checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

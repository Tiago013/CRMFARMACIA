export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const TAX_RATE = 0.19; // IVA, igual que en el POS

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
    // Misma fórmula que el POS: descuento % por línea + IVA sobre el subtotal.
    const lines: { product_id: string; quantity: number; unit_price: number; gross: number; net: number }[] = [];
    for (const item of items) {
      const quantity = Number(item.quantity);
      const discountPct = Number(item.discount || 0);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 });
      }
      if (!(discountPct >= 0 && discountPct <= 100)) {
        return NextResponse.json({ error: 'Descuento inválido' }, { status: 400 });
      }
      const unit_price = priceById.get(item.product_id)!;
      const gross = quantity * unit_price;
      const net = gross * (1 - discountPct / 100);
      lines.push({ product_id: item.product_id as string, quantity, unit_price, gross, net });
    }
    const subtotal = lines.reduce((acc, l) => acc + l.net, 0);
    const discount_total = lines.reduce((acc, l) => acc + (l.gross - l.net), 0);
    const tax_total = subtotal * TAX_RATE;
    const serverGrandTotal = subtotal + tax_total;

    // Si el total del POS no coincide (precio cambiado o manipulado), no se cobra.
    if (grand_total !== undefined && Math.abs(Number(grand_total) - serverGrandTotal) > 1) {
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
            unit_price: item.unit_price,
            subtotal: item.net,
            tax_rate: TAX_RATE,
            tax_amount: item.net * TAX_RATE,
            total: item.net
          }
        });
        const usedBatchIds: string[] = [];

        // Deduct inventory from the oldest batch
        let qtyToDeduct = item.quantity;
        const batches = await tx.batch.findMany({
          where: { product_id: item.product_id, tenant_id, quantity: { gt: 0 } },
          orderBy: { expiration_date: 'asc' }
        });

        for (const batch of batches) {
          if (qtyToDeduct <= 0) break;

          const deduction = Math.min(batch.quantity, qtyToDeduct);
          
          await tx.batch.update({
            where: { id: batch.id },
            data: { quantity: batch.quantity - deduction }
          });

          await tx.stockMovement.create({
            data: {
              tenant_id,
              product_id: item.product_id,
              batch_id: batch.id,
              user_id: cashier_id,
              movement_type: 'SALE_OUT',
              quantity: -deduction,
              reference_id: newSale.id
            }
          });

          usedBatchIds.push(batch.id);
          qtyToDeduct -= deduction;
        }

        // Si todo salió de un único lote, se guarda en el ítem (útil para trazabilidad)
        if (usedBatchIds.length === 1 && qtyToDeduct <= 0) {
          await tx.saleItem.update({ where: { id: saleItem.id }, data: { batch_id: usedBatchIds[0] } });
        }

        // If we still have qtyToDeduct > 0, it means we oversold.
        // We will just allow negative stock on a hypothetical "default" batch or just record a movement without batch
        if (qtyToDeduct > 0) {
          await tx.stockMovement.create({
            data: {
              tenant_id,
              product_id: item.product_id,
              user_id: cashier_id,
              movement_type: 'SALE_OUT',
              quantity: -qtyToDeduct,
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

    // Attempt WhatsApp Notification in background if patient exists
    try {
      // Nota: el POS no envía customer_id, así que esta notificación está inactiva a propósito.
      if (body?.customer_id) {
        const auto = await prisma.whatsappAutomation.findFirst({
          where: { trigger_event: 'SALE_COMPLETED', is_active: true, tenant_id },
          include: { template: true }
        });
        
        if (auto && auto.template) {
          const patient = await prisma.patient.findFirst({ where: { id: body.customer_id, tenant_id }});
          if (patient && patient.phone) {
            let msg = auto.template.content;
            // Basic variable replacement {{1}} = name, {{2}} = total
            msg = msg.replace('{{1}}', patient.first_name);
            msg = msg.replace('{{2}}', `$${Math.round(serverGrandTotal).toLocaleString('es-CO')}`);

            await fetch('http://127.0.0.1:3001/api/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: patient.phone, message: msg })
            }).catch(e => console.error("WP API Not running", e));
          }
        }
      }
    } catch(e) {}

    return NextResponse.json({ success: true, sale });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

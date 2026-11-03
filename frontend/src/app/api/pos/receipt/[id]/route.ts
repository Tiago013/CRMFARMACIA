export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Datos para imprimir el recibo de una venta de la farmacia del usuario
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const sale = await prisma.sale.findFirst({
    where: { id, tenant_id: auth.tenantId },
    include: {
      items: { include: { product: { select: { brand_name: true, sku: true } } } },
      payments: true,
      patient: { select: { first_name: true, last_name: true, document_id: true } },
    },
  });
  if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });

  const [pharmacy, cashier] = await Promise.all([
    prisma.pharmacy.findUnique({ where: { id: auth.tenantId } }),
    prisma.userProfile.findFirst({
      where: { tenant_id: auth.tenantId, OR: [{ id: sale.cashier_id }, { auth_id: sale.cashier_id }] },
      select: { first_name: true, last_name: true },
    }),
  ]);
  const settings = (pharmacy?.settings ?? {}) as Record<string, any>;

  return NextResponse.json({
    sale: {
      id: sale.id,
      number: sale.id.slice(0, 8).toUpperCase(),
      created_at: sale.created_at,
      status: sale.status,
      payment_method: sale.payment_method,
      subtotal: sale.subtotal,
      discount_total: sale.discount_total,
      tax_total: sale.tax_total,
      grand_total: sale.grand_total,
      items: sale.items.map(i => ({
        name: i.product.brand_name,
        sku: i.product.sku,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total: i.total,
      })),
      patient: sale.patient ? { name: `${sale.patient.first_name} ${sale.patient.last_name}`, document_id: sale.patient.document_id } : null,
      cashier: settings.receipt_hide_cashier ? null : cashier ? `${cashier.first_name} ${cashier.last_name}`.trim() : null,
    },
    pharmacy: {
      name: settings.pharmacy_commercial_name || pharmacy?.name,
      legal_name: pharmacy?.name,
      tax_id: pharmacy?.tax_id,
      address: pharmacy?.address,
      phone: pharmacy?.phone,
      dian_resolution: settings.pharmacy_dian_resolution || null,
      logo_url: settings.receipt_logo === false ? null : settings.logo_url || null,
      show_tax: settings.receipt_tax !== false,
    },
  });
}

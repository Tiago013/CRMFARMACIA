import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { localDay } from '@/lib/dates';
import { CASH_METHODS, cashSummary } from '@/lib/pos/cash';
import { buildZReport } from '@/lib/reports/zReport';

export const dynamic = 'force-dynamic';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// GET ?date=YYYY-MM-DD (por defecto hoy, hora de Colombia): reporte Z del día
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const tenant_id = auth.tenantId;

  const date = request.nextUrl.searchParams.get('date') ?? localDay(new Date());
  if (!DAY.test(date) || Number.isNaN(Date.parse(date))) {
    return NextResponse.json({ error: 'Fecha inválida (use AAAA-MM-DD)' }, { status: 400 });
  }
  // Día local de Colombia (UTC−5, sin horario de verano)
  const start = new Date(`${date}T05:00:00.000Z`);
  const end = new Date(start.getTime() + 86_400_000);

  try {
    const [pharmacy, sales, sessions] = await Promise.all([
      prisma.pharmacy.findUnique({ where: { id: tenant_id }, select: { name: true } }),
      prisma.sale.findMany({
        where: { tenant_id, created_at: { gte: start, lt: end } },
        select: {
          id: true, status: true, payment_method: true, subtotal: true, discount_total: true, tax_total: true,
          grand_total: true, created_at: true,
          items: { select: { quantity: true, total: true, product: { select: { brand_name: true } } } },
        },
      }),
      // Turnos que estuvieron abiertos en algún momento del día
      prisma.cashSession.findMany({
        where: { tenant_id, opened_at: { lt: end }, OR: [{ closed_at: null }, { closed_at: { gte: start } }] },
      }),
    ]);

    // Un turno aún abierto no tiene cuadre guardado: se calcula lo esperado hasta ahora
    const sessionRows = await Promise.all(sessions.map(async (s) => {
      if (s.status !== 'OPEN') {
        return {
          status: s.status, opened_at: s.opened_at, closed_at: s.closed_at,
          opening_amount: Number(s.opening_amount),
          cash_sales: s.cash_sales === null ? null : Number(s.cash_sales),
          expected_amount: s.expected_amount === null ? null : Number(s.expected_amount),
          counted_amount: s.counted_amount === null ? null : Number(s.counted_amount),
          difference: s.difference === null ? null : Number(s.difference),
        };
      }
      const agg = await prisma.sale.aggregate({
        where: { tenant_id, status: 'COMPLETED', payment_method: { in: CASH_METHODS }, created_at: { gte: s.opened_at } },
        _sum: { grand_total: true },
      });
      const live = cashSummary(Number(s.opening_amount), Number(agg._sum.grand_total || 0));
      return {
        status: s.status, opened_at: s.opened_at, closed_at: null,
        opening_amount: live.opening, cash_sales: live.cashSales, expected_amount: live.expected,
        counted_amount: null, difference: null,
      };
    }));

    const report = buildZReport(
      date,
      sales.map((s) => ({
        id: s.id, status: s.status, payment_method: s.payment_method,
        subtotal: Number(s.subtotal), discount_total: Number(s.discount_total), tax_total: Number(s.tax_total),
        grand_total: Number(s.grand_total), created_at: s.created_at,
        items: s.items.map((i) => ({ quantity: i.quantity, total: Number(i.total), name: i.product.brand_name })),
      })),
      sessionRows,
    );

    return NextResponse.json({ pharmacy: pharmacy?.name ?? 'Farmacia', report });
  } catch (error) {
    console.error('reports/z', error);
    return NextResponse.json({ error: 'No se pudo generar el reporte Z' }, { status: 500 });
  }
}

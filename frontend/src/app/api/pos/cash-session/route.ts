export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CASH_METHODS, cashSummary, countCash, sanitizeDenominations } from '@/lib/pos/cash';

// Ventas en efectivo de la farmacia desde la apertura del turno
async function cashSalesSince(tenant_id: string, since: Date) {
  const agg = await prisma.sale.aggregate({
    where: { tenant_id, status: 'COMPLETED', payment_method: { in: CASH_METHODS }, created_at: { gte: since } },
    _sum: { grand_total: true },
    _count: true,
  });
  return { total: Number(agg._sum.grand_total || 0), count: agg._count };
}

// GET: turno abierto (si hay) con lo que debería haber en caja
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const session = await prisma.cashSession.findFirst({
    where: { tenant_id: auth.tenantId, status: 'OPEN' },
    orderBy: { opened_at: 'desc' },
  });
  if (!session) return NextResponse.json({ session: null });

  const sales = await cashSalesSince(auth.tenantId, session.opened_at);
  return NextResponse.json({
    session,
    summary: { ...cashSummary(Number(session.opening_amount), sales.total), cashSalesCount: sales.count },
  });
}

// POST { action: 'open' | 'close', denominations }
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const userId = auth.profileId ?? auth.authId;

  const body = await request.json().catch(() => ({}));
  const denominations = sanitizeDenominations(body?.denominations);
  const counted = countCash(denominations);

  if (body?.action === 'open') {
    try {
      const session = await prisma.cashSession.create({
        data: {
          tenant_id: auth.tenantId,
          opened_by: userId,
          opening_amount: counted,
          opening_denominations: denominations,
        },
      });
      return NextResponse.json({ session, summary: cashSummary(counted, 0) }, { status: 201 });
    } catch (error) {
      // El índice parcial impide dos turnos abiertos en la misma farmacia
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya hay una caja abierta en esta farmacia' }, { status: 409 });
      }
      throw error;
    }
  }

  if (body?.action === 'close') {
    const session = await prisma.cashSession.findFirst({
      where: { tenant_id: auth.tenantId, status: 'OPEN' },
      orderBy: { opened_at: 'desc' },
    });
    if (!session) return NextResponse.json({ error: 'No hay una caja abierta' }, { status: 409 });

    const sales = await cashSalesSince(auth.tenantId, session.opened_at);
    const summary = cashSummary(Number(session.opening_amount), sales.total, counted);

    // Solo se cierra si sigue abierta (evita un doble cierre simultáneo)
    const closed = await prisma.cashSession.updateMany({
      where: { id: session.id, status: 'OPEN' },
      data: {
        status: 'CLOSED',
        closed_by: userId,
        closed_at: new Date(),
        cash_sales: summary.cashSales,
        expected_amount: summary.expected,
        counted_amount: summary.counted,
        difference: summary.difference,
        closing_denominations: denominations,
      },
    });
    if (closed.count === 0) return NextResponse.json({ error: 'La caja ya fue cerrada' }, { status: 409 });

    return NextResponse.json({ summary: { ...summary, cashSalesCount: sales.count } });
  }

  return NextResponse.json({ error: "Acción inválida: usa 'open' o 'close'" }, { status: 400 });
}

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import prisma from '@/lib/prisma';

// Restaura la farmacia demo cada noche (vercel.json → crons).
// Vercel envía "Authorization: Bearer <CRON_SECRET>"; sin ese secreto no se ejecuta.
function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get('authorization') ?? '');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Toda la restauración ocurre en una sola transacción dentro de Postgres
    // (función demo_template.reset_demo, ver prisma/demo_reset.sql)
    const [result] = await prisma.$queryRaw<{ reset_demo: unknown }[]>`select demo_template.reset_demo()`;
    console.log('Demo restaurada', result?.reset_demo);
    return NextResponse.json({ ok: true, summary: result?.reset_demo });
  } catch (error: any) {
    console.error('Error restaurando la demo:', error);
    return NextResponse.json({ ok: false, error: 'No se pudo restaurar la demo' }, { status: 500 });
  }
}

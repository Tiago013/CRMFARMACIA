import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const templates = await prisma.whatsappTemplate.findMany({
      where: { tenant_id: auth.tenantId },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(templates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { name, content, variables } = body;

    const template = await prisma.whatsappTemplate.create({
      data: {
        tenant_id: auth.tenantId,
        name,
        content,
        variables: variables || 0
      }
    });

    return NextResponse.json(template);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

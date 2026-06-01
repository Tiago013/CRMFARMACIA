import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const templates = await prisma.whatsappTemplate.findMany({
      where: { tenant_id: pharmacy.id },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(templates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const body = await request.json();
    const { name, content, variables } = body;

    const template = await prisma.whatsappTemplate.create({
      data: {
        tenant_id: pharmacy.id,
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

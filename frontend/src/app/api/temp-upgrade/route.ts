import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.pharmacy.updateMany({
      data: { plan_type: 'ENTERPRISE' }
    });
    return NextResponse.json({ success: true, message: 'All pharmacies upgraded to ENTERPRISE' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

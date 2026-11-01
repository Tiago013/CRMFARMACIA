export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const pharmacies = await prisma.pharmacy.findMany({ where: { id: auth.tenantId } });
    
    // Si no hay farmacias, retornar un array vacío
    if (!pharmacies || pharmacies.length === 0) {
      return NextResponse.json([]);
    }

    // Mapear farmacias al formato esperado por el frontend
    const branches = pharmacies.map(p => ({
      id: p.id,
      name: p.name,
      address: p.address || 'Sin dirección',
      phone: p.phone || ''
    }));

    return NextResponse.json(branches);
  } catch (error: any) {
    console.error("Error fetching branches:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

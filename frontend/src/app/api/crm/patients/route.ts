export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const includeSales: any = {
      sales: {
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      }
    };

    let patients;
    if (search) {
      patients = await prisma.patient.findMany({
        where: {
          tenant_id: auth.tenantId,
          OR: [
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { document_id: { contains: search, mode: 'insensitive' } },
          ]
        },
        include: includeSales,
        orderBy: { last_purchase_date: 'desc' }
      });
    } else {
      patients = await prisma.patient.findMany({
        where: { tenant_id: auth.tenantId },
        orderBy: { last_purchase_date: 'desc' },
        include: includeSales,
        take: 50
      });
    }

    return NextResponse.json(patients);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const tenant_id = auth.tenantId;

    const body = await request.json();
    const { 
      first_name, 
      last_name, 
      phone, 
      document_id,
      email,
      birth_date,
      address,
      eps,
      blood_group,
      allergies,
      medical_notes,
      emergency_contact_name,
      emergency_contact_phone,
      preferences,
      tags
    } = body;

    const newPatient = await prisma.patient.create({
      data: {
        tenant_id,
        first_name,
        last_name,
        phone,
        document_id,
        email,
        birth_date: birth_date ? new Date(birth_date) : null,
        address,
        eps,
        blood_group,
        allergies,
        medical_notes,
        emergency_contact_name,
        emergency_contact_phone,
        preferences: preferences || {},
        tags: tags || []
      }
    });

    return NextResponse.json(newPatient, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

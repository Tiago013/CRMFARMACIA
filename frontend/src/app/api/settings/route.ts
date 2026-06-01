import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { auth_id: session.user.id },
      include: { 
        pharmacy: {
          include: { users: true }
        } 
      }
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Extraer campos de la farmacia
    const pharmacy = userProfile.pharmacy;
    const settings = pharmacy.settings || {};
    
    // Devolver un objeto combinado con configuración, datos de farmacia y usuarios
    return NextResponse.json({ 
      settings: {
        ...settings,
        pharmacy_name: pharmacy.name,
        pharmacy_tax_id: pharmacy.tax_id,
        pharmacy_address: pharmacy.address,
        pharmacy_phone: pharmacy.phone,
        // Agregamos usuarios a un estado aparte
      },
      pharmacy_info: {
        id: pharmacy.id,
        name: pharmacy.name,
        tax_id: pharmacy.tax_id,
        address: pharmacy.address,
        phone: pharmacy.phone,
        status: pharmacy.status
      },
      users: pharmacy.users
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { auth_id: session.user.id },
      include: { pharmacy: true }
    });

    if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'regente')) {
      return NextResponse.json({ error: 'No tienes permisos para modificar la configuración' }, { status: 403 });
    }

    const payload = await request.json();
    
    // Separar campos directos de la farmacia
    const { 
      pharmacy_name, 
      pharmacy_tax_id, 
      pharmacy_address, 
      pharmacy_phone,
      ...updates 
    } = payload;
    
    // Merge new settings with existing ones
    const currentSettings = userProfile.pharmacy.settings as object || {};
    const newSettings = { ...currentSettings, ...updates };

    const pharmacyData: any = { settings: newSettings };
    
    if (pharmacy_name !== undefined) pharmacyData.name = pharmacy_name;
    if (pharmacy_tax_id !== undefined) pharmacyData.tax_id = pharmacy_tax_id;
    if (pharmacy_address !== undefined) pharmacyData.address = pharmacy_address;
    if (pharmacy_phone !== undefined) pharmacyData.phone = pharmacy_phone;

    const updatedPharmacy = await prisma.pharmacy.update({
      where: { id: userProfile.tenant_id },
      data: pharmacyData
    });

    return NextResponse.json({ success: true, settings: updatedPharmacy.settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

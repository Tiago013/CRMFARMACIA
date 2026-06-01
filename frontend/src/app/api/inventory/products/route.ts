export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Real implementation should extract the tenant_id from the user session
    // For MVP/Demo we'll fetch all products or the first tenant's products
    
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
    // Fetch products with their batches to calculate total quantity
    const products = await prisma.product.findMany({
      where: search ? {
        OR: [
          { brand_name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { active_ingredient: { contains: search, mode: 'insensitive' } },
        ]
      } : undefined,
      take: limit,
      include: {
        category: true,
        batches: true,
      },
      orderBy: {
        brand_name: 'asc'
      }
    });

    // Map to expected frontend format
    const formattedProducts = products.map((p) => {
      const totalStock = p.batches.reduce((sum, batch) => sum + batch.quantity, 0);
      
      // Find nearest expiration date
      let nearestExpiration: Date | null = null;
      for (const batch of p.batches) {
        if (!nearestExpiration || batch.expiration_date < nearestExpiration) {
          nearestExpiration = batch.expiration_date;
        }
      }

      return {
        id: p.id,
        sku: p.sku,
        name: p.brand_name,
        brand_name: p.brand_name, // Alias para el POS
        price: Number(p.unit_price),
        unit_price: Number(p.unit_price), // Alias para el POS
        cost_price: Number(p.cost_price || 0),
        stock: totalStock,
        total_stock: totalStock, // Alias para el frontend
        category: p.category?.name || 'Sin Categoría',
        category_name: p.category?.name || 'Sin Categoría',
        category_id: p.category_id || '',
        active_ingredient: p.active_ingredient || '',
        expiration_date: nearestExpiration ? nearestExpiration.toISOString().split('T')[0] : '',
        min_stock: p.min_stock || 5
      };
    });

    return NextResponse.json(formattedProducts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

  export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      let { tenant_id, sku, brand_name, unit_price, cost_price, min_stock, active_ingredient, presentation, expiration_date, category_id } = body;
  
      // MVP: Auto-assign default tenant if not provided
      if (!tenant_id) {
        let defaultPharmacy = await prisma.pharmacy.findFirst();
        if (!defaultPharmacy) {
          defaultPharmacy = await prisma.pharmacy.create({
            data: { name: 'FarmaAI Default Pharmacy' }
          });
        }
        tenant_id = defaultPharmacy.id;
      }
  
      if (!sku || !brand_name || unit_price === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
  
      const newProduct = await prisma.product.create({
        data: {
          tenant_id,
          sku,
          brand_name,
          unit_price,
          cost_price,
          min_stock: min_stock || 5,
          active_ingredient,
          presentation,
          category_id
        }
      });

    if (expiration_date || body.stock !== undefined) {
      await prisma.batch.create({
        data: {
          tenant_id,
          product_id: newProduct.id,
          batch_number: 'LOTE-INICIAL',
          expiration_date: expiration_date ? new Date(expiration_date) : new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
          quantity: parseInt(body.stock) || 0
        }
      });
    }

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

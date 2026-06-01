export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dimensions, metrics } = body;

    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) return NextResponse.json({ error: 'No pharmacy found' }, { status: 400 });

    const tenant_id = pharmacy.id;

    // This is a simplified dynamic query builder for MVP
    // In production, you would construct dynamic GROUP BY Prisma queries or raw SQL

    const sales = await prisma.sale.findMany({
      where: { tenant_id, status: 'COMPLETED' },
      include: {
        items: { include: { product: { include: { category: true } } } },
        patient: true,
        pharmacy: true
      }
    });

    const groups: Record<string, any> = {};

    for (const sale of sales) {
      for (const item of sale.items) {
        // Build the composite key based on dimensions
        const keyParts = [];
        
        if (dimensions.includes('fecha')) keyParts.push(sale.created_at.toISOString().split('T')[0]);
        if (dimensions.includes('mes')) keyParts.push(sale.created_at.toISOString().slice(0, 7));
        if (dimensions.includes('categoria')) keyParts.push(item.product.category?.name || 'Sin Categoría');
        if (dimensions.includes('producto')) keyParts.push(item.product.brand_name);
        if (dimensions.includes('paciente')) keyParts.push(sale.patient ? `${sale.patient.first_name} ${sale.patient.last_name}` : 'Mostrador');
        if (dimensions.includes('metodo_pago')) keyParts.push(sale.payment_method);
        if (dimensions.includes('sucursal')) keyParts.push(sale.pharmacy.name);
        
        const key = keyParts.join(' | ') || 'Total';

        if (!groups[key]) {
          groups[key] = {
            ventas_totales: 0,
            cantidad_ventas: new Set(),
            unidades_vendidas: 0,
            margen_bruto: 0,
          };
        }

        groups[key].ventas_totales += item.total;
        groups[key].cantidad_ventas.add(sale.id); // Set to count distinct sales
        groups[key].unidades_vendidas += item.quantity;
        groups[key].margen_bruto += item.total - (item.quantity * Number(item.product.cost_price || 0));
      }
    }

    const result = Object.entries(groups).map(([key, data]) => {
      const row: any = { Grupo: key };
      
      if (metrics.includes('ventas_totales')) row.Ventas_Totales = data.ventas_totales;
      if (metrics.includes('cantidad_ventas')) row.Cantidad_Ventas = data.cantidad_ventas.size;
      if (metrics.includes('unidades_vendidas')) row.Unidades_Vendidas = data.unidades_vendidas;
      if (metrics.includes('ticket_promedio')) row.Ticket_Promedio = data.cantidad_ventas.size > 0 ? data.ventas_totales / data.cantidad_ventas.size : 0;
      if (metrics.includes('margen_bruto')) row.Margen_Bruto = data.margen_bruto;
      
      return row;
    }).sort((a, b) => (b.Ventas_Totales || 0) - (a.Ventas_Totales || 0));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Custom report error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

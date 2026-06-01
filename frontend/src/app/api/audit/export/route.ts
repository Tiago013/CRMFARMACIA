import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { Parser } from 'json2csv';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { auth_id: session.user.id }
    });

    if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'regente')) {
      return NextResponse.json({ error: 'No tienes permisos para exportar auditorías' }, { status: 403 });
    }

    // Obtener últimos movimientos de inventario y ventas
    const [movements, sales] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { tenant_id: userProfile.tenant_id },
        include: { product: true },
        orderBy: { created_at: 'desc' },
        take: 500
      }),
      prisma.sale.findMany({
        where: { tenant_id: userProfile.tenant_id },
        orderBy: { created_at: 'desc' },
        take: 500
      })
    ]);

    const auditData: any[] = [];

    // Formatear Movimientos
    movements.forEach(m => {
      auditData.push({
        Fecha: m.created_at.toISOString(),
        Tipo_Evento: 'Movimiento de Inventario',
        Detalle: `${m.movement_type}: ${m.quantity} uds de ${m.product.brand_name}`,
        Usuario_ID: m.user_id,
        Referencia: m.id
      });
    });

    // Formatear Ventas
    sales.forEach(s => {
      auditData.push({
        Fecha: s.created_at.toISOString(),
        Tipo_Evento: 'Venta',
        Detalle: `Venta Completada. Método: ${s.payment_method}. Total: $${s.grand_total}`,
        Usuario_ID: s.cashier_id,
        Referencia: s.id
      });
    });

    // Ordenar cronológicamente descendente
    auditData.sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());

    // Si no hay datos, crear un array con un registro vacío pero con las cabeceras
    if (auditData.length === 0) {
      auditData.push({
        Fecha: 'Sin datos',
        Tipo_Evento: 'Sin datos',
        Detalle: 'Sin datos',
        Usuario_ID: 'Sin datos',
        Referencia: 'Sin datos'
      });
    }

    const parser = new Parser();
    const csv = parser.parse(auditData);

    const response = new NextResponse(csv);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', `attachment; filename=farma_audit_log_${new Date().toISOString().split('T')[0]}.csv`);

    return response;

  } catch (error) {
    console.error('Error exporting audit log:', error);
    return NextResponse.json({ error: 'Error interno del servidor al exportar' }, { status: 500 });
  }
}

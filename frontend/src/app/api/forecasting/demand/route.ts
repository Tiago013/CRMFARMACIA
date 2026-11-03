import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { backtest, dailySeries, findSpikes, forecast, reorderSuggestion } from '@/lib/analytics/forecast';
import { purchaseAdherence } from '@/lib/crm/adherence';
import { isExpired } from '@/lib/inventory/fefo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const tenant_id = auth.tenantId;
    const searchParams = request.nextUrl.searchParams;
    let productId = searchParams.get('productId');
    if (productId && !UUID.test(productId)) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // 1. Determine Product
    // If no product provided, find the one with the most sale items
    if (!productId) {
      const topSellingProduct = await prisma.saleItem.groupBy({
        by: ['product_id'],
        where: { sale: { tenant_id } },
        _count: { product_id: true },
        orderBy: { _count: { product_id: 'desc' } },
        take: 1
      });

      if (topSellingProduct.length > 0) {
        productId = topSellingProduct[0].product_id;
      }
    }

    if (!productId) {
      // Return empty state if no sales exist at all
      return NextResponse.json({
        product_id: null,
        product_name: "Sin Ventas",
        historical_data: [],
        forecast_data: [],
        anomaly_detected: false,
        explanation: "No hay suficientes datos históricos para generar proyecciones.",
        confidence_level: 0
      });
    }

    // Get Product Info
    const product = await prisma.product.findFirst({ where: { id: productId, tenant_id } });
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // 2. Historial diario de las últimas 8 semanas completas, en hora de Colombia
    const HISTORY_DAYS = 56;
    const since = new Date(Date.now() - (HISTORY_DAYS + 2) * 86_400_000);

    const [sales, batches] = await Promise.all([
      prisma.saleItem.findMany({
        where: { product_id: productId, sale: { tenant_id, status: 'COMPLETED', created_at: { gte: since } } },
        select: { quantity: true, sale: { select: { created_at: true } } },
      }),
      prisma.batch.findMany({
        where: { product_id: productId, tenant_id, quantity: { gt: 0 } },
        select: { quantity: true, expiration_date: true },
      }),
    ]);
    const historical_data = dailySeries(sales.map((s) => ({ at: s.sale.created_at, quantity: s.quantity })), HISTORY_DAYS);
    // Solo cuenta el stock que se puede vender (lotes sin vencer)
    const current_stock = batches.filter((b) => !isExpired(b.expiration_date)).reduce((acc, b) => acc + b.quantity, 0);

    // 3. Modelo estacional semanal determinista (lib/analytics/forecast.ts)
    const forecast_data = forecast(historical_data, 15);
    const validation = backtest(historical_data, 7);
    const spikes = findSpikes(historical_data);
    const anomaly_detected = spikes.length > 0;
    const explanation = anomaly_detected
      ? `El ${spikes[0].date} se vendieron ${spikes[0].value} unidades, más del triple de un día normal. El modelo usa promedios por día de la semana, así que un pico aislado pesa poco en la proyección.`
      : 'La proyección combina el nivel de las últimas dos semanas, una tendencia amortiguada y el patrón de cada día de la semana.';

    // Fetch all products for the dropdown menu
    const allProducts = await prisma.product.findMany({
      where: { tenant_id },
      select: { id: true, brand_name: true },
      orderBy: { brand_name: 'asc' }
    });

    // 6. Executive Summary Metrics
    const total_predicted_demand = Math.round(forecast_data.reduce((sum, day) => sum + day.value, 0));
    
    // Determine trend by comparing the first and last day of the forecast
    let trend_direction = "Estable";
    if (total_predicted_demand === 0) {
      trend_direction = "Sin Movimiento";
    } else if (forecast_data.length > 1) {
      const firstVal = forecast_data[0].value;
      const lastVal = forecast_data[forecast_data.length - 1].value;
      if (lastVal > firstVal * 1.1) trend_direction = "Al alza";
      else if (lastVal < firstVal * 0.9) trend_direction = "A la baja";
    }

    const reorder = reorderSuggestion(forecast_data, current_stock);

    // Confianza = 1 − error medido en la última semana (sin validación, no se inventa un número)
    const dynamic_confidence = validation ? Math.max(0, Math.min(1, 1 - validation.wape)) : null;

    // 7. Métricas de pacientes con datos reales
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
    const [totalSalesSum, totalPatientsCount, activePatientsCount, patientSales] = await Promise.all([
      prisma.sale.aggregate({
        where: { tenant_id, patient_id: { not: null }, status: 'COMPLETED' },
        _sum: { grand_total: true }
      }),
      prisma.patient.count({ where: { tenant_id } }),
      prisma.patient.count({ where: { tenant_id, sales: { some: { created_at: { gte: thirtyDaysAgo } } } } }),
      prisma.sale.findMany({
        where: { tenant_id, patient_id: { not: null }, status: 'COMPLETED' },
        select: { patient_id: true, created_at: true },
      }),
    ]);

    const clv = totalPatientsCount > 0 ? Number(totalSalesSum._sum.grand_total || 0) / totalPatientsCount : 0;
    const churn_rate = totalPatientsCount > 0 ? ((totalPatientsCount - activePatientsCount) / totalPatientsCount) * 100 : 0;

    // Días promedio entre compras de los pacientes con al menos dos visitas
    const byPatient = new Map<string, Date[]>();
    for (const s of patientSales) byPatient.set(s.patient_id!, [...(byPatient.get(s.patient_id!) ?? []), s.created_at]);
    const intervals = [...byPatient.values()].map((d) => purchaseAdherence(d).avgIntervalDays).filter((x): x is number => x !== null);
    const avg_purchase_days = intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null;

    return NextResponse.json({
      product_id: product.id,
      product_name: product.brand_name,
      historical_data,
      forecast_data,
      anomaly_detected,
      explanation,
      confidence_level: dynamic_confidence,
      model: {
        name: 'Estacional semanal (nivel + tendencia amortiguada)',
        deterministic: true,
        history_days: HISTORY_DAYS,
        validation: validation && { wape: validation.wape, mae: validation.mae, last_week: validation.actual },
      },
      all_products: allProducts,
      executive_summary: {
        total_predicted_demand,
        trend_direction,
        current_stock,
        suggested_order: reorder.order,
        coverage_days: reorder.coverageDays,
      },
      customer_metrics: {
        clv: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(clv)),
        churn_rate: Number(churn_rate).toFixed(1),
        avg_purchase_days,
        patients_with_repeat: intervals.length,
      }
    });

  } catch (error) {
    console.error('forecasting/demand', error);
    return NextResponse.json({ error: 'No se pudo calcular el pronóstico' }, { status: 500 });
  }
}

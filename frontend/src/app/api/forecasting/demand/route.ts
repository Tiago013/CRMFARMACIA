import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { backtest, findSpikes, forecast } from '@/lib/analytics/forecast';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const tenant_id = auth.tenantId;
    const searchParams = request.nextUrl.searchParams;
    let productId = searchParams.get('productId');

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

    // 2. Historial diario de las últimas 8 semanas (para aprender el patrón semanal)
    const HISTORY_DAYS = 56;
    const today = new Date();
    const since = new Date(today.getTime() - (HISTORY_DAYS - 1) * 86_400_000);
    since.setUTCHours(0, 0, 0, 0);

    const sales = await prisma.saleItem.findMany({
      where: { product_id: productId, sale: { tenant_id, status: 'COMPLETED', created_at: { gte: since } } },
      select: { quantity: true, sale: { select: { created_at: true } } },
    });

    const dailySalesMap = new Map<string, number>();
    for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
      dailySalesMap.set(new Date(today.getTime() - i * 86_400_000).toISOString().split('T')[0], 0);
    }
    for (const item of sales) {
      const dateStr = item.sale.created_at.toISOString().split('T')[0];
      if (dailySalesMap.has(dateStr)) dailySalesMap.set(dateStr, dailySalesMap.get(dateStr)! + item.quantity);
    }
    const historical_data = Array.from(dailySalesMap.entries()).map(([date, value]) => ({ date, value }));

    // 3. Modelo estacional semanal determinista (lib/analytics/forecast.ts)
    const forecast_data = forecast(historical_data, 15);
    const validation = backtest(historical_data, 7);
    const spikes = findSpikes(historical_data);
    const anomaly_detected = spikes.length > 0;
    const explanation = anomaly_detected
      ? `Se detectó un pico inusual el ${spikes[0].date} (${spikes[0].value} unidades). El modelo usa promedios por día de la semana, así que un pico aislado pesa poco en la proyección.`
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

    // Recommended stock based on the maximum daily upper bound expected in the next 15 days, plus a 20% safety net
    const maxDailyExpected = forecast_data.reduce((max: number, day: any) => Math.max(max, day.upper_bound), 0);
    const recommended_stock = total_predicted_demand === 0 ? 0 : Math.ceil(maxDailyExpected * 3); // E.g., keep 3 days worth of the absolute worst-case peak scenario

    // Confianza = 1 − error medido en la última semana (sin validación, no se inventa un número)
    const dynamic_confidence = validation ? Math.max(0, Math.min(1, 1 - validation.wape)) : null;

    // 7. Global Customer Scoring Metrics (Real data approximation)
    const thirtyDaysAgoGlobal = new Date();
    thirtyDaysAgoGlobal.setDate(new Date().getDate() - 30);
    
    const [totalSalesSum, totalPatientsCount, activePatientsCount, patientSalesCount] = await Promise.all([
      prisma.sale.aggregate({ 
        where: { tenant_id, patient_id: { not: null } },
        _sum: { grand_total: true } 
      }),
      prisma.patient.count({ where: { tenant_id } }),
      prisma.patient.count({ where: { tenant_id, sales: { some: { created_at: { gte: thirtyDaysAgoGlobal } } } } }),
      prisma.sale.count({ where: { tenant_id, patient_id: { not: null } } })
    ]);

    const clv = totalPatientsCount > 0 ? Number(totalSalesSum._sum.grand_total || 0) / totalPatientsCount : 0;
    const churn_rate = totalPatientsCount > 0 ? ((totalPatientsCount - activePatientsCount) / totalPatientsCount) * 100 : 0;
    
    // Average days between purchases (rough estimate)
    let avg_purchase_days = 15;
    if (patientSalesCount > totalPatientsCount && totalPatientsCount > 0) {
      const avgPurchasesPerPatient = patientSalesCount / totalPatientsCount;
      // Assuming a 6 month lifespan for simplicity of this metric
      avg_purchase_days = Math.max(1, Math.round(180 / avgPurchasesPerPatient));
    }

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
        recommended_stock
      },
      customer_metrics: {
        clv: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(clv)),
        churn_rate: Number(churn_rate).toFixed(1),
        avg_purchase_days: avg_purchase_days
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

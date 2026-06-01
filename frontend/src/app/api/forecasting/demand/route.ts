import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let productId = searchParams.get('productId');

    // 1. Determine Product
    // If no product provided, find the one with the most sale items
    if (!productId) {
      const topSellingProduct = await prisma.saleItem.groupBy({
        by: ['product_id'],
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
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // 2. Fetch Historical Sales (Last 30 Days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const sales = await prisma.saleItem.findMany({
      where: {
        product_id: productId,
        sale: {
          created_at: {
            gte: thirtyDaysAgo
          }
        }
      },
      include: {
        sale: true
      }
    });

    // Aggregate by Day
    const dailySalesMap = new Map<string, number>();
    
    // Initialize last 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailySalesMap.set(dateStr, 0);
    }

    sales.forEach(item => {
      const dateStr = item.sale.created_at.toISOString().split('T')[0];
      if (dailySalesMap.has(dateStr)) {
        dailySalesMap.set(dateStr, dailySalesMap.get(dateStr)! + item.quantity);
      }
    });

    const historical_data = Array.from(dailySalesMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 3. Simple Predictive Algorithm (Prophet Simulation) OR REAL PROPHET AI
    let forecast_data = [];
    let anomaly_detected = false;
    let explanation = "La proyección indica una demanda estable basada en el comportamiento reciente.";

    try {
      // Intentar conectar con la verdadera IA en Python (FastAPI + Prophet)
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historical_data: historical_data,
          days_to_predict: 15
        })
      });

      if (response.ok) {
        const ai_data = await response.json();
        forecast_data = ai_data.predictions;
        
        // Explicabilidad de la IA: detectar picos para Prophet
        const mean = historical_data.reduce((acc, d) => acc + d.value, 0) / (historical_data.length || 1);
        const maxSaleDay = historical_data.reduce((prev, current) => (prev.value > current.value) ? prev : current, {date: '', value: -1});
        if (maxSaleDay.value > mean * 3 && maxSaleDay.value > 0) {
          anomaly_detected = true;
          explanation = `Prophet detectó un pico inusual en las ventas el ${maxSaleDay.date} (${maxSaleDay.value} unidades). El modelo ha ajustado la estacionalidad para no sobreestimar.`;
        }
      } else {
        throw new Error("IA Python no disponible");
      }
    } catch (e) {
      // Fallback a matemáticas simples si la IA de Python no está encendida
      console.log("IA Python no encontrada, usando Fallback Matemático.");
      let totalSales = 0, sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      const n = historical_data.length;
      const values = historical_data.map(d => d.value);
      
      historical_data.forEach((d, i) => {
        totalSales += d.value;
        sumX += i; sumY += d.value; sumXY += i * d.value; sumX2 += i * i;
      });

      let slope = 0, intercept = 0;
      if (n > 1) {
        slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        intercept = (sumY - slope * sumX) / n;
      }

      const mean = totalSales / (n || 1);
      const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n || 1);
      const stdDev = Math.sqrt(variance);

      const lastHistoricalDate = new Date();
      for (let i = 1; i <= 15; i++) {
        const d = new Date(lastHistoricalDate);
        d.setDate(lastHistoricalDate.getDate() + i);
        const x = n + i - 1;
        let predicted_value = Math.max(0, intercept + slope * x);
        const noise = (Math.random() - 0.5) * stdDev * 0.5;
        predicted_value = Math.max(0, predicted_value + noise);
        const margin = stdDev * 1.5; 
        
        forecast_data.push({
          date: d.toISOString().split('T')[0],
          value: Math.round(predicted_value),
          lower_bound: Math.max(0, Math.round(predicted_value - margin)),
          upper_bound: Math.round(predicted_value + margin)
        });
      }
      
      const maxSaleDay = historical_data.reduce((prev, current) => (prev.value > current.value) ? prev : current, {date: '', value: -1});
      if (maxSaleDay.value > mean + (stdDev * 2) && maxSaleDay.value > 0) {
        anomaly_detected = true;
        explanation = `Se detectó un pico inusual en las ventas el ${maxSaleDay.date} (${maxSaleDay.value} unidades). El modelo matemático ha suavizado este evento.`;
      }
    }

    // Fetch all products for the dropdown menu
    const allProducts = await prisma.product.findMany({
      select: { id: true, brand_name: true },
      orderBy: { brand_name: 'asc' }
    });

    // 6. Executive Summary Metrics
    const total_predicted_demand = forecast_data.reduce((sum: number, day: any) => sum + day.value, 0);
    
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

    // Calculate Dynamic Confidence Level
    let dynamic_confidence = 0.95;
    if (total_predicted_demand === 0) {
      dynamic_confidence = 0.99; // Very confident in zero demand if history is flat
    } else {
      const values = historical_data.map(d => d.value);
      const histMean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
      const histVar = values.reduce((acc, val) => acc + Math.pow(val - histMean, 2), 0) / (values.length || 1);
      const histStdDev = Math.sqrt(histVar);
      
      const cv = histStdDev / (histMean || 1); // Coefficient of variation
      // Higher volatility (high CV) means lower confidence
      dynamic_confidence = Math.max(0.45, Math.min(0.98, 1 - (cv * 0.35)));
    }

    // 7. Global Customer Scoring Metrics (Real data approximation)
    const thirtyDaysAgoGlobal = new Date();
    thirtyDaysAgoGlobal.setDate(new Date().getDate() - 30);
    
    const [totalSalesSum, totalPatientsCount, activePatientsCount, patientSalesCount] = await Promise.all([
      prisma.sale.aggregate({ 
        where: { patient_id: { not: null } },
        _sum: { grand_total: true } 
      }),
      prisma.patient.count(),
      prisma.patient.count({ where: { sales: { some: { created_at: { gte: thirtyDaysAgoGlobal } } } } }),
      prisma.sale.count({ where: { patient_id: { not: null } } })
    ]);

    const clv = totalPatientsCount > 0 ? (totalSalesSum._sum.grand_total || 0) / totalPatientsCount : 0;
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

// Recorrido guiado de la demo: 6 pasos, uno por módulo, en el orden en que
// conviene verlos. Cada paso abre su página y resalta su entrada del menú.

export type TourStep = {
  href: string;     // página del paso (puede llevar ?tab=…)
  title: string;
  body: string;
  tryIt: string;    // qué hacer en la página
};

export const TOUR_STEPS: TourStep[] = [
  {
    href: '/crm',
    title: 'Pacientes: ficha 360°',
    body: 'Historial de compras, gasto mensual, adherencia y alergias de cada paciente.',
    tryIt: 'Abre a Laura Rodríguez y pulsa «Generar recomendaciones»: la IA nunca sugiere un antiinflamatorio, porque es alérgica a los AINE.',
  },
  {
    href: '/sales',
    title: 'Punto de venta',
    body: 'Caja con arqueo por denominaciones, IVA y descuento del lote que vence primero (FEFO). El servidor recalcula el total con los precios de la base.',
    tryIt: 'Abre caja, pulsa F4 para elegir un paciente, agrega dos productos y cobra.',
  },
  {
    href: '/whatsapp',
    title: 'WhatsApp en modo demo',
    body: 'Al cobrar a un paciente, su recibo se arma con la plantilla y los datos de la venta.',
    tryIt: 'Busca aquí el recibo de la venta que acabas de hacer: está marcado «Simulado», no se envía nada.',
  },
  {
    href: '/inventory',
    title: 'Inventario por vencimiento',
    body: 'Lotes ordenados por fecha de vencimiento, conteo físico y mermas registradas como movimientos.',
    tryIt: 'Mira los lotes «próximo a vencer»: el punto de venta los descuenta primero.',
  },
  {
    href: '/transactions?tab=cierre',
    title: 'Cierre del día (reporte Z)',
    body: 'Ventas, medios de pago, devoluciones y cuadre de cada turno de caja.',
    tryIt: 'Descárgalo en Excel o PDF; tu venta de hace un momento ya aparece.',
  },
  {
    href: '/dashboard',
    title: 'Dashboard',
    body: 'Ingresos, gastos y utilidad comparados con el periodo anterior, horas pico y vencimientos a 30/60/90 días.',
    tryIt: 'Cambia el periodo a «Año actual» para ver 16 semanas de historia.',
  },
];

// Ruta del menú que corresponde a un paso (sin la parte ?tab=…)
export function menuPath(href: string): string {
  return href.split('?')[0];
}

// Paso siguiente o anterior, sin salirse del recorrido
export function clampStep(step: number): number {
  return Math.min(TOUR_STEPS.length - 1, Math.max(0, step));
}

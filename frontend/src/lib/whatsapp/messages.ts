// Mensajes de WhatsApp: armado desde plantillas y modo de envío.
//
// - demo (por defecto, p. ej. en Vercel): no se envía nada; el mensaje queda en
//   la bandeja simulada, etiquetada "Modo demo".
// - local (WHATSAPP_MODE=local): se envía por el servicio de whatsapp-web.js
//   (npm run whatsapp) que corre en la misma máquina, en el puerto 3001.
// En ambos casos el mensaje queda en el historial del paciente.

export type WhatsAppMode = 'demo' | 'local';

export function whatsappMode(env: string | undefined = process.env.WHATSAPP_MODE): WhatsAppMode {
  return env === 'local' ? 'local' : 'demo';
}

export const MESSAGE_EVENT = 'Mensaje WhatsApp';

export type SaleForMessage = {
  grand_total: number;
  created_at: Date | string;
  items: { quantity: number; total: number; name: string }[];
};

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

// Rellena {{1}} nombre, {{2}} total, {{3}} fecha y {{4}} detalle de la compra.
// Sin venta, las variables de compra quedan como marcadores legibles.
export function fillTemplate(content: string, firstName: string, sale?: SaleForMessage): string {
  const values: Record<string, string> = sale
    ? {
        '1': firstName,
        '2': money(sale.grand_total),
        '3': new Date(sale.created_at).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
        '4': sale.items.map((i) => `🔹 ${i.quantity}x ${i.name} (${money(i.total)})`).join('\n') || 'Productos no detallados',
      }
    : { '1': firstName, '2': '(monto)', '3': '(fecha)', '4': '(detalle de compra)' };
  return content.replace(/\{\{(\d+)\}\}/g, (match, n: string) => values[n] ?? match);
}

// La plantilla necesita una venta si usa alguna variable de compra
export function needsSale(content: string): boolean {
  return /\{\{[234]\}\}/.test(content);
}

export type DeliveryStatus = 'simulado' | 'enviado' | 'error';

// Envía (modo local) o simula (modo demo). Nunca lanza: el resultado va al historial.
export async function deliver(phone: string, text: string, mode: WhatsAppMode = whatsappMode()): Promise<{ status: DeliveryStatus; error?: string }> {
  if (mode === 'demo') return { status: 'simulado' };
  try {
    const res = await fetch('http://127.0.0.1:3001/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message: text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { status: 'error', error: data.error || `HTTP ${res.status}` };
    }
    return { status: 'enviado' };
  } catch {
    return { status: 'error', error: 'El servicio local de WhatsApp no responde (npm run whatsapp)' };
  }
}

import prisma from '@/lib/prisma';
import { deliver, fillTemplate, MESSAGE_EVENT, whatsappMode, type SaleForMessage } from './messages';

type SendInput = {
  tenantId: string;
  patientId: string;
  templateId: string;
  saleId?: string | null;
  userId?: string | null;
  trigger: 'manual' | 'SALE_COMPLETED';
};

export type SendResult =
  | { ok: true; mode: 'demo' | 'local'; status: string; text: string; phone: string; error?: string }
  | { ok: false; httpStatus: number; error: string };

// Arma el mensaje con los datos de la base (no con lo que mande el navegador),
// lo envía o lo simula según el modo y lo deja en el historial del paciente.
export async function sendWhatsApp(input: SendInput): Promise<SendResult> {
  const [patient, template] = await Promise.all([
    prisma.patient.findFirst({ where: { id: input.patientId, tenant_id: input.tenantId }, select: { id: true, first_name: true, phone: true } }),
    prisma.whatsappTemplate.findFirst({ where: { id: input.templateId, tenant_id: input.tenantId } }),
  ]);
  if (!patient) return { ok: false, httpStatus: 404, error: 'Paciente no encontrado' };
  if (!template) return { ok: false, httpStatus: 404, error: 'Plantilla no encontrada' };
  if (!patient.phone) return { ok: false, httpStatus: 400, error: 'El paciente no tiene teléfono registrado' };

  let sale: SaleForMessage | undefined;
  if (input.saleId) {
    const row = await prisma.sale.findFirst({
      where: { id: input.saleId, tenant_id: input.tenantId, patient_id: patient.id },
      select: { grand_total: true, created_at: true, items: { select: { quantity: true, total: true, product: { select: { brand_name: true } } } } },
    });
    if (!row) return { ok: false, httpStatus: 404, error: 'Venta no encontrada para este paciente' };
    sale = {
      grand_total: Number(row.grand_total),
      created_at: row.created_at,
      items: row.items.map((i) => ({ quantity: i.quantity, total: Number(i.total), name: i.product.brand_name })),
    };
  }

  const mode = whatsappMode();
  const text = fillTemplate(template.content, patient.first_name, sale);
  const result = await deliver(patient.phone, text, mode);

  await prisma.patientTimelineEvent.create({
    data: {
      tenant_id: input.tenantId,
      patient_id: patient.id,
      user_id: input.userId ?? null,
      event_type: MESSAGE_EVENT,
      event_data: {
        text,
        phone: patient.phone,
        template: template.name,
        mode,
        status: result.status,
        trigger: input.trigger,
        ...(result.error ? { error: result.error } : {}),
        ...(input.saleId ? { sale_id: input.saleId } : {}),
      },
    },
  });

  return { ok: true, mode, status: result.status, text, phone: patient.phone, error: result.error };
}

import prisma from '../src/lib/prisma';

async function main() {
  const posTemplate = await prisma.whatsappTemplate.findFirst({
    where: { name: { contains: 'POS' } }
  });

  if (posTemplate) {
    await prisma.whatsappTemplate.update({
      where: { id: posTemplate.id },
      data: {
        content: `Hola {{1}}, tu compra del día {{3}} en FarmaAI fue procesada con éxito ✅.\n\n🛒 *Detalle de tu compra:*\n{{4}}\n\n💰 *Total pagado: {{2}}*\n\n¡Gracias por preferirnos! Te esperamos pronto en tu farmacia de confianza 🏥.`,
        variables: 4
      }
    });
    console.log('Template POS actualizado con más detalles.');
  }

  const reminderTemplate = await prisma.whatsappTemplate.findFirst({
    where: { name: { contains: 'Recordatorio' } }
  });

  if (reminderTemplate) {
    await prisma.whatsappTemplate.update({
      where: { id: reminderTemplate.id },
      data: {
        content: `Hola {{1}} 💊, este es un recordatorio de FarmaAI. \n\nSegún nuestro seguimiento, es momento de que renueves tu medicación para mantener tu tratamiento al día 🗓️.\n\n¿Deseas que preparemos tu pedido para envío a domicilio 🛵 o prefieres pasar a retirarlo?`,
        variables: 1
      }
    });
    console.log('Template Recordatorio actualizado.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

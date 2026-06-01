import prisma from '../src/lib/prisma';

async function main() {
  const pharmacy = await prisma.pharmacy.findFirst();
  if (!pharmacy) {
    console.error('No pharmacy found');
    return;
  }

  console.log('Seeding WhatsApp Templates...');

  // Create POS Template
  const posTemplate = await prisma.whatsappTemplate.create({
    data: {
      tenant_id: pharmacy.id,
      name: 'Recibo de Venta (POS)',
      content: 'Hola {{1}}, tu compra en FarmaAI fue procesada con éxito ✅.\n\nTotal pagado: {{2}}\n\n¡Gracias por preferirnos! Te esperamos pronto en tu farmacia de confianza 🏥.',
      variables: 2,
      is_active: true
    }
  });

  // Create Reminder Template
  await prisma.whatsappTemplate.create({
    data: {
      tenant_id: pharmacy.id,
      name: 'Recordatorio de Medicación',
      content: 'Hola {{1}} 💊, este es un recordatorio amigable de FarmaAI. Según nuestros registros, es momento de renovar tu medicación.\n\n¿Deseas que te la enviemos a domicilio o prefieres pasar a la farmacia?',
      variables: 1,
      is_active: true
    }
  });

  // Create Welcome Template
  await prisma.whatsappTemplate.create({
    data: {
      tenant_id: pharmacy.id,
      name: 'Bienvenida Paciente',
      content: '¡Hola {{1}}! 🎉 Bienvenido(a) al programa de pacientes de FarmaAI. Hemos registrado tu perfil clínico para brindarte un mejor servicio farmacéutico. Si necesitas algo, escríbenos.',
      variables: 1,
      is_active: true
    }
  });

  console.log('Seeding Automations...');

  // Create POS Automation
  await prisma.whatsappAutomation.create({
    data: {
      tenant_id: pharmacy.id,
      trigger_event: 'SALE_COMPLETED',
      template_id: posTemplate.id,
      is_active: true
    }
  });

  console.log('WhatsApp data seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

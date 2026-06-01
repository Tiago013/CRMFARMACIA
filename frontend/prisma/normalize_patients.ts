import prisma from '../src/lib/prisma';

const firstNames = [
  "Carlos", "María", "Juan", "Ana", "Luis", "Laura", "Pedro", "Sofía",
  "Diego", "Valentina", "Andrés", "Camila", "Jorge", "Isabella", "Miguel",
  "Mariana", "Fernando", "Lucía", "José", "Daniela"
];

const lastNames = [
  "Gómez", "Rodríguez", "López", "Martínez", "Pérez", "García", "Sánchez",
  "Romero", "Suárez", "Díaz", "Hernández", "Ramírez", "Torres", "Ruiz",
  "Flores", "Acosta", "Rojas", "Molina", "Castro", "Ortiz"
];

function getRandomItem(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        { first_name: { contains: 'Paciente' } },
        { last_name: { contains: 'Prueba' } }
      ]
    }
  });

  console.log(`Encontrados ${patients.length} pacientes con nombres de prueba.`);

  for (const p of patients) {
    const newFirstName = getRandomItem(firstNames);
    const newLastName = getRandomItem(lastNames);
    
    // Add some random realistic medical data
    const epsOptions = ["Sura", "Coomeva", "Sanitas", "Nueva EPS"];
    const bloodGroups = ["O+", "A-", "B+", "AB+"];
    
    await prisma.patient.update({
      where: { id: p.id },
      data: {
        first_name: newFirstName,
        last_name: newLastName,
        eps: getRandomItem(epsOptions),
        blood_group: getRandomItem(bloodGroups),
      }
    });
  }

  console.log('Todos los nombres de prueba han sido normalizados a nombres hispanos reales.');
}

main().finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const realisticProducts = [
  { b: 'Paracetamol 500mg', a: 'Paracetamol', p: 'Caja x 100 Tabletas' },
  { b: 'Ibuprofeno 400mg', a: 'Ibuprofeno', p: 'Caja x 50 Cápsulas' },
  { b: 'Amoxicilina 500mg', a: 'Amoxicilina', p: 'Caja x 30 Cápsulas' },
  { b: 'Omeprazol 20mg', a: 'Omeprazol', p: 'Caja x 30 Cápsulas' },
  { b: 'Losartán Potásico 50mg', a: 'Losartán', p: 'Caja x 30 Tabletas' },
  { b: 'Loratadina 10mg', a: 'Loratadina', p: 'Caja x 10 Tabletas' },
  { b: 'Diclofenaco 50mg', a: 'Diclofenaco Sódico', p: 'Caja x 20 Grageas' },
  { b: 'Metformina 850mg', a: 'Metformina', p: 'Caja x 30 Tabletas' },
  { b: 'Azitromicina 500mg', a: 'Azitromicina', p: 'Caja x 3 Tabletas' },
  { b: 'Cetirizina 10mg', a: 'Cetirizina', p: 'Caja x 10 Tabletas' },
  { b: 'Enalapril 20mg', a: 'Enalapril Maleato', p: 'Caja x 20 Tabletas' },
  { b: 'Salbutamol 100mcg/dosis', a: 'Salbutamol', p: 'Inhalador x 200 Dosis' },
  { b: 'Naproxeno 250mg', a: 'Naproxeno', p: 'Caja x 20 Tabletas' },
  { b: 'Atorvastatina 20mg', a: 'Atorvastatina', p: 'Caja x 30 Tabletas' },
  { b: 'Ácido Fólico 5mg', a: 'Ácido Fólico', p: 'Caja x 20 Tabletas' },
  { b: 'Complejo B', a: 'Vitaminas B1, B6, B12', p: 'Caja x 30 Grageas' },
  { b: 'Fluconazol 150mg', a: 'Fluconazol', p: 'Caja x 1 Cápsula' },
  { b: 'Levotiroxina 100mcg', a: 'Levotiroxina Sódica', p: 'Caja x 50 Tabletas' },
  { b: 'Clonazepam 2mg', a: 'Clonazepam', p: 'Caja x 30 Tabletas' },
  { b: 'Ciprofloxacino 500mg', a: 'Ciprofloxacino', p: 'Caja x 10 Tabletas' },
  { b: 'Acetaminofén Jarabe 150mg/5ml', a: 'Acetaminofén', p: 'Frasco x 120 ml' },
  { b: 'Ibuprofeno Suspensión 100mg/5ml', a: 'Ibuprofeno', p: 'Frasco x 120 ml' },
  { b: 'Amoxicilina Suspensión 250mg/5ml', a: 'Amoxicilina', p: 'Frasco x 100 ml' },
  { b: 'Loratadina Jarabe 5mg/5ml', a: 'Loratadina', p: 'Frasco x 100 ml' },
  { b: 'Vitamina C 1g', a: 'Ácido Ascórbico', p: 'Tubo x 10 Tabletas Efervescentes' },
  { b: 'Aspirina 100mg', a: 'Ácido Acetilsalicílico', p: 'Caja x 30 Tabletas' },
  { b: 'Tramadol 50mg', a: 'Tramadol Clorhidrato', p: 'Caja x 10 Cápsulas' },
  { b: 'Ketorolaco 10mg', a: 'Ketorolaco Trometamina', p: 'Caja x 10 Tabletas' },
  { b: 'Meloxicam 15mg', a: 'Meloxicam', p: 'Caja x 10 Tabletas' },
  { b: 'Cefalexina 500mg', a: 'Cefalexina', p: 'Caja x 20 Cápsulas' },
  { b: 'Ampicilina 500mg', a: 'Ampicilina', p: 'Caja x 20 Cápsulas' },
  { b: 'Trimetoprima/Sulfametoxazol 160/800mg', a: 'TMP/SMX', p: 'Caja x 10 Tabletas' },
  { b: 'Pantoprazol 40mg', a: 'Pantoprazol', p: 'Caja x 14 Tabletas' },
  { b: 'Ranitidina 150mg', a: 'Ranitidina', p: 'Caja x 20 Tabletas' },
  { b: 'Metoclopramida 10mg', a: 'Metoclopramida', p: 'Caja x 20 Tabletas' },
  { b: 'Domperidona 10mg', a: 'Domperidona', p: 'Caja x 20 Tabletas' },
  { b: 'Loperamida 2mg', a: 'Loperamida', p: 'Caja x 6 Tabletas' },
  { b: 'Amlodipino 5mg', a: 'Amlodipino', p: 'Caja x 30 Tabletas' },
  { b: 'Captopril 25mg', a: 'Captopril', p: 'Caja x 30 Tabletas' },
  { b: 'Furosemida 40mg', a: 'Furosemida', p: 'Caja x 20 Tabletas' },
  { b: 'Hidroclorotiazida 25mg', a: 'Hidroclorotiazida', p: 'Caja x 20 Tabletas' },
  { b: 'Bisoprolol 5mg', a: 'Bisoprolol Fumarato', p: 'Caja x 30 Tabletas' },
  { b: 'Clopidogrel 75mg', a: 'Clopidogrel', p: 'Caja x 14 Tabletas' },
  { b: 'Rosuvastatina 20mg', a: 'Rosuvastatina', p: 'Caja x 30 Tabletas' },
  { b: 'Simbastatina 20mg', a: 'Simbastatina', p: 'Caja x 30 Tabletas' },
  { b: 'Glibenclamida 5mg', a: 'Glibenclamida', p: 'Caja x 30 Tabletas' },
  { b: 'Insulina Glargina 100 UI/ml', a: 'Insulina Glargina', p: 'Vial x 10 ml' },
  { b: 'Dexametasona 4mg', a: 'Dexametasona', p: 'Caja x 10 Tabletas' },
  { b: 'Prednisona 50mg', a: 'Prednisona', p: 'Caja x 20 Tabletas' },
  { b: 'Betametasona Crema 0.1%', a: 'Betametasona', p: 'Tubo x 40g' },
  { b: 'Clotrimazol Crema 1%', a: 'Clotrimazol', p: 'Tubo x 20g' },
  { b: 'Ketoconazol Champú 2%', a: 'Ketoconazol', p: 'Frasco x 100ml' },
  { b: 'Miconazol Crema 2%', a: 'Miconazol', p: 'Tubo x 20g' },
  { b: 'Terbinafina 250mg', a: 'Terbinafina', p: 'Caja x 14 Tabletas' },
  { b: 'Desloratadina 5mg', a: 'Desloratadina', p: 'Caja x 10 Tabletas' },
  { b: 'Fexofenadina 120mg', a: 'Fexofenadina', p: 'Caja x 10 Tabletas' },
  { b: 'Montelukast 10mg', a: 'Montelukast', p: 'Caja x 30 Tabletas' },
  { b: 'Budesonida Spray Nasal 50mcg', a: 'Budesonida', p: 'Frasco x 120 Dosis' },
  { b: 'Bromhexina Jarabe 8mg/5ml', a: 'Bromhexina', p: 'Frasco x 120 ml' },
  { b: 'Ambroxol Jarabe 15mg/5ml', a: 'Ambroxol', p: 'Frasco x 120 ml' },
  { b: 'Dextrometorfano Jarabe 15mg/5ml', a: 'Dextrometorfano', p: 'Frasco x 120 ml' },
  { b: 'Alprazolam 0.5mg', a: 'Alprazolam', p: 'Caja x 30 Tabletas' },
  { b: 'Diazepam 10mg', a: 'Diazepam', p: 'Caja x 30 Tabletas' },
  { b: 'Sertralina 50mg', a: 'Sertralina', p: 'Caja x 30 Tabletas' },
  { b: 'Fluoxetina 20mg', a: 'Fluoxetina', p: 'Caja x 30 Cápsulas' },
  { b: 'Escitalopram 10mg', a: 'Escitalopram', p: 'Caja x 30 Tabletas' },
  { b: 'Amitriptilina 25mg', a: 'Amitriptilina', p: 'Caja x 30 Tabletas' },
  { b: 'Valproato de Sodio 500mg', a: 'Ácido Valproico', p: 'Caja x 30 Tabletas' },
  { b: 'Carbamazepina 200mg', a: 'Carbamazepina', p: 'Caja x 30 Tabletas' },
  { b: 'Gabapentina 300mg', a: 'Gabapentina', p: 'Caja x 30 Cápsulas' },
  { b: 'Pregabalina 75mg', a: 'Pregabalina', p: 'Caja x 30 Cápsulas' },
  { b: 'Sildenafil 50mg', a: 'Sildenafil', p: 'Caja x 4 Tabletas' },
  { b: 'Tadalafil 20mg', a: 'Tadalafil', p: 'Caja x 2 Tabletas' },
  { b: 'Anticonceptivos Orales (Levonorgestrel/Etinilestradiol)', a: 'Levonorgestrel/Etinilestradiol', p: 'Caja x 21 Grageas' },
  { b: 'Ibuprofeno Gel 5%', a: 'Ibuprofeno', p: 'Tubo x 50g' },
  { b: 'Diclofenaco Gel 1%', a: 'Diclofenaco Dietilamonio', p: 'Tubo x 50g' },
  { b: 'Vitamina D3 2000 UI', a: 'Colecalciferol', p: 'Caja x 30 Cápsulas' },
  { b: 'Vitamina E 400 UI', a: 'Alfatocoferol', p: 'Caja x 30 Cápsulas' },
  { b: 'Calcio + Vitamina D3', a: 'Carbonato de Calcio/Colecalciferol', p: 'Frasco x 60 Tabletas' },
  { b: 'Hierro (Sulfato Ferroso) 300mg', a: 'Sulfato Ferroso', p: 'Caja x 30 Tabletas' },
  { b: 'Zinc (Sulfato) 20mg', a: 'Sulfato de Zinc', p: 'Caja x 30 Tabletas' },
  { b: 'Magnesio (Cloruro) 500mg', a: 'Cloruro de Magnesio', p: 'Caja x 50 Tabletas' },
  { b: 'Aspirina 500mg', a: 'Ácido Acetilsalicílico', p: 'Caja x 100 Tabletas' },
  { b: 'Dexametasona Inyectable 8mg/2ml', a: 'Dexametasona', p: 'Ampolla x 2ml' },
  { b: 'Diclofenaco Inyectable 75mg/3ml', a: 'Diclofenaco Sódico', p: 'Ampolla x 3ml' },
  { b: 'Complejo B Inyectable', a: 'Vitaminas B1, B6, B12', p: 'Ampolla x 2ml' },
  { b: 'Suero Fisiológico 0.9%', a: 'Cloruro de Sodio', p: 'Bolsa x 500ml' },
  { b: 'Lactato de Ringer', a: 'Solución Hartmann', p: 'Bolsa x 500ml' },
  { b: 'Agua Oxigenada 10 V', a: 'Peróxido de Hidrógeno', p: 'Frasco x 120ml' },
  { b: 'Alcohol Antiséptico 70%', a: 'Alcohol Etílico', p: 'Frasco x 350ml' },
  { b: 'Isodine Solución', a: 'Yodopovidona', p: 'Frasco x 120ml' },
  { b: 'Gasas Estériles', a: 'Algodón', p: 'Paquete x 100 unidades' },
  { b: 'Jeringa 5ml con aguja', a: 'Dispositivo Médico', p: 'Unidad' },
  { b: 'Algodón Plisado 50g', a: 'Algodón', p: 'Paquete' },
  { b: 'Curitas (Banditas Adhesivas)', a: 'Dispositivo Médico', p: 'Caja x 100 unidades' },
  { b: 'Preservativos de Látex', a: 'Látex', p: 'Caja x 3 unidades' },
  { b: 'Prueba de Embarazo en Sangre/Orina', a: 'Reactivo Médico', p: 'Caja x 1 unidad' },
  { b: 'Termómetro Digital', a: 'Dispositivo Médico', p: 'Unidad' },
  { b: 'Tensiómetro Digital', a: 'Dispositivo Médico', p: 'Unidad' },
  { b: 'Glucómetro + Tiras Reactivas', a: 'Dispositivo Médico', p: 'Kit' },
];

async function run() {
  console.log('Fetching products...');
  const products = await prisma.product.findMany();
  
  console.log(`Found ${products.length} products. Starting normalization...`);
  
  let successCount = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const newDetails = realisticProducts[i % realisticProducts.length];
    
    await prisma.product.update({
      where: { id: p.id },
      data: {
        brand_name: newDetails.b,
        active_ingredient: newDetails.a,
        presentation: newDetails.p
      }
    });
    successCount++;
    if (i % 10 === 0) console.log(`Processed ${i} products...`);
  }
  
  console.log(`Successfully normalized ${successCount} products!`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

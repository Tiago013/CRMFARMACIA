-- Categorías coherentes para el catálogo de la demo (el seed original las
-- asignaba al azar: el acetaminofén quedaba en Dermatología). Solo toca la foto
-- demo_template; la farmacia demo toma el cambio en la siguiente restauración.

insert into demo_template.categories (id, tenant_id, name, description)
select gen_random_uuid()::text, (select tenant_id from demo_template.categories limit 1), n, 'Categoría de ' || n
from unnest(array['Sistema Nervioso', 'Antialérgicos', 'Dispositivos Médicos']) n
where not exists (select 1 from demo_template.categories c where c.name = n);

with rules(pattern, category) as (values
  ('acetaminof|paracetamol|ibuprofeno|naproxeno|diclofenaco|ketorolaco|meloxicam|tramadol|acetilsalic', 'Analgésicos'),
  ('amoxicilina|ampicilina|azitromicina|cefalexina|ciprofloxacino|sulfametoxazol|tmp/smx', 'Antibióticos'),
  ('amlodipino|atorvastatina|bisoprolol|captopril|clopidogrel|enalapril|furosemida|hidroclorotiazida|losart|rosuvastatina|simbastatina|sildenafil|tadalafil', 'Cardiovasculares'),
  ('metformina|glibenclamida|insulina|glucómetro', 'Diabéticos'),
  ('omeprazol|pantoprazol|ranitidina|domperidona|metoclopramida|loperamida|probiotic', 'Gastrointestinales'),
  ('ambroxol|bromhexina|dextrometorfano|salbutamol|budesonida|montelukast', 'Respiratorios'),
  ('cetirizina|desloratadina|fexofenadina|loratadina', 'Antialérgicos'),
  ('alprazolam|amitriptilina|carbamazepina|clonazepam|diazepam|escitalopram|fluoxetina|gabapentina|pregabalina|sertralina|valpro', 'Sistema Nervioso'),
  ('vitamina|complejo b|ácido fólico|acido folico|hierro|magnesio|zinc|calcio', 'Vitaminas'),
  ('betametasona|clotrimazol|miconazol|ketoconazol|terbinafina|fluconazol', 'Dermatología'),
  ('levonorgestrel|embarazo|preservativos', 'Maternidad'),
  ('curitas|gasas|algodón|jeringa|tensiómetro|termómetro', 'Dispositivos Médicos'),
  ('alcohol|agua oxigenada|isodine|suero|ringer', 'Cuidado Personal'),
  ('dexametasona|prednisona|levotiroxina', 'Genéricos')
),
matched as (
  select distinct on (p.id) p.id, r.category
  from demo_template.products p
  join rules r on lower(p.brand_name || ' ' || coalesce(p.active_ingredient, '')) ~ r.pattern
  order by p.id, (r.category = 'Vitaminas') desc -- si coincide con varias, gana Vitaminas
)
update demo_template.products p
set category_id = c.id
from matched m join demo_template.categories c on c.name = m.category
where p.id = m.id;

-- Dos pacientes con alergias, para que el filtro de contraindicaciones de la IA
-- tenga algo que mostrar en el recorrido
update demo_template.patients set allergies = 'Penicilina' where first_name = 'Fernando' and last_name = 'Ramírez';
update demo_template.patients set allergies = 'AINE (ibuprofeno, naproxeno)' where first_name = 'Laura' and last_name = 'Rodríguez';

select demo_template.reset_demo();

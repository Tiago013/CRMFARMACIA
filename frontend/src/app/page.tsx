import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarClock, CheckCircle2, HeartPulse, Receipt, ShieldCheck } from 'lucide-react';
import { DEMO_ACCOUNTS } from '@/lib/roles';
import dashboardShot from '@/assets/landing/dashboard.jpg';
import posShot from '@/assets/landing/pos.jpg';
import crmShot from '@/assets/landing/crm.jpg';

// Página pública de inicio: qué problema resuelve, 3 capturas y entrada a la demo
// sin contraseña. Es estática (sin JavaScript propio) para que cargue rápido.

const REPO_URL = 'https://github.com/Tiago013/CRMFARMACIA';

const PROBLEMS = [
  {
    icon: CalendarClock,
    problem: 'Medicamentos que se vencen en el estante',
    solution: 'Cada venta descuenta del lote que vence primero (FEFO), los vencidos no se pueden vender y el dashboard avisa a 30, 60 y 90 días.',
  },
  {
    icon: Receipt,
    problem: 'Una caja que no cuadra al final del día',
    solution: 'Apertura y cierre con conteo de billetes y monedas, diferencia exacta por turno y reporte Z exportable a Excel y PDF.',
  },
  {
    icon: HeartPulse,
    problem: 'Pacientes crónicos que dejan de volver',
    solution: 'Ficha 360° con adherencia, recomendaciones de IA que respetan alergias y recibo automático por WhatsApp.',
  },
];

const QUALITY = [
  '218 pruebas automáticas · 98 % de cobertura en la lógica crítica',
  'Recorrido de la demo probado cada día en un navegador real (Playwright)',
  'La IA no recomendó nada contraindicado en 50 de 50 casos de prueba',
  'Precios recalculados en el servidor y datos aislados por farmacia (RLS)',
];

const SCREENS = [
  { src: posShot, alt: 'Punto de venta con caja abierta, carrito e IVA', caption: 'Punto de venta: caja, IVA y alerta de lotes por vencer' },
  { src: crmShot, alt: 'Ficha 360° de un paciente con recomendaciones de IA', caption: 'Pacientes: historial, adherencia y recomendaciones con IA' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-black dark:text-neutral-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black" aria-hidden>F</span>
          FarmaAI
        </span>
        <nav className="flex items-center gap-4 text-sm">
          <a href={REPO_URL} className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">Código</a>
          <Link href="/login" className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900">
            Iniciar sesión
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 text-center sm:px-6 sm:pt-16">
          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">Proyecto de portafolio · demo en vivo</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            CRM y punto de venta para droguerías
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
            Vende con control de lotes por vencimiento, cuadra la caja y haz seguimiento a los pacientes crónicos,
            en una app web pensada para droguerías en Colombia.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login?demo=cajero"
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Probar la demo <ArrowRight size={18} aria-hidden />
            </Link>
            <a href={REPO_URL} className="rounded-lg px-6 py-3 font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900">
              Ver el código en GitHub
            </a>
          </div>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">Sin registro · entra como cajero con un recorrido guiado de 2 minutos</p>

          <div className="mt-12 overflow-hidden rounded-xl border border-neutral-200 shadow-2xl dark:border-neutral-800">
            <Image
              src={dashboardShot}
              alt="Dashboard con ingresos, gastos y utilidad comparados con el periodo anterior"
              priority
              placeholder="blur"
              sizes="(min-width: 1152px) 1104px, 100vw"
              className="h-auto w-full"
            />
          </div>
        </section>

        <section className="bg-neutral-50 py-16 dark:bg-neutral-950" aria-labelledby="problemas">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="problemas" className="text-center text-2xl font-bold sm:text-3xl">Tres problemas de toda droguería</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {PROBLEMS.map(({ icon: Icon, problem, solution }) => (
                <div key={problem} className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-black">
                  <Icon className="text-indigo-600 dark:text-indigo-400" size={24} aria-hidden />
                  <h3 className="mt-4 font-bold">{problem}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{solution}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="pantallas">
          <h2 id="pantallas" className="sr-only">Pantallas</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {SCREENS.map((s) => (
              <figure key={s.caption}>
                <div className="overflow-hidden rounded-xl border border-neutral-200 shadow-lg dark:border-neutral-800">
                  <Image src={s.src} alt={s.alt} placeholder="blur" sizes="(min-width: 768px) 50vw, 100vw" className="h-auto w-full" />
                </div>
                <figcaption className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{s.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="border-y border-neutral-200 py-16 dark:border-neutral-800" aria-labelledby="calidad">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-2">
            <div>
              <h2 id="calidad" className="flex items-center gap-2 text-2xl font-bold">
                <ShieldCheck className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden /> Hecha para resistir una revisión técnica
              </h2>
              <p className="mt-3 text-neutral-600 dark:text-neutral-400">
                Next.js 16, React 19, Postgres en Supabase con Prisma, Gemini desde el servidor y despliegue en Vercel.
                El README cuenta las decisiones y lo que salió mal.
              </p>
            </div>
            <ul className="space-y-3">
              {QUALITY.map((q) => (
                <li key={q} className="flex gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" size={18} aria-hidden />
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6" aria-labelledby="roles">
          <h2 id="roles" className="text-2xl font-bold">Elige con qué rol entrar</h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">Datos ficticios que se restauran cada noche: puedes vender, registrar pacientes y desordenar lo que quieras.</p>
          <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map((a) => (
              <Link
                key={a.email}
                href={`/login?demo=${a.role}`}
                className="rounded-xl border border-neutral-200 p-5 text-left hover:border-indigo-500 dark:border-neutral-800"
              >
                <span className="font-bold">{a.label}</span>
                <span className="mt-1 block text-sm text-neutral-600 dark:text-neutral-400">{a.description}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 py-6 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
        FarmaAI · demo de portafolio con datos ficticios · <a href={REPO_URL} className="underline underline-offset-2">código fuente</a>
      </footer>
    </div>
  );
}

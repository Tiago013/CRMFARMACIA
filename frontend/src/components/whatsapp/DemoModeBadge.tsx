// Etiqueta visible en todo lo que simula WhatsApp en la demo pública
export function DemoModeBadge({ label = 'Modo demo · no se envía nada' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
      {label}
    </span>
  );
}

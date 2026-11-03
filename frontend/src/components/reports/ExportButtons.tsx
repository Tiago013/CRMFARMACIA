'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportDocument } from '@/lib/reports/table';

// Botones "Excel" y "PDF" para cualquier reporte. `document` se arma al hacer
// clic, así el reporte sale con los datos que hay en pantalla en ese momento.
export function ExportButtons({ document, disabled, size = 'md' }: {
  document: () => ReportDocument | Promise<ReportDocument>;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const [busy, setBusy] = useState<'excel' | 'pdf' | null>(null);

  const run = async (kind: 'excel' | 'pdf') => {
    setBusy(kind);
    try {
      const doc = await document();
      if (!doc.tables.some((t) => t.rows.length) && !doc.summary?.length) {
        toast.info('No hay datos para exportar');
        return;
      }
      const { exportExcel, exportPdf } = await import('@/lib/reports/export');
      await (kind === 'excel' ? exportExcel(doc) : exportPdf(doc));
    } catch (e) {
      console.error(e);
      toast.error('No se pudo generar el archivo');
    } finally {
      setBusy(null);
    }
  };

  const base = size === 'sm'
    ? 'flex-1 py-1.5 px-2 text-xs font-bold rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5'
    : 'px-3 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2';

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); run('excel'); }}
        disabled={disabled || busy !== null}
        className={`${base} bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400`}
      >
        <FileSpreadsheet size={size === 'sm' ? 13 : 16} /> {busy === 'excel' ? 'Generando…' : 'Excel'}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); run('pdf'); }}
        disabled={disabled || busy !== null}
        className={`${base} bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400`}
      >
        <FileText size={size === 'sm' ? 13 : 16} /> {busy === 'pdf' ? 'Generando…' : 'PDF'}
      </button>
    </>
  );
}

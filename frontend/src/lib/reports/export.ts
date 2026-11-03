// Descarga de reportes en Excel (.xlsx) y PDF desde el navegador. Las librerías
// se cargan solo al exportar, para no pesar en la carga de la página.
import { cellValue, formatCell, safeFilename, sheetNames, type ReportDocument } from './table';

const generatedAt = () => new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

export async function exportExcel(doc: ReportDocument): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');

  const sheets = [];
  if (doc.summary?.length) {
    sheets.push({
      title: 'Resumen',
      data: [
        [{ value: doc.title, fontWeight: 'bold' as const, fontSize: 14 }],
        ...(doc.subtitle ? [[{ value: doc.subtitle }]] : []),
        [{ value: `Generado: ${generatedAt()}`, textColor: '#666666' }],
        [],
        ...doc.summary.map(([label, value]) => [{ value: label, fontWeight: 'bold' as const }, { value }]),
      ],
      columns: [{ width: 34 }, { width: 24 }],
    });
  }
  for (const table of doc.tables) {
    sheets.push({
      title: table.title ?? doc.title,
      data: [
        table.columns.map((c) => ({ value: c.header, fontWeight: 'bold' as const, backgroundColor: '#EEF2FF', bottomBorderStyle: 'thin' as const })),
        ...table.rows.map((row) =>
          table.columns.map((c) => {
            const v = cellValue(row, c.key);
            if (typeof v === 'number') return { value: v, type: Number, format: c.format === 'money' ? '"$"#,##0' : '#,##0.##' };
            return { value: v === null || v === undefined ? '' : formatCell(v, c.format), type: String };
          })
        ),
      ],
      columns: table.columns.map((c) => ({ width: Math.min(40, Math.max(12, c.header.length + 4)) })),
      stickyRowsCount: 1,
    });
  }

  const names = sheetNames(sheets.map((s) => s.title));
  await writeXlsxFile(
    sheets.map((s, i) => ({ data: s.data, sheet: names[i], columns: s.columns, stickyRowsCount: 'stickyRowsCount' in s ? s.stickyRowsCount : undefined })),
  ).toFile(`${safeFilename(doc.filename)}.xlsx`);
}

export async function exportPdf(doc: ReportDocument): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);

  const wide = doc.tables.some((t) => t.columns.length > 6);
  const pdf = new jsPDF({ orientation: wide ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(doc.title, margin, y);
  y += 18;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  if (doc.subtitle) { pdf.text(doc.subtitle, margin, y); y += 13; }
  pdf.text(`Generado: ${generatedAt()}`, margin, y);
  pdf.setTextColor(0);
  y += 16;

  const lastY = () => (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  if (doc.summary?.length) {
    autoTable(pdf, {
      startY: y,
      body: doc.summary,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 200 }, 1: { halign: 'right' } },
      tableWidth: 360,
      margin: { left: margin },
    });
    y = lastY() + 18;
  }

  for (const table of doc.tables) {
    if (table.title) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(table.title, margin, y);
      y += 6;
    }
    const isNumeric = (format: string) => format === 'money' || format === 'number';
    const numeric = Object.fromEntries(
      table.columns.map((c, i) => [i, isNumeric(c.format) ? { halign: 'right' as const } : {}]),
    );
    autoTable(pdf, {
      startY: y,
      // columnStyles solo alinea el cuerpo: el encabezado se alinea celda por celda
      head: [table.columns.map((c) => ({ content: c.header, styles: { halign: isNumeric(c.format) ? 'right' as const : 'left' as const } }))],
      body: table.rows.map((row) => table.columns.map((c) => formatCell(cellValue(row, c.key), c.format))),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 4 },
      columnStyles: numeric,
      margin: { left: margin, right: margin },
    });
    y = lastY() + 22;
  }

  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(8);
    pdf.setTextColor(140);
    pdf.text(`FarmaAI · ${doc.title} · página ${p} de ${pages}`, margin, pdf.internal.pageSize.getHeight() - 20);
  }

  pdf.save(`${safeFilename(doc.filename)}.pdf`);
}

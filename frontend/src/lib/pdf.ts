/** Render a DOM element to a single-page A4 PDF in the browser. */
export async function elementToPdf(el: HTMLElement) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = pdf.internal.pageSize.getWidth();
  const h = Math.min((canvas.height * w) / canvas.width, pdf.internal.pageSize.getHeight());
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
  return pdf;
}

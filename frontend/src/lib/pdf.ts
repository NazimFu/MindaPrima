/** Render a DOM element (an A4 sheet, 794 x 1123 px) to an A4 PDF in the browser. Taller content continues on extra pages. */
export async function elementToPdf(el: HTMLElement) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: el.scrollWidth, scrollX: 0, scrollY: -window.scrollY,
    onclone: (doc) => { doc.querySelectorAll<HTMLElement>('[data-pdf-only]').forEach((n) => { n.style.display = 'block'; }); } });
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const pagePx = Math.round((canvas.width * ph) / pw);
  for (let y = 0, page = 0; y < canvas.height; y += pagePx, page++) {
    const h = Math.min(pagePx, canvas.height - y);
    const slice = document.createElement('canvas');
    slice.width = canvas.width; slice.height = pagePx;
    const ctx = slice.getContext('2d');
    if (!ctx) throw new Error('Could not make the PDF');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (page > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, pw, ph);
  }
  return pdf;
}

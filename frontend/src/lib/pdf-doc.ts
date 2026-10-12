import type { jsPDF } from 'jspdf';
import type { CellHookData } from 'jspdf-autotable';
import { formatRM, monthLabel, type InvoiceDto, type ReceiptDto } from '@minda/common';
import logo from '../../../common/images/MP-LOGO.png';
import type { Centre } from '@/hooks/use-centre';

/**
 * Invoice and receipt PDFs are drawn directly (real text, embedded IBM Plex fonts, A4 portrait), not screenshotted,
 * so they look the same on every computer and browser.
 */
const GREEN: [number, number, number] = [20, 56, 42];
const MUTED: [number, number, number] = [102, 107, 102];
const INK: [number, number, number] = [28, 31, 29];
const LINE: [number, number, number] = [226, 226, 218];
const HEAD_BG: [number, number, number] = [234, 241, 235];
const W = 210;
const M = 16;
const R = W - M;
const LOGO_H = 12;

const longDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

async function fontData(url: string): Promise<string> {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function logoImage(): Promise<{ data: string; w: number; h: number }> {
  const blob = await (await fetch(logo.src)).blob();
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, 320 / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height);
  return { data: c.toDataURL('image/png'), w: c.width, h: c.height };
}

async function start(): Promise<{ pdf: jsPDF; autoTable: typeof import('jspdf-autotable').default; logo: Awaited<ReturnType<typeof logoImage>> }> {
  const [{ jsPDF: PDF }, { default: autoTable }, regular, semi, mono, lg] = await Promise.all([
    import('jspdf'), import('jspdf-autotable'),
    fontData('/fonts/PlexSans-Regular.ttf'), fontData('/fonts/PlexSans-SemiBold.ttf'), fontData('/fonts/PlexMono-Regular.ttf'), logoImage(),
  ]);
  const pdf = new PDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  pdf.addFileToVFS('PlexSans-Regular.ttf', regular); pdf.addFont('PlexSans-Regular.ttf', 'Plex', 'normal');
  pdf.addFileToVFS('PlexSans-SemiBold.ttf', semi); pdf.addFont('PlexSans-SemiBold.ttf', 'Plex', 'bold');
  pdf.addFileToVFS('PlexMono-Regular.ttf', mono); pdf.addFont('PlexMono-Regular.ttf', 'PlexMono', 'normal');
  pdf.setFont('Plex', 'normal');
  return { pdf, autoTable, logo: lg };
}

type Ctx = Awaited<ReturnType<typeof start>>;

function header(c: Ctx, centre: Centre, title: string, meta: [string, string, boolean?][], subtitle?: string): number {
  const { pdf } = c;
  pdf.setFillColor(...GREEN); pdf.rect(0, 0, W, 2, 'F');
  const lh = LOGO_H, lw = (c.logo.w / c.logo.h) * lh;
  pdf.addImage(c.logo.data, 'PNG', M, 12, lw, lh);
  const tx = M + lw + 4;
  pdf.setFont('Plex', 'bold'); pdf.setFontSize(13); pdf.setTextColor(...GREEN);
  pdf.text(centre.name, tx, 17.5);
  pdf.setFont('Plex', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...MUTED);
  let y = 22.5;
  for (const l of [...centre.addressLines, centre.phone].filter(Boolean)) { pdf.text(l, tx, y); y += 4; }

  pdf.setFont('Plex', 'bold'); pdf.setFontSize(17); pdf.setTextColor(...INK);
  pdf.text(title, R, 17.5, { align: 'right' });
  let my = 22.5;
  if (subtitle) { pdf.setFont('Plex', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...MUTED); pdf.text(subtitle, R, my, { align: 'right' }); my += 5; }
  for (const [k, v, mono] of meta) {
    pdf.setFontSize(9);
    pdf.setFont(mono ? 'PlexMono' : 'Plex', 'normal'); pdf.setTextColor(...INK);
    const vw = pdf.getTextWidth(v);
    pdf.text(v, R, my, { align: 'right' });
    pdf.setFont('Plex', 'normal'); pdf.setTextColor(...MUTED);
    pdf.text(k, R - vw - 2, my, { align: 'right' });
    my += 4.2;
  }
  return Math.max(y, my) + 6;
}

function party(pdf: jsPDF, label: string, name: string, line: string, y: number): number {
  pdf.setFont('Plex', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...MUTED); pdf.text(label, M, y);
  pdf.setFont('Plex', 'bold'); pdf.setFontSize(11); pdf.setTextColor(...INK); pdf.text(name, M, y + 5.5);
  pdf.setFont('Plex', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...MUTED);
  const lines = pdf.splitTextToSize(line, 110) as string[];
  pdf.text(lines, M, y + 10.5);
  return y + 10.5 + lines.length * 4 + 4;
}

type Table = { head: string[]; body: (string | number)[][]; right: number[]; widths?: Record<number, number> };
function table(c: Ctx, y: number, t: Table): number {
  const columnStyles: Record<number, object> = {};
  t.right.forEach((i) => { columnStyles[i] = { halign: 'right' }; });
  Object.entries(t.widths ?? {}).forEach(([i, w]) => { columnStyles[Number(i)] = { ...(columnStyles[Number(i)] ?? {}), cellWidth: w }; });
  c.autoTable(c.pdf, {
    startY: y, head: [t.head], body: t.body, margin: { left: M, right: M, bottom: 18 }, theme: 'plain',
    styles: { font: 'Plex', fontSize: 9, cellPadding: { top: 2.6, bottom: 2.6, left: 2, right: 2 }, textColor: INK, lineColor: LINE, lineWidth: 0 },
    headStyles: { fillColor: HEAD_BG, textColor: GREEN, fontStyle: 'normal', fontSize: 8.5 },
    didParseCell: (d: CellHookData) => { if (d.section === 'body' && d.column.index === 0) d.cell.styles.fontStyle = 'bold'; if (d.section === 'body' && d.column.index === 2 && t.head[2] === 'Subjects') d.cell.styles.textColor = MUTED; },
    didDrawCell: (d: CellHookData) => {
      const { pdf } = c;
      pdf.setDrawColor(...(d.section === 'head' ? GREEN : LINE)); pdf.setLineWidth(d.section === 'head' ? 0.3 : 0.15);
      pdf.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
    },
    columnStyles,
  });
  return ((c.pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 9;
}

function totals(pdf: jsPDF, y: number, rows: [string, string][], grand: [string, string], after: [string, string][] = [], width = 74): number {
  if (y > 297 - 50) { pdf.addPage('a4', 'portrait'); y = 20; }
  const x0 = R - width;
  pdf.setFontSize(9);
  for (const [k, v] of rows) {
    pdf.setFont('Plex', 'normal'); pdf.setTextColor(...MUTED); pdf.text(k, x0, y);
    pdf.setTextColor(...INK); pdf.text(v, R, y, { align: 'right' }); y += 5.2;
  }
  pdf.setDrawColor(...GREEN); pdf.setLineWidth(0.5); pdf.line(x0, y - 2.6, R, y - 2.6);
  y += 2.4;
  pdf.setFont('Plex', 'bold'); pdf.setFontSize(11.5); pdf.setTextColor(...GREEN);
  pdf.text(grand[0], x0, y); pdf.text(grand[1], R, y, { align: 'right' });
  y += 6;
  pdf.setFont('Plex', 'normal'); pdf.setFontSize(9);
  for (const [k, v] of after) {
    pdf.setTextColor(...MUTED); pdf.text(k, x0, y); pdf.setTextColor(...INK); pdf.text(v, R, y, { align: 'right' }); y += 5.2;
  }
  return y;
}

function footer(pdf: jsPDF, centre: Centre) {
  const n = pdf.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    pdf.setPage(i); pdf.setFont('Plex', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...MUTED);
    pdf.text(`${centre.name}${n > 1 ? `   Page ${i} of ${n}` : ''}`, W / 2, 291, { align: 'center' });
  }
}

export async function invoicePdf(inv: InvoiceDto, centre: Centre): Promise<jsPDF> {
  const c = await start();
  const { pdf } = c;
  let y = header(c, centre, 'Invoice', [['No.', inv.number, true], ['Date', longDate(inv.createdAt)]], monthLabel(inv.month));
  y = party(pdf, 'Billed to', inv.guardian.name, [inv.guardian.address, inv.guardian.contact].filter(Boolean).join(' · '), y + 2);
  y = table(c, y + 2, { head: ['Student', 'Level', 'Subjects', 'Amount'], right: [3], widths: { 1: 26, 3: 28 }, body: inv.lines.map((l) => [l.studentName, l.levelName, l.description, formatRM(l.amount)]) });
  if (inv.extras.length > 0) {
    pdf.setFont('Plex', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(...INK); pdf.text('Extra fees and discounts', M, y);
    y = table(c, y + 2, { head: ['Item', 'Details', 'Type', 'Amount'], right: [3], widths: { 2: 26, 3: 28 }, body: inv.extras.map((e) => [e.label, e.detail, e.kind, `${e.kind === 'Discount' ? '−' : ''}${formatRM(e.amount)}`]) });
  }
  const lineTotal = inv.lines.reduce((a, l) => a + l.amount, 0);
  const add = inv.extras.filter((e) => e.kind === 'Addition').reduce((a, e) => a + e.amount, 0);
  const dis = inv.extras.filter((e) => e.kind === 'Discount').reduce((a, e) => a + e.amount, 0);
  const rows: [string, string][] = [['Tuition and transport', formatRM(lineTotal)]];
  if (add > 0) rows.push(['Extra fees', formatRM(add)]);
  if (dis > 0) rows.push(['Discounts', `−${formatRM(dis)}`]);
  const after: [string, string][] = inv.paid > 0 ? [['Paid', formatRM(inv.paid)], ['Balance', formatRM(inv.balance)]] : [];
  totals(pdf, y, rows, ['Total due', formatRM(inv.total)], after);
  footer(pdf, centre);
  return pdf;
}

export async function receiptPdf(r: ReceiptDto, centre: Centre): Promise<jsPDF> {
  const c = await start();
  const { pdf } = c;
  let y = header(c, centre, 'Receipt', [['No.', r.payment.receiptNumber, true], ['Date', longDate(r.payment.date)], ['For invoice', r.invoice.number, true]]);
  y = party(pdf, 'Received from', r.invoice.guardian.name, [r.invoice.guardian.address, r.invoice.guardian.contact].filter(Boolean).join(' · '), y + 2);
  const state = r.balance <= 0 ? 'Paid' : 'Part paid';
  pdf.setFont('Plex', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...MUTED); pdf.text('Invoice status', R, y - 22, { align: 'right' });
  pdf.setFont('Plex', 'bold'); pdf.setFontSize(10); pdf.setTextColor(...(r.balance <= 0 ? [31, 107, 63] as [number, number, number] : [128, 83, 10] as [number, number, number])); pdf.text(state, R, y - 17, { align: 'right' });
  y = table(c, y + 2, { head: ['Date', 'Method', 'Students', 'Amount'], right: [3], widths: { 0: 28, 1: 30, 3: 28 }, body: [[r.payment.date, r.payment.method, [...new Set(r.invoice.lines.map((l) => l.studentName))].join(', '), formatRM(r.payment.amount)]] });
  y = totals(pdf, y, [['Invoice total', formatRM(r.invoice.total)], ['Received to date', formatRM(r.received)]], ['Balance due', formatRM(Math.max(0, r.balance))], [], 80);
  pdf.setDrawColor(...LINE); pdf.setLineWidth(0.15); pdf.line(M, y + 4, R, y + 4);
  pdf.setFont('Plex', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...MUTED);
  pdf.text('Thank you. This receipt confirms the payment above. The invoice stays open until the balance is paid.', M, y + 9);
  footer(pdf, centre);
  return pdf;
}

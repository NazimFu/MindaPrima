'use client';
import Image from 'next/image';
import logo from '../../../common/images/MP-LOGO.png';
import type { Centre } from '@/hooks/use-centre';

/** A4 at 96 dpi. The sheet is always this size so the screen and the PDF match. */
export const A4_W = 794;
export const A4_H = 1123;

/** The sheet used for invoices and receipts: white page, green top rule, centre details left, document details right. */
export function DocSheet({ centre, title, meta, children, sheetRef }: { centre: Centre; title: string; meta: React.ReactNode; children: React.ReactNode; sheetRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div className="mx-auto max-w-full overflow-x-auto" style={{ width: A4_W }}>
    <div ref={sheetRef} className="flex flex-col gap-7 border border-[#E2E2DA] border-t-[6px] border-t-[#14382A] bg-white px-14 pb-12 pt-11 text-[#1C1F1D]" style={{ width: A4_W, minHeight: A4_H, boxSizing: 'border-box', fontVariantNumeric: 'normal' }}>
      <div className="flex justify-between gap-5">
        <div className="flex gap-3.5">
          <Image src={logo} alt="" width={40} height={40} className="shrink-0 object-contain" style={{ width: 40, height: 40 }} />
          <div>
            <div className="text-[18px] font-semibold text-[#14382A]">{centre.name}</div>
            <div className="text-[#666B66]">
              {centre.addressLines.map((l) => <div key={l}>{l}</div>)}
              {centre.phone && <div>{centre.phone}</div>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-semibold">{title}</div>
          {meta}
        </div>
      </div>
      {children}
    </div>
    </div>
  );
}

export const DocTh = ({ children, right }: { children?: React.ReactNode; right?: boolean }) => (
  <th className={`border-b border-[#14382A] bg-[#EAF1EB] px-2 py-2 text-[12px] font-medium text-[#14382A] ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
export const docTd = 'border-b border-[#E2E2DA] px-2 py-2.5';

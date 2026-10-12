'use client';
import Image from 'next/image';
import logo from '../../../common/images/MP-LOGO.png';
import type { Centre } from '@/hooks/use-centre';

/** The sheet used for invoices and receipts: white page, green top rule, centre details left, document details right. */
export function DocSheet({ centre, title, meta, children, sheetRef }: { centre: Centre; title: string; meta: React.ReactNode; children: React.ReactNode; sheetRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={sheetRef} className="mx-auto flex w-full max-w-[820px] flex-col gap-7 border border-[#E2E2DA] border-t-[6px] border-t-[#14382A] bg-white px-14 pb-12 pt-11 text-[#1C1F1D]">
      <div className="flex flex-wrap justify-between gap-5">
        <div className="flex gap-3.5">
          <Image src={logo} alt="" width={56} height={56} className="object-contain" />
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
  );
}

export const DocTh = ({ children, right }: { children?: React.ReactNode; right?: boolean }) => (
  <th className={`border-b border-[#14382A] bg-[#EAF1EB] px-2 py-2 text-[12px] font-medium text-[#14382A] ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
export const docTd = 'border-b border-[#E2E2DA] px-2 py-2.5';

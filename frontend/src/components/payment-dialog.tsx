'use client';
import { useState } from 'react';
import { PAYMENT_METHODS, formatRM, type PaymentDto, type PaymentMethod } from '@minda/common';
import { post } from '@/lib/api';
import { clientToday } from '@/lib/today';
import { Dialog, ErrorNote, Field } from './ui';

export function PaymentDialog({ invoiceId, number, balance, onClose, onSaved }: { invoiceId: string; number: string; balance: number; onClose: () => void; onSaved: (p: PaymentDto) => void }) {
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : '');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [date, setDate] = useState(clientToday());
  const [error, setError] = useState('');
  async function save() {
    try { onSaved(await post<PaymentDto>('/billing/payments', { invoiceId, amount: Number(amount), method, date })); } catch (e) { setError((e as Error).message); }
  }
  return (
    <Dialog title="Record payment" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-pr" onClick={save}>Save</button></>}>
      <div className="space-y-3 p-6">
        <div className="text-mu">Invoice <span className="font-mono">{number}</span>, balance <span className="font-mono">{formatRM(balance)}</span></div>
        <ErrorNote message={error} />
        <Field label="Amount (RM)"><input className="inp font-mono" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Method"><select className="inp" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
        <Field label="Date"><input type="date" className="inp" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
    </Dialog>
  );
}

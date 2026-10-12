'use client';
import { useState } from 'react';
import { post, put } from '@/lib/api';
import { Dialog, ErrorNote, Field } from './ui';

export function GuardianDialog({ guardian, address: addr = '', onClose, onSaved }: { guardian?: { id: string; name: string; contact: string }; address?: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(guardian?.name ?? '');
  const [contact, setContact] = useState(guardian?.contact ?? '');
  const [address, setAddress] = useState(addr);
  const [error, setError] = useState('');
  async function save() {
    try {
      const body = { name, contact, address };
      if (guardian) await put(`/guardians/${guardian.id}`, body); else await post('/guardians', body);
      onSaved();
    } catch (e) { setError((e as Error).message); }
  }
  return (
    <Dialog title={guardian ? 'Edit guardian' : 'Add guardian'} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-pr" onClick={save}>Save</button></>}>
      <div className="space-y-3 p-6">
        <ErrorNote message={error} />
        <Field label="Name"><input className="inp" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Contact"><input className="inp" value={contact} maxLength={20} inputMode="tel" onChange={(e) => setContact(e.target.value)} /></Field>
        <Field label="Address"><input className="inp" value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} /></Field>
      </div>
    </Dialog>
  );
}

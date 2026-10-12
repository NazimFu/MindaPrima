'use client';
import { useState } from 'react';
import { ROLES, type AuditEntry, type Role, type User } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { patch, post } from '@/lib/api';
import { useSession } from '@/components/session';
import { Card, Dialog, Empty, ErrorNote, Field, Loading, PageHeader, Table } from '@/components/ui';

type UserRow = Omit<User, 'passwordHash' | 'failedLogins' | 'lockedUntil'>;

export default function UsersPage() {
  const { user, ref } = useSession();
  const users = useApi<UserRow[]>('/users');
  const audit = useApi<AuditEntry[]>('/audit');
  const [add, setAdd] = useState(false);
  const [err, setErr] = useState('');
  async function toggle(u: UserRow) {
    try { await patch(`/users/${u.id}/active`, { active: !u.active }); users.reload(); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <div className="space-y-4">
      <PageHeader title="Users" actions={<button type="button" className="btn btn-pr" onClick={() => setAdd(true)}>Add user</button>} />
      <ErrorNote message={err || users.error} />
      <Card>
        {users.loading && !users.data ? <Loading /> : !users.data?.length ? <Empty>No users</Empty> : (
          <Table head={['Name', 'Email', 'Role', 'Vehicle', 'Active', '']}>
            {users.data.map((u) => (
              <tr key={u.id}>
                <td className="td">{u.name}</td><td className="td">{u.email}</td><td className="td">{u.role}</td>
                <td className="td">{ref.vehicles.find((v) => v.id === u.vehicleId)?.plate ?? ''}</td>
                <td className="td">{u.active ? 'Yes' : 'No'}</td>
                <td className="td text-right">{u.id !== user.id && <button type="button" className="btn" onClick={() => toggle(u)}>{u.active ? 'Disable' : 'Enable'}</button>}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card title="Audit log">
        {!audit.data?.length ? <Empty>No entries</Empty> : (
          <Table head={['When', 'Action', 'Entity', 'Detail']} min={560}>
            {audit.data.slice(0, 50).map((a) => (
              <tr key={a.id}><td className="td">{a.at.replace('T', ' ').slice(0, 19)}</td><td className="td">{a.action}</td><td className="td">{a.entity}</td><td className="td">{a.detail}</td></tr>
            ))}
          </Table>
        )}
      </Card>
      {add && <UserDialog onClose={() => setAdd(false)} onSaved={() => { setAdd(false); users.reload(); }} />}
    </div>
  );
}

function UserDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { ref } = useSession();
  const [f, setF] = useState({ name: '', email: '', role: 'staff' as Role, password: '', vehicleId: '' });
  const [error, setError] = useState('');
  async function save() {
    try { await post('/users', { ...f, vehicleId: f.role === 'driver' ? f.vehicleId : '' }); onSaved(); } catch (e) { setError((e as Error).message); }
  }
  return (
    <Dialog title="Add user" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-pr" onClick={save}>Save</button></>}>
      <div className="space-y-3 p-6">
        <ErrorNote message={error} />
        <Field label="Name"><input className="inp" value={f.name} maxLength={100} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Email"><input className="inp" type="email" autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Role"><select className="inp" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
        {f.role === 'driver' && <Field label="Vehicle"><select className="inp" value={f.vehicleId} onChange={(e) => setF({ ...f, vehicleId: e.target.value })}><option value="">Choose</option>{ref.vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}</select></Field>}
        <Field label="Password (10 characters or more)"><input className="inp" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      </div>
    </Dialog>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { API_PREFIX, type WaTemplate } from '@minda/common';
import { CrudCard } from '@/components/crud-card';
import { Card, KV, PageHeader } from '@/components/ui';

interface WaState { status: string; qrDataUrl: string | null; info: string; phoneNumber: string | null }

export default function WhatsAppPage() {
  const [state, setState] = useState<WaState | null>(null);
  useEffect(() => {
    const es = new EventSource(`${API_PREFIX}/whatsapp/stream`, { withCredentials: true });
    es.onmessage = (e) => { try { setState(JSON.parse(e.data) as WaState); } catch { /* ignore malformed event */ } };
    return () => es.close();
  }, []);
  return (
    <div className="space-y-4">
      <PageHeader title="WhatsApp" />
      <Card title="Connection">
        {!state ? <div className="p-4 text-mu">Connecting</div> : (
          <>
            <KV rows={[['Status', state.status], ['Info', state.info], ['Number', state.phoneNumber ?? '']]} />
            {state.qrDataUrl && (
              <div className="border-t border-ln p-4">
                <p className="mb-2 text-mu">Scan with WhatsApp, Linked devices.</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={state.qrDataUrl} alt="WhatsApp QR code" width={240} height={240} />
              </div>
            )}
          </>
        )}
      </Card>
      <CrudCard<WaTemplate> title="Message templates" path="/whatsapp/templates" noun="template" head={['Name', 'Message']}
        cells={(t) => [t.name, <span key="b" className="line-clamp-2 whitespace-pre-wrap">{t.body}</span>]}
        fields={[{ key: 'name', label: 'Name', max: 60 }, { key: 'body', label: 'Message', type: 'textarea', max: 1000 }]}
        blank={{ name: '', body: '' }} toForm={(t) => ({ name: t.name, body: t.body })} toBody={(f) => ({ name: f.name, body: f.body })} />
    </div>
  );
}

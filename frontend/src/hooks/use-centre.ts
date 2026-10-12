'use client';
import { useApi } from './use-api';

export interface Centre { name: string; addressLines: string[]; phone: string; tagline: string }

/** Centre details for invoices and receipts. They live in the Settings tab and are edited under Settings, Pricing. */
export function useCentre(): Centre {
  const { data } = useApi<{ key: string; value: string }[]>('/settings');
  const get = (k: string) => data?.find((r) => r.key === k)?.value ?? '';
  return {
    name: get('centre.name') || 'Minda Prima',
    addressLines: get('centre.address').split('|').map((x) => x.trim()).filter(Boolean),
    phone: get('centre.phone'),
    tagline: get('centre.tagline'),
  };
}

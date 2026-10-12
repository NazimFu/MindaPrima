'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface ApiState<T> { data: T | undefined; error: string; loading: boolean; reload: () => void }

/** GET a path (pass null to skip). Reloads when the path changes. */
export function useApi<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(path !== null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (path === null) { setLoading(false); return; }
    let live = true;
    setLoading(true);
    api<T>(path)
      .then((d) => { if (live) { setData(d); setError(''); } })
      .catch((e: Error) => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [path, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, loading, reload };
}

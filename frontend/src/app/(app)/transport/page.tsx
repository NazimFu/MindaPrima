'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/components/session';
import { Empty, PageHeader } from '@/components/ui';

export default function TransportIndex() {
  const { ref } = useSession();
  const router = useRouter();
  const first = ref.vehicles[0]?.id;
  useEffect(() => { if (first) router.replace(`/transport/${first}`); }, [first, router]);
  if (first) return null;
  return <div className="space-y-4"><PageHeader title="Transport" /><Empty>No vehicles. Add one under Settings, Pricing.</Empty></div>;
}

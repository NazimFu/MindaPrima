"use client";

import * as React from 'react';
import Link from 'next/link';
import { getPrices } from '@/app/actions';
import { PriceManagement } from '@/components/dashboard/price-management';
import type { Prices } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export default function PricesPage() {
  const [prices, setPrices] = React.useState<Prices | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadPrices() {
      const pricesData = await getPrices();
      setPrices(pricesData);
      setLoading(false);
    }
    loadPrices();
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-xl">
        <div className="flex h-16 items-center gap-4 px-6">
          <Logo />
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold)/0.4)] to-transparent" />
      </header>

      <main className="px-6 py-6 max-w-screen-lg mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] -ml-2"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Dashboard
            </Link>
          </Button>
          <span className="text-[hsl(var(--border))]">/</span>
          <span className="text-sm text-[hsl(var(--foreground))]">Price Settings</span>
        </div>

        <div className="mb-6">
          <h1
            className="text-2xl text-[hsl(var(--foreground))]"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Price Management
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Configure tuition rates by level and transport fees.
          </p>
        </div>

        {loading || !prices ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--gold))] border-t-transparent animate-spin" />
            <p className="text-xs text-[hsl(var(--muted-foreground))] tracking-widest uppercase">Loading prices</p>
          </div>
        ) : (
          <PriceManagement initialPrices={prices} />
        )}
      </main>
    </div>
  );
}
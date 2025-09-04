
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
        <div className="flex h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 py-4">
                <Logo />
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
                <div className="mb-4 mt-4 flex items-center gap-4">
                     <Button variant="outline" size="icon" asChild>
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-xl font-semibold tracking-tight">Price Management</h1>
                </div>
                {loading || !prices ? (
                    <div className="flex items-center justify-center h-64">Loading prices...</div>
                ) : (
                    <PriceManagement initialPrices={prices} />
                )}
            </main>
        </div>
    );
}

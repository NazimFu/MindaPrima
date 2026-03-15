"use client";

import * as React from 'react';
import type { Prices, StudentLevel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePrices } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Save, PlusCircle, Trash2, Bus, GraduationCap } from 'lucide-react';

type PriceManagementProps = {
  initialPrices: Prices;
};

const studentLevels: StudentLevel[] = [
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 4', 'Secondary 5', 'Secondary 6',
];

const primaryLevels = studentLevels.filter(l => l.includes('Primary'));
const secondaryLevels = studentLevels.filter(l => l.includes('Secondary'));

export function PriceManagement({ initialPrices }: PriceManagementProps) {
  const [prices, setPrices] = React.useState<Prices>(initialPrices);
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();

  const handlePriceChange = (level: StudentLevel, numSubjects: string, value: string) => {
    const newPrices = { ...prices };
    if (!newPrices[level]) newPrices[level] = {};
    newPrices[level]![numSubjects] = parseFloat(value) || 0;
    setPrices(newPrices);
  };

  const handleTransportChange = (key: 'transportInbound' | 'transportOutbound', value: string) => {
    setPrices({ ...prices, [key]: parseFloat(value) || 0 });
  };

  const handleSave = async () => {
    startTransition(async () => {
      await updatePrices(prices);
      toast({ title: 'Saved', description: 'Prices updated successfully.' });
    });
  };

  const handleAddSubject = (level: StudentLevel) => {
    const newPrices = { ...prices };
    if (!newPrices[level]) newPrices[level] = {};
    const existing = Object.keys(newPrices[level]!).map(Number);
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    newPrices[level]![next.toString()] = 0;
    setPrices(newPrices);
  };

  const handleRemoveSubject = (level: StudentLevel, numSubjects: string) => {
    const newPrices = { ...prices };
    if (newPrices[level]) {
      delete newPrices[level]![numSubjects];
      setPrices(newPrices);
    }
  };

  function LevelGrid({ levels, title }: { levels: StudentLevel[]; title: string }) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-4 h-4 text-[hsl(var(--gold))]" />
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] uppercase tracking-[0.08em]">{title}</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {levels.map(level => (
            <div
              key={level}
              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-[0.08em]">
                  {level}
                </p>
                <button
                  onClick={() => handleAddSubject(level)}
                  className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] flex items-center gap-1 transition-colors"
                >
                  <PlusCircle className="w-3 h-3" />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {prices[level] && Object.keys(prices[level]!).sort((a, b) => Number(a) - Number(b)).map(num => (
                  <div key={num} className="flex items-center gap-2">
                    <span className="text-xs text-[hsl(var(--muted-foreground))] w-20 flex-shrink-0">
                      {num} subject{Number(num) > 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center flex-1 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg overflow-hidden focus-within:border-[hsl(var(--gold)/0.5)]">
                      <span className="px-2 text-xs text-[hsl(var(--muted-foreground))] border-r border-[hsl(var(--border))]">RM</span>
                      <Input
                        type="number"
                        value={prices[level]?.[num] || ''}
                        onChange={(e) => handlePriceChange(level, num, e.target.value)}
                        className="h-7 border-0 bg-transparent text-xs text-right focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveSubject(level, num)}
                      className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {(!prices[level] || Object.keys(prices[level]!).length === 0) && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] italic py-1">No rates set yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Tuition fees */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div className="mb-6">
          <h2 className="font-medium text-[hsl(var(--foreground))]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Tuition Fees
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Monthly rates by education level and number of subjects enrolled.
          </p>
        </div>
        <div className="h-px bg-[hsl(var(--border))] mb-6" />
        <LevelGrid levels={primaryLevels} title="Primary School" />
        <div className="h-px bg-[hsl(var(--border))] my-6" />
        <LevelGrid levels={secondaryLevels} title="Secondary School" />
      </div>

      {/* Transport fees */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div className="flex items-center gap-2 mb-2">
          <Bus className="w-4 h-4 text-[hsl(var(--gold))]" />
          <h2 className="font-medium text-[hsl(var(--foreground))]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Transport Fees
          </h2>
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          Monthly transport charges based on pickup zone.
        </p>
        <div className="h-px bg-[hsl(var(--border))] mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))]">
              Inside Limit (T(I))
            </Label>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">e.g., Bandar Putra area</p>
            <div className="flex items-center bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg overflow-hidden focus-within:border-[hsl(var(--gold)/0.5)]">
              <span className="px-3 text-xs text-[hsl(var(--muted-foreground))] border-r border-[hsl(var(--border))] py-2">RM</span>
              <Input
                type="number"
                value={prices.transportInbound}
                onChange={(e) => handleTransportChange('transportInbound', e.target.value)}
                className="h-9 border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))]">
              Outside Limit (T(O))
            </Label>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Beyond service boundary</p>
            <div className="flex items-center bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg overflow-hidden focus-within:border-[hsl(var(--gold)/0.5)]">
              <span className="px-3 text-xs text-[hsl(var(--muted-foreground))] border-r border-[hsl(var(--border))] py-2">RM</span>
              <Input
                type="number"
                value={prices.transportOutbound}
                onChange={(e) => handleTransportChange('transportOutbound', e.target.value)}
                className="h-9 border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold)/0.9)] text-[hsl(var(--primary-foreground))] font-medium shadow-lg shadow-[hsl(var(--gold)/0.2)] min-w-[140px]"
        >
          {isPending ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-[hsl(var(--primary-foreground)/0.3)] border-t-[hsl(var(--primary-foreground))] animate-spin mr-2" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 mr-2" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
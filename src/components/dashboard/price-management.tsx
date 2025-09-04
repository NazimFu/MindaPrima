
"use client";

import * as React from 'react';
import type { Prices, StudentLevel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePrices } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Save, PlusCircle, Trash2 } from 'lucide-react';

type PriceManagementProps = {
    initialPrices: Prices;
};

const studentLevels: StudentLevel[] = ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 5', 'Secondary 6'];

export function PriceManagement({ initialPrices }: PriceManagementProps) {
    const [prices, setPrices] = React.useState<Prices>(initialPrices);
    const [isPending, startTransition] = React.useTransition();
    const { toast } = useToast();

    const handlePriceChange = (level: StudentLevel, numSubjects: string, value: string) => {
        const newPrices = { ...prices };
        if (!newPrices[level]) {
            newPrices[level] = {};
        }
        newPrices[level]![numSubjects] = parseFloat(value) || 0;
        setPrices(newPrices);
    };

    const handleTransportPriceChange = (key: 'transportInbound' | 'transportOutbound', value: string) => {
        setPrices({ ...prices, [key]: parseFloat(value) || 0 });
    }

    const handleSaveChanges = async () => {
        startTransition(async () => {
            await updatePrices(prices);
            toast({
                title: 'Success',
                description: 'Prices have been updated successfully.',
            });
        });
    };
    
    const handleAddSubject = (level: StudentLevel) => {
        const newPrices = { ...prices };
        if (!newPrices[level]) {
            newPrices[level] = {};
        }
        const existingSubjects = Object.keys(newPrices[level]!).map(Number);
        const nextSubject = existingSubjects.length > 0 ? Math.max(...existingSubjects) + 1 : 1;
        newPrices[level]![nextSubject.toString()] = 0;
        setPrices(newPrices);
    };

    const handleRemoveSubject = (level: StudentLevel, numSubjects: string) => {
        const newPrices = { ...prices };
        if (newPrices[level] && newPrices[level]![numSubjects] !== undefined) {
            delete newPrices[level]![numSubjects];
            setPrices(newPrices);
        }
    };

    return (
        <div className="space-y-6 pb-8">
            <Card>
                <CardHeader>
                    <CardTitle>Tuition Fees</CardTitle>
                    <CardDescription>Set the monthly tuition fee based on the student's level and number of subjects.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {studentLevels.map(level => (
                        <div key={level} className="p-4 border rounded-md">
                            <h4 className="font-semibold mb-3">{level}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {prices[level] && Object.keys(prices[level]!).sort((a,b) => Number(a) - Number(b)).map(num => (
                                    <div key={num} className="space-y-1 relative">
                                        <Label htmlFor={`${level}-${num}`}>{num} Subject{Number(num) > 1 ? 's' : ''}</Label>
                                        <Input
                                            id={`${level}-${num}`}
                                            type="number"
                                            value={prices[level]?.[num] || ''}
                                            onChange={(e) => handlePriceChange(level, num, e.target.value)}
                                            className="h-8"
                                        />
                                         <Button 
                                             variant="ghost" 
                                             size="icon" 
                                             className="absolute top-0 right-0 h-6 w-6 text-muted-foreground hover:text-destructive"
                                             onClick={() => handleRemoveSubject(level, num)}
                                         >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="outline" className="h-8 mt-auto" onClick={() => handleAddSubject(level)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Subject
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Transport Fees</CardTitle>
                     <CardDescription>Set the monthly fee for transport services.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
                         <div className="space-y-1">
                            <Label htmlFor="transport-in">Inside Limit (e.g., Bandar Putra)</Label>
                            <Input
                                id="transport-in"
                                type="number"
                                value={prices.transportInbound}
                                onChange={(e) => handleTransportPriceChange('transportInbound', e.target.value)}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="transport-out">Outside Limit</Label>
                            <Input
                                id="transport-out"
                                type="number"
                                value={prices.transportOutbound}
                                onChange={(e) => handleTransportPriceChange('transportOutbound', e.target.value)}
                                className="h-8"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

             <div className="flex justify-end">
                 <Button onClick={handleSaveChanges} disabled={isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {isPending ? 'Saving...' : 'Save All Changes'}
                </Button>
            </div>
        </div>
    );
}

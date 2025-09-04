
"use client";

import * as React from 'react';
import type { Prices, StudentLevel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { updatePrices } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Save } from 'lucide-react';

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

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Price Management</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                     <Accordion type="multiple" className="w-full">
                        <AccordionItem value="tuition">
                             <AccordionTrigger className="text-base">Tuition Fees</AccordionTrigger>
                             <AccordionContent>
                                {studentLevels.map(level => (
                                    <div key={level} className="mb-4">
                                        <h4 className="font-semibold mb-2">{level}</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[1, 2, 3].map(num => (
                                                <div key={num} className="space-y-1">
                                                    <Label htmlFor={`${level}-${num}`}>{num} Subject{num > 1 ? 's' : ''}</Label>
                                                    <Input
                                                        id={`${level}-${num}`}
                                                        type="number"
                                                        value={prices[level]?.[num.toString()] || ''}
                                                        onChange={(e) => handlePriceChange(level, num.toString(), e.target.value)}
                                                        className="h-8"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                             </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="transport">
                            <AccordionTrigger className="text-base">Transport Fees</AccordionTrigger>
                             <AccordionContent>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                        <Label htmlFor="transport-in">Inside Limit</Label>
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
                            </AccordionContent>
                        </AccordionItem>
                     </Accordion>
                     <Button onClick={handleSaveChanges} disabled={isPending} className="w-full">
                        <Save className="mr-2 h-4 w-4" />
                        {isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

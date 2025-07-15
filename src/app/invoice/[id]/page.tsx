"use client";

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { Student } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ArrowLeft, FileDown } from 'lucide-react';
import Link from 'next/link';

// Mock pricing, you can replace this with actual logic
const getPrice = (student: Student) => {
    let price = 100; // Base price
    if(student.level.startsWith('Secondary')) price += 50;
    if(student.transport === 'Yes') {
        price += student.transportArea === 'Inside Limit' ? 20 : 40;
    }
    return price;
}

export default function InvoicePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const invoiceRef = React.useRef<HTMLDivElement>(null);
    
    const [invoiceData, setInvoiceData] = React.useState<any>(null);
    const [flexibleCost, setFlexibleCost] = React.useState(0);
    const [discount, setDiscount] = React.useState(0);
    const [notes, setNotes] = React.useState('');

    React.useEffect(() => {
        const data = searchParams.get('data');
        if (data) {
            setInvoiceData(JSON.parse(data));
        }
    }, [searchParams]);

    const handleGeneratePdf = () => {
        const input = invoiceRef.current;
        if (input) {
            html2canvas(input, { scale: 2 }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`invoice-${params.id}.pdf`);
            });
        }
    };
    
    if (!invoiceData) {
        return (
             <div className="flex items-center justify-center h-screen">
                <p>Loading invoice data...</p>
             </div>
        );
    }
    
    const subtotal = invoiceData.children.reduce((acc: number, student: Student) => acc + getPrice(student), 0);
    const grandTotal = subtotal + flexibleCost - discount;

    return (
        <div className="min-h-screen bg-muted/40 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                 <div className="mb-4">
                    <Button variant="outline" asChild>
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </Button>
                </div>
                <Card>
                    <div ref={invoiceRef}>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle className="text-3xl font-bold">Invoice</CardTitle>
                                <CardDescription>Invoice #: {params.id}</CardDescription>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">{invoiceData.guardianName}</p>
                                <p className="text-sm text-muted-foreground">{invoiceData.address}</p>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Separator className="my-4" />
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead className="text-right">Total Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoiceData.children.map((student: Student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">{student.name}</TableCell>
                                            <TableCell>
                                                <div className="text-muted-foreground text-sm">
                                                    <p>Level: {student.level}</p>
                                                    <p>Subjects: {student.subjects}</p>
                                                    <p>Transport: {student.transport}{student.transport === 'Yes' ? ` (${student.transportArea})` : ''}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">RM {getPrice(student).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                     <TableRow>
                                        <TableCell colSpan={2} className="text-right font-semibold">Subtotal</TableCell>
                                        <TableCell className="text-right">RM {subtotal.toFixed(2)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                            <Separator className="my-4" />
                             <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <Label htmlFor="notes" className="text-base">Additional Notes</Label>
                                    <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any extra details..." className="mt-2" />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="flexible-cost">Flexible Cost</Label>
                                        <div className="flex items-center">
                                            <span className="mr-2">RM</span>
                                            <Input id="flexible-cost" type="number" value={flexibleCost} onChange={e => setFlexibleCost(parseFloat(e.target.value) || 0)} className="w-32 text-right" />
                                        </div>
                                    </div>
                                     <div className="flex items-center justify-between">
                                        <Label htmlFor="discount">Discount</Label>
                                         <div className="flex items-center">
                                            <span className="mr-2">RM</span>
                                            <Input id="discount" type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-32 text-right" />
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between font-bold text-lg">
                                        <span>Grand Total</span>
                                        <span>RM {grandTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </div>
                     <CardFooter className="flex justify-end border-t pt-6">
                        <Button onClick={handleGeneratePdf}>
                            <FileDown className="mr-2 h-4 w-4"/>
                            Generate PDF
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

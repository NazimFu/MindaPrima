
"use client";

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Student, Prices } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ArrowLeft, FileDown, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const getPrice = (student: Student, prices: Prices) => {
    const numSubjects = student.subjects.split(',').map(s => s.trim()).filter(Boolean).length;
    const levelPrices = prices[student.level];

    let tuitionFee = 0;
    if (levelPrices && levelPrices[numSubjects.toString()]) {
        tuitionFee = levelPrices[numSubjects.toString()];
    }

    let transportFee = 0;
    if (student.transport === 'Yes') {
        transportFee = student.transportArea === 'Inside Limit' ? prices.transportInbound : prices.transportOutbound;
    }
    
    return tuitionFee + transportFee;
};


type FlexibleFee = {
    description: string;
    details: string;
    type: 'Addition' | 'Deduction';
    amount: number;
};


export default function InvoicePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const invoiceRef = React.useRef<HTMLDivElement>(null);
    
    const [invoiceData, setInvoiceData] = React.useState<any>(null);
    const [flexibleFees, setFlexibleFees] = React.useState<FlexibleFee[]>([]);
    const [discount, setDiscount] = React.useState(0);
    const [notes, setNotes] = React.useState(
        'T(I): Transport (BP area)\nT(O): Transport (Out of BP)'
    );

     React.useEffect(() => {
        const data = searchParams.get('data');
        if (data) {
            const parsedData = JSON.parse(data);
            setInvoiceData(parsedData);
            
            const initialFees: FlexibleFee[] = [
                { description: 'New Registration', details: 'One-time fee', type: 'Addition', amount: 0 },
                { description: 'Personal Tuition', details: '1 Person', type: 'Addition', amount: 0 },
                { description: 'Worksheet', details: 'Once a year (3P)', type: 'Addition', amount: 0 },
            ];
            
            setFlexibleFees(initialFees);
        }
    }, [searchParams]);

    const handleGeneratePdf = () => {
        const input = invoiceRef.current;
        if (!input) return;

        const originalFont = input.style.fontFamily;
        input.style.fontFamily = 'sans-serif';

        const elementsToHide = input.querySelectorAll('[data-pdf-hide]');
        elementsToHide.forEach(el => (el as HTMLElement).style.display = 'none');

        const interactiveElements = Array.from(input.querySelectorAll<HTMLElement>('[data-pdf-interactive]'));
        const replacements: { original: HTMLElement; replacement: HTMLSpanElement }[] = [];

        interactiveElements.forEach(el => {
            let value = '';
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                value = (el as HTMLInputElement | HTMLTextAreaElement).value;
            } else if (el.querySelector('[data-radix-select-trigger]')) {
                const valueEl = el.querySelector<HTMLSpanElement>('span');
                if (valueEl) value = valueEl.innerText;
            } else if (el.hasAttribute('data-radix-select-trigger')) {
                 const valueEl = el.querySelector<HTMLSpanElement>('span');
                if (valueEl) value = valueEl.innerText;
            }
            
            const replacement = document.createElement('span');
            replacement.className = el.dataset.pdfReplacementClass || '';

            if (el.dataset.pdfPrefix) {
                replacement.textContent = `${el.dataset.pdfPrefix}${value}`;
            } else {
                replacement.textContent = value;
            }
            
            el.style.display = 'none';
            el.parentElement?.insertBefore(replacement, el.nextSibling);
            replacements.push({ original: el, replacement });
        });

        html2canvas(input, { scale: 2, useCORS: true })
            .then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`invoice-${params.id}.pdf`);
            })
            .finally(() => {
                input.style.fontFamily = originalFont;
                elementsToHide.forEach(el => (el as HTMLElement).style.display = '');
                replacements.forEach(({ original, replacement }) => {
                    original.style.display = '';
                    replacement.remove();
                });
            });
    };
    
    if (!invoiceData) {
        return (
             <div className="flex items-center justify-center h-screen">
                <p>Loading invoice data...</p>
             </div>
        );
    }
    
    const subtotal = invoiceData.children.reduce((acc: number, student: Student) => acc + getPrice(student, invoiceData.prices), 0);
    const flexibleTotal = flexibleFees.reduce((acc, fee) => {
        const amount = fee.type === 'Addition' ? fee.amount : -fee.amount;
        return acc + (amount || 0);
    }, 0);
    const grandTotal = subtotal + flexibleTotal - discount;
    
    const handleFlexibleFeeChange = (index: number, field: keyof FlexibleFee, value: string | number) => {
        const newFees = [...flexibleFees];
        const fee = { ...newFees[index] };
    
        if (field === 'amount') {
            fee[field] = parseFloat(value as string) || 0;
        } else {
            fee[field] = value as any;
        }
    
        newFees[index] = fee;
        setFlexibleFees(newFees);
    };

    const addFlexibleFeeRow = () => {
        setFlexibleFees([...flexibleFees, { description: '', details: '', type: 'Addition', amount: 0 }]);
    };

    const removeFlexibleFeeRow = (index: number) => {
        const newFees = flexibleFees.filter((_, i) => i !== index);
        setFlexibleFees(newFees);
    };


    const getInvoiceMonth = () => {
        if (!invoiceData || !invoiceData.month) return '';
        if (invoiceData.month === 'current') {
            return new Date().toLocaleString('default', { month: 'long' });
        }
        return invoiceData.month.split(' ')[0];
    };
    
    const getTransportNote = (student: Student, prices: Prices) => {
        if (student.transport === 'Yes') {
            if (student.transportArea === 'Inside Limit') {
                return `T(I): RM${prices.transportInbound.toFixed(2)}`;
            }
            return `T(O): RM${prices.transportOutbound.toFixed(2)}`;
        }
        return '';
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-4 flex justify-between items-center">
                    <Button variant="outline" asChild>
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </Button>
                     <Button onClick={handleGeneratePdf} data-pdf-hide="true">
                        <FileDown className="mr-2 h-4 w-4"/>
                        Generate PDF
                    </Button>
                </div>
                <div ref={invoiceRef} className="bg-white p-8 sm:p-12 shadow-lg font-sans">
                    <header className="border-b-4 border-blue-800 pb-4 mb-8 flex justify-between items-start">
                        <div className="leading-snug">
                            <h1 className="text-3xl font-bold text-blue-800">Minda Prima</h1>
                            <p>5406A, Jalan Kenari 18</p>
                            <p>Bandar Putra, 81000</p>
                            <p>Kulai, Johor</p>
                            <p>(+60) 137090363</p>
                        </div>
                        <div className="w-24 h-24">
                            <Image src="https://picsum.photos/100/100" alt="Minda Prima Logo" width={100} height={100} data-ai-hint="education logo" />
                        </div>
                    </header>

                    <section className="mb-8">
                        <h2 className="text-4xl font-bold text-blue-800 mb-4">Invoice [{getInvoiceMonth()}]</h2>
                        <div className="flex justify-between text-sm">
                            <div className="leading-snug">
                                <p><span className="font-semibold">Invoice #</span> {params.id}</p>
                                <p className="font-semibold mt-4">Customer</p>
                                <p>{invoiceData.guardianName}</p>
                                {invoiceData.address.split(',').map((line: string, i: number) => <p key={i}>{line.trim()}</p>)}
                            </div>
                            <div className="text-right leading-snug">
                                <p><span className="font-semibold">Invoice Date</span> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                <p><span className="font-semibold">Currency</span> MYR</p>
                            </div>
                        </div>
                    </section>
                    
                    <section className="mb-8">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-300">
                                    <th className="py-2 font-bold text-blue-800">Student</th>
                                    <th className="py-2 font-bold text-blue-800">Subjects</th>
                                    <th className="py-2 font-bold text-blue-800">Note</th>
                                    <th className="py-2 font-bold text-blue-800 text-center">Qty</th>
                                    <th className="py-2 font-bold text-blue-800 text-center">Level</th>
                                    <th className="py-2 font-bold text-blue-800 text-right">Total price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoiceData.children.map((student: Student) => (
                                    <tr key={student.id} className="border-b border-gray-200">
                                        <td className="py-2">{student.name}</td>
                                        <td className="py-2">{student.subjects}</td>
                                        <td className="py-2">{getTransportNote(student, invoiceData.prices)}</td>
                                        <td className="py-2 text-center">{student.subjects.split(',').map(s => s.trim()).filter(Boolean).length}</td>
                                        <td className="py-2 text-center">
                                            {student.level.includes('Primary') ? `P${student.level.split(' ')[1]}` : `S${student.level.split(' ')[1]}`}
                                        </td>
                                        <td className="py-2 text-right">RM{getPrice(student, invoiceData.prices).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                     <section className="mb-8">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-blue-800 text-white">
                                    <th className="p-2 font-bold rounded-tl-md w-1/3">Flexible fees</th>
                                    <th className="p-2 font-bold w-1/3">Details</th>
                                    <th className="p-2 font-bold">Type</th>
                                    <th className="p-2 font-bold text-right rounded-tr-md">Amount</th>
                                    <th className="p-2 w-12" data-pdf-hide="true"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {flexibleFees.map((fee, index) => (
                                <tr key={index} className="border-b border-gray-200 bg-gray-50">
                                    <td className="p-2">
                                        <Input
                                            type="text"
                                            value={fee.description}
                                            onChange={(e) => handleFlexibleFeeChange(index, 'description', e.target.value)}
                                            className="h-8 border-gray-300 rounded"
                                            data-pdf-interactive="true"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <Input
                                            type="text"
                                            value={fee.details}
                                            onChange={(e) => handleFlexibleFeeChange(index, 'details', e.target.value)}
                                            className="h-8 border-gray-300 rounded"
                                            data-pdf-interactive="true"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <div data-pdf-interactive="true" data-radix-select-trigger="true">
                                            <Select
                                                value={fee.type}
                                                onValueChange={(value: 'Addition' | 'Deduction') => handleFlexibleFeeChange(index, 'type', value)}
                                            >
                                                <SelectTrigger className="h-8 border-gray-300 rounded">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Addition">Addition</SelectItem>
                                                    <SelectItem value="Deduction">Deduction</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </td>
                                    <td className="p-2 text-right">
                                         <Input 
                                            type="number" 
                                            value={fee.amount}
                                            onChange={(e) => handleFlexibleFeeChange(index, 'amount', e.target.value)}
                                            className="w-28 h-8 text-right pr-2 border-gray-300 rounded"
                                            data-pdf-interactive="true"
                                            data-pdf-prefix="RM"
                                            data-pdf-replacement-class="w-28 text-right"
                                        />
                                    </td>
                                    <td className="p-2 text-center" data-pdf-hide="true">
                                       <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeFlexibleFeeRow(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-2 flex justify-end">
                            <Button variant="outline" size="sm" onClick={addFlexibleFeeRow} data-pdf-hide="true">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Row
                            </Button>
                        </div>
                    </section>
                    
                    <section className="mb-8 flex justify-between">
                         <div>
                            <p className="font-bold mb-1">Notes:</p>
                            <Textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="text-sm w-80 h-24 border-gray-300 rounded"
                                data-pdf-interactive="true"
                                data-pdf-replacement-class="text-sm w-80 whitespace-pre-wrap"
                            />
                        </div>
                        <div className="w-1/3 text-sm">
                             <div className="flex justify-between py-1">
                                <span>Subtotal</span>
                                <span className="font-bold">RM{subtotal.toFixed(2)}</span>
                            </div>
                             <div className="flex justify-between py-1">
                                <span>Flexible Fees</span>
                                <span className="font-bold">RM{flexibleTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1 items-center">
                                <span>Discount</span>
                                 <Input 
                                    type="number" 
                                    value={discount} 
                                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                    className="w-28 h-8 text-right pr-2 border-gray-300 rounded" 
                                    data-pdf-interactive="true"
                                    data-pdf-prefix="RM"
                                    data-pdf-replacement-class="w-28 text-right font-bold"
                                 />
                            </div>
                             <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-300">
                                <span className="text-xl font-bold">Grand Total</span>
                                <span className="text-2xl font-bold text-pink-600">RM{grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </section>

                    <footer className="text-sm text-center pt-4 border-t mt-8">
                        <p className="font-bold">Additional Details</p>
                        <p>Bank Details: Bank: Maybank Islamic. Account Number: xxxxx-xxxxxx.</p>
                        <p>VAT Registration Number: 100000000. Company Number: 98765432</p>
                         <p className="mt-4 font-semibold text-blue-800">Thank you for your business!</p>
                    </footer>
                </div>
            </div>
        </div>
    );

    
}

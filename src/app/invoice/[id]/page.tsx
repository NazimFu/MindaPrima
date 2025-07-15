"use client";

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Student } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ArrowLeft, FileDown, Pencil } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const getPrice = (student: Student) => {
    let price = 40; // Base price from image
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
    const [flexibleFees, setFlexibleFees] = React.useState([
        { description: 'Personal Tuition', details: '1 Person', type: 'Addition', amount: 0 },
        { description: 'Worksheet', details: 'Once a year (3P)', type: 'Addition', amount: 0 },
        { description: 'Transport', details: 'Deduct 3 days', type: 'Deduction', amount: 0 },
    ]);
    const [discount, setDiscount] = React.useState(0);
    const [notes, setNotes] = React.useState(
        'NR: New Registration\nT(I): Transport (BP area)\nT(O): Transport (Out of BP)'
    );

    React.useEffect(() => {
        const data = searchParams.get('data');
        if (data) {
            setInvoiceData(JSON.parse(data));
        }
    }, [searchParams]);

    const handleGeneratePdf = () => {
        const input = invoiceRef.current;
        if (input) {
            const buttons = input.querySelectorAll('button');
            buttons.forEach(btn => btn.style.display = 'none');
            const inputs = input.querySelectorAll('input, textarea');
            inputs.forEach(inp => (inp as HTMLElement).style.border = 'none');

            html2canvas(input, { scale: 2 }).then(canvas => {
                buttons.forEach(btn => btn.style.display = '');
                inputs.forEach(inp => (inp as HTMLElement).style.border = '');

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
    const flexibleTotal = flexibleFees.reduce((acc, fee) => {
        return fee.type === 'Addition' ? acc + fee.amount : acc - fee.amount;
    }, 0);
    const grandTotal = subtotal + flexibleTotal - discount;

    const handleFlexibleFeeChange = (index: number, value: string) => {
        const newFees = [...flexibleFees];
        newFees[index].amount = parseFloat(value) || 0;
        setFlexibleFees(newFees);
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="mb-4 flex justify-between items-center">
                    <Button variant="outline" asChild>
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </Button>
                     <Button onClick={handleGeneratePdf}>
                        <FileDown className="mr-2 h-4 w-4"/>
                        Generate PDF
                    </Button>
                </div>
                <div ref={invoiceRef} className="bg-white p-8 sm:p-12 shadow-lg">
                    <header className="border-b-4 border-blue-800 pb-4 mb-8 flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-blue-800">Minda Prima</h1>
                            <p>5406A, Jalan Kenari 18</p>
                            <p>Bandar Putra, 81000</p>
                            <p>Kulai, Johor</p>
                            <p>(+60) 137090363</p>
                        </div>
                        <div className="w-24 h-24">
                            <Image src="https://placehold.co/100x100.png" alt="Minda Prima Logo" width={100} height={100} data-ai-hint="education logo" />
                        </div>
                    </header>

                    <section className="mb-8">
                        <h2 className="text-4xl font-bold text-blue-800 mb-4">Invoice [{invoiceData.month === 'current' ? new Date().toLocaleString('default', { month: 'long' }) : invoiceData.month.split(' ')[0]}]</h2>
                        <div className="flex justify-between text-sm">
                            <div>
                                <p><span className="font-semibold">Invoice #</span> {params.id}</p>
                                <p className="font-semibold mt-4">Customer</p>
                                <p>{invoiceData.guardianName}</p>
                                {invoiceData.address.split(',').map((line: string, i: number) => <p key={i}>{line.trim()}</p>)}
                            </div>
                            <div className="text-right">
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
                                        <td className="py-2"></td>
                                        <td className="py-2 text-center">1</td>
                                        <td className="py-2 text-center">
                                            {student.level.includes('Primary') ? `P${student.level.split(' ')[1]}` : `S${student.level.split(' ')[1]}`}
                                        </td>
                                        <td className="py-2 text-right">RM{getPrice(student).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                     <section className="mb-8">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-blue-800 text-white">
                                    <th className="p-2 font-bold rounded-tl-md">Flexible fees</th>
                                    <th className="p-2 font-bold"></th>
                                    <th className="p-2 font-bold"></th>
                                    <th className="p-2 font-bold text-right rounded-tr-md"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {flexibleFees.map((fee, index) => (
                                <tr key={index} className="border-b border-gray-200 bg-gray-50">
                                    <td className="p-2">{fee.description}</td>
                                    <td className="p-2">{fee.details}</td>
                                    <td className="p-2">{fee.type}</td>
                                    <td className="p-2 text-right">
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2">RM</span>
                                            <Input 
                                                type="number" 
                                                value={fee.amount}
                                                onChange={(e) => handleFlexibleFeeChange(index, e.target.value)}
                                                className="w-28 h-8 text-right pr-2 pl-8 border-gray-300 rounded" 
                                            />
                                        </div>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                    
                    <section className="mb-8 flex justify-between">
                         <div>
                            <p className="font-bold mb-1">Notes:</p>
                            <Textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="text-sm w-80 h-24 border-gray-300 rounded"
                            />
                        </div>
                        <div className="w-1/3 text-sm">
                             <div className="flex justify-between py-1">
                                <span>Subtotal</span>
                                <span className="font-bold">RM{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span>Discount</span>
                                <div className="relative">
                                     <span className="absolute left-2 top-1/2 -translate-y-1/2">RM</span>
                                    <Input 
                                        type="number" 
                                        value={discount} 
                                        onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                        className="w-28 h-8 text-right pr-2 pl-8 border-gray-300 rounded" 
                                    />
                                </div>
                            </div>
                             <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-300">
                                <span className="text-2xl font-bold text-pink-600">RM{grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </section>

                    <footer className="text-sm">
                        <p className="font-bold">Additional Details</p>
                        <p>Bank Details: Bank: Maybank Islamic. Account Number: xxxxx-xxxxxx.</p>
                        <p>VAT Registration Number: 100000000. Company Number: 98765432</p>
                    </footer>
                </div>
            </div>
        </div>
    );
}

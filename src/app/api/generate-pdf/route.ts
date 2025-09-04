
import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function POST(req: NextRequest) {
  console.log('PDF generation request received');
  let browser = null;
  try {
    console.log('Parsing request body');
    const { htmlContent } = await req.json();

    if (!htmlContent) {
      console.error('Missing htmlContent');
      return NextResponse.json({ error: 'Missing htmlContent' }, { status: 400 });
    }
    
    console.log('Launching local browser');
    browser = await chromium.launch();
    
    console.log('Opening new page');
    const page = await browser.newPage();
    
    console.log('Setting page content');
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

    console.log('Cleaning up HTML for PDF generation');
    await page.evaluate(() => {
      const elementsToHide = document.querySelectorAll('[data-pdf-hide="true"]');
      elementsToHide.forEach(el => (el as HTMLElement).remove());
    });
    
    console.log('Generating PDF');
    const pdfBuffer = await page.pdf({ 
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    console.log('Returning PDF');
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="invoice.pdf"',
      },
    });

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    let errorMessage: string;

    if (typeof error === 'string') {
        errorMessage = error;
    } else if (error instanceof Error) {
        errorMessage = error.stack || error.message;
    } else {
        errorMessage = JSON.stringify(error, null, 2);
    }
    
    return NextResponse.json({ error: 'Failed to generate PDF', details: errorMessage }, { status: 500 });
  } finally {
    if (browser) {
      console.log('Closing browser');
      await browser.close();
    }
  }
}

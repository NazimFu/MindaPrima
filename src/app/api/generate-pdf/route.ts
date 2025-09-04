
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';

// This is a publicly available browser instance hosted by Browserless
const BROWSERLESS_URL = 'wss://browserless.one/chromium?stealth=true&block_ads=true';

export async function POST(req: NextRequest) {
  try {
    const { htmlContent } = await req.json();

    if (!htmlContent) {
      return NextResponse.json({ error: 'Missing htmlContent' }, { status: 400 });
    }
    
    const browser = await puppeteer.connect({
        browserWSEndpoint: BROWSERLESS_URL,
    });
    
    const page = await browser.newPage();
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
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
    
    await browser.close();
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="invoice.pdf"',
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to generate PDF', details: errorMessage }, { status: 500 });
  }
}

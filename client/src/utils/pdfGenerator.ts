import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { UserOptions, ColumnInput } from 'jspdf-autotable';

// Store settings type
export interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  thankYouMessage: string;
  storeLogo?: string; // Base64 data URL of the logo
}

// Default store settings
export const defaultStoreSettings: StoreSettings = {
  storeName: 'Inventory Pro Store',
  storeAddress: '123 Main Street, City, State, 12345',
  storePhone: '(555) 123-4567',
  thankYouMessage: 'Thank you for shopping with us!'
};

// Type for data used when generating a receipt
export interface ReceiptData {
  transactionId: string | number;
  cashier: string;
  date: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    unit?: string;
    subtotal: number;
  }[];
  total: number;
  storeSettings?: StoreSettings;
}

/**
 * Generate a PDF receipt
 * @param data Receipt data including transaction details and store settings
 * @returns A Blob containing the PDF document
 */
export const generateReceiptPdf = (data: ReceiptData): Blob => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Use provided store settings or fall back to defaults
  const storeSettings = data.storeSettings || defaultStoreSettings;
  
  // Set up document properties
  doc.setProperties({
    title: `Receipt #${data.transactionId}`,
    subject: 'Store Receipt',
    author: 'Inventory Pro',
    creator: 'Inventory Pro System'
  });
  
  // Font sizes
  const titleFontSize = 14;
  const headerFontSize = 12;
  const normalFontSize = 10;
  const smallFontSize = 8;
  
  // Margins and positions
  const margin = 15;
  const pageWidth = doc.internal.pageSize.width - 2 * margin;
  let yPos = margin;
  
  // Helper function to center text
  const centerText = (text: string, y: number, fontSize: number) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
    const x = (doc.internal.pageSize.width - textWidth) / 2;
    doc.text(text, x, y);
    return y + fontSize / 4;
  };
  
  // Store name (title)
  doc.setFont('helvetica', 'bold');
  yPos = centerText(storeSettings.storeName, yPos + 5, titleFontSize);
  
  // Store address
  doc.setFont('helvetica', 'normal');
  yPos = centerText(storeSettings.storeAddress, yPos + 5, smallFontSize);
  
  // Store phone
  yPos = centerText(storeSettings.storePhone, yPos + 4, smallFontSize);
  
  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos + 3, margin + pageWidth, yPos + 3);
  yPos += 8;
  
  // Receipt header details
  doc.setFontSize(headerFontSize);
  doc.setFont('helvetica', 'bold');
  doc.text(`RECEIPT #${data.transactionId}`, margin, yPos);
  yPos += 6;
  
  // Receipt date and cashier
  doc.setFontSize(normalFontSize);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${data.date}`, margin, yPos);
  doc.text(`Cashier: ${data.cashier}`, margin + pageWidth/2, yPos);
  yPos += 8;
  
  // Items table
  const tableHeaders = [['Item', 'Qty', 'Price', 'Subtotal']];
  const tableRows = data.items.map(item => [
    item.name,
    item.quantity.toString() + (item.unit ? ` ${item.unit}` : ''),
    `$${item.price.toFixed(2)}`,
    `$${item.subtotal.toFixed(2)}`
  ]);
  
  // Add the table
  autoTable(doc, {
    head: tableHeaders,
    body: tableRows,
    startY: yPos,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: normalFontSize },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' }
    }
  });
  
  // Get the y position after the table
  const tableEndY = (doc as any).lastAutoTable?.finalY;
  yPos = tableEndY ? tableEndY + 10 : yPos + 10;
  
  // Total amount
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(headerFontSize);
  doc.text('Total:', margin + pageWidth - 50, yPos);
  doc.text(`$${data.total.toFixed(2)}`, margin + pageWidth - 10, yPos, { align: 'right' });
  yPos += 15;
  
  // Thank you message
  doc.setFont('helvetica', 'normal');
  yPos = centerText(storeSettings.thankYouMessage, yPos, normalFontSize);
  yPos += 10;
  
  // Add store logo if provided
  if (storeSettings.storeLogo) {
    try {
      // Add the logo centered below the thank you message
      const logoWidth = 50; // mm
      const logoHeight = 20; // mm
      const logoX = (doc.internal.pageSize.width - logoWidth) / 2;
      
      doc.addImage(
        storeSettings.storeLogo, 
        'PNG', 
        logoX, 
        yPos, 
        logoWidth, 
        logoHeight
      );
    } catch (err) {
      // Skip logo if there's an error loading it
    }
  }
  
  // Footer with current date time
  const footerText = `Generated on: ${format(new Date(), 'PPpp')}`;
  doc.setFontSize(smallFontSize);
  doc.setTextColor(150);
  doc.text(
    footerText,
    doc.internal.pageSize.width / 2,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );
  
  // Return the PDF as a blob
  return doc.output('blob');
};

/**
 * Generate a PDF report from tabular data
 * @param title Report title
 * @param headers Column headers
 * @param data Row data
 * @returns A Blob containing the PDF document
 */
export const generateReportPdf = (
  title: string,
  headers: string[],
  data: string[][],
  subtitle?: string,
  reportType?: string,
  additionalData?: any
): Blob => {
  // Input validation
  if (!title) title = 'Report';
  if (!Array.isArray(headers) || headers.length === 0) headers = ['No Data'];
  if (!Array.isArray(data)) {
    // Handle invalid data with a fallback
    data = [['No data available']];
  }
  
  // Use landscape for wide reports or many rows
  const useWideFormat = data.length > 20 || headers.length > 5;
  
  // Create new PDF document
  const doc = new jsPDF({
    orientation: useWideFormat ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Set document properties
  doc.setProperties({
    title: title,
    subject: 'Inventory Pro Report',
    author: 'Inventory Pro',
    creator: 'Inventory Pro System'
  });
  
  // Font sizes
  const titleFontSize = 16;
  const subtitleFontSize = 12;
  const normalFontSize = 10;
  const smallFontSize = 8;
  
  // Margins and positions
  const margin = 15;
  const pageWidth = doc.internal.pageSize.width - 2 * margin;
  let yPos = margin;
  
  // Add title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(titleFontSize);
  doc.text(title, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // Add subtitle if provided
  if (subtitle) {
    doc.setFontSize(subtitleFontSize);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
    yPos += 10;
  }

  // Add report-specific summary information
  if (reportType && additionalData) {
    doc.setFontSize(normalFontSize);
    doc.setFont('helvetica', 'normal');

    if (reportType === 'sales') {
      // Add sales summary
      const totalSales = additionalData.totalSales || 0;
      const totalItems = additionalData.totalItems || 0;
      doc.text(`Total Sales: $${totalSales.toFixed(2)}`, margin, yPos);
      doc.text(`Total Items Sold: ${totalItems}`, margin + pageWidth/2, yPos);
      yPos += 8;
    } 
    else if (reportType === 'low-stock') {
      // Add low stock summary
      const lowStockCount = additionalData.lowStockCount || 0;
      doc.text(`Low Stock Items: ${lowStockCount}`, margin, yPos);
      doc.text(`Report Date: ${format(new Date(), 'PPP')}`, margin + pageWidth/2, yPos);
      yPos += 8;
    }
    else if (reportType === 'inventory') {
      // Add inventory summary
      const totalItems = additionalData.totalItems || 0;
      const totalValue = additionalData.totalValue || 0;
      doc.text(`Total Inventory Items: ${totalItems}`, margin, yPos);
      doc.text(`Total Inventory Value: $${totalValue.toFixed(2)}`, margin + pageWidth/2, yPos);
      yPos += 8;
    }
    else if (reportType === 'refunds') {
      // Add refund summary
      const totalRefunded = additionalData.totalRefunded || 0;
      const refundCount = additionalData.refundCount || 0;
      doc.text(`Total Refunded: $${totalRefunded.toFixed(2)}`, margin, yPos);
      doc.text(`Number of Refunds: ${refundCount}`, margin + pageWidth/2, yPos);
      yPos += 8;
    }
    else if (reportType === 'losses') {
      // Add losses summary 
      const lossCount = additionalData.lossCount || 0;
      const totalValue = additionalData.totalValue || 0;
      doc.text(`Total Loss Incidents: ${lossCount}`, margin, yPos);
      doc.text(`Total Value Lost: $${totalValue.toFixed(2)}`, margin + pageWidth/2, yPos);
      yPos += 8;
    }
  }
  
  // Format headers for the table
  const tableHeaders = [headers];
  
  // Add the table with dynamic column styles that are strings (like 'auto')
  autoTable(doc, {
    head: tableHeaders,
    body: data,
    startY: yPos,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    styles: {
      fontSize: normalFontSize,
      cellPadding: 3
    },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    // Use string as index for column styles
    columnStyles: headers.reduce((styles, _, index) => {
      // Using 'auto' as a string literal which is accepted by the library
      styles[index.toString()] = { cellWidth: 'auto' as any };
      return styles;
    }, {} as Record<string, any>)
  });

  // Get position after table to add charts or additional information
  // Get the last table's position or use a fallback
  let finalY = margin;
  
  // Get the final Y position from the last table generated
  const tableEndY = (doc as any).lastAutoTable?.finalY;
  if (tableEndY) {
    finalY = tableEndY + 10;
  } else {
    finalY = yPos + 10; // If no table was rendered, use the last known position
  }
  
  // Add report-specific charts or additional information
  if (reportType === 'refunds' && additionalData && additionalData.charts) {
    // Add a note about charts
    doc.setFontSize(smallFontSize);
    doc.setTextColor(100);
    doc.text(
      'Note: For interactive charts and detailed analysis, please view the Refund Analysis tab in the application.',
      doc.internal.pageSize.width / 2,
      finalY,
      { align: 'center' }
    );
  }
  
  // Add footer with timestamp
  const footerText = `Report generated: ${format(new Date(), 'PPpp')}`;
  doc.setFontSize(smallFontSize);
  doc.setTextColor(100);
  doc.text(
    footerText,
    doc.internal.pageSize.width / 2,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );
  
  // Return the PDF as a blob
  return doc.output('blob');
};
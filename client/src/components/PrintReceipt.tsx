import React, { useRef, useEffect, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useQuery } from '@tanstack/react-query';
import { openCashDrawer } from '@/utils/peripheralDetection';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  subtotal: number;
}

interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  thankYouMessage: string;
  storeLogo?: string;
  nextTransactionId?: number; // Made optional since we're not using it directly anymore
}

interface PrintReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  cartTotal: number;
  cashier: string;
  transactionId?: string;
}

const PrintReceipt: React.FC<PrintReceiptProps> = ({
  isOpen,
  onClose,
  cart,
  cartTotal,
  cashier,
  transactionId
}) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [settings, setSettings] = useState<StoreSettings>({
    storeName: 'Inventory Pro Store',
    storeAddress: '123 Main Street, City, State 12345',
    storePhone: '(123) 456-7890',
    thankYouMessage: 'Thank you for shopping with us!'
  });

  // Fetch store settings
  const { data: storeSettings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: isOpen, // Only fetch when the modal is open
  });

  // Update settings when data is fetched
  useEffect(() => {
    if (storeSettings) {
      setSettings(storeSettings as StoreSettings);
    }
  }, [storeSettings]);
  
  // Attempt to open cash drawer when the receipt dialog is opened
  useEffect(() => {
    if (isOpen) {
      // Try to open the cash drawer
      openCashDrawer().then(success => {
        if (success) {
          toast({
            description: "Cash drawer opened",
            duration: 2000,
          });
        }
      });
    }
  }, [isOpen]);

  // Print handler with minimal UI
  const handlePrint = useReactToPrint({
    documentTitle: "Sales Receipt",
    onAfterPrint: onClose,
    contentRef: componentRef,
    suppressErrors: true,
    // Set custom print styles
    pageStyle: `
      @page {
        size: 80mm auto;
        margin: 0mm;
      }
      body {
        width: 80mm;
        padding: 5mm;
        margin: 0;
      }
    `
  });

  if (!isOpen) return null;

  const today = new Date();
  const dateFormatted = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(today);
  
  const timeFormatted = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(today);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Receipt Preview</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Receipt Content (to be printed) */}
          <div ref={componentRef} className="bg-white p-4" style={{ width: '80mm', margin: '0 auto' }}>
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold">{settings.storeName}</h2>
              <p className="text-sm text-gray-600">{settings.storeAddress}</p>
              <p className="text-sm text-gray-600">Tel: {settings.storePhone}</p>
            </div>
            
            <div className="border-t border-b border-gray-300 py-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Date: {dateFormatted}</span>
                <span>Time: {timeFormatted}</span>
              </div>
              <div className="text-sm">Cashier ID: {cashier}</div>
              <div className="text-sm">Transaction #: {transactionId || `TRX-${settings.nextTransactionId}`}</div>
            </div>
            
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-1">Item</th>
                  <th className="text-center py-1">Qty</th>
                  <th className="text-right py-1">Price</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-1 text-left">{item.name}</td>
                    <td className="py-1 text-center">{item.quantity} {item.unit}</td>
                    <td className="py-1 text-right">${item.price.toFixed(2)}</td>
                    <td className="py-1 text-right">${item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="border-t border-gray-300 pt-2 mb-4">
              <div className="flex justify-between font-bold">
                <span>TOTAL</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="text-center text-xs mt-6">
              <p>{settings.thankYouMessage}</p>
              
              {/* Store logo at the bottom of the receipt */}
              {settings.storeLogo && (
                <div className="mt-3">
                  <img 
                    src={settings.storeLogo} 
                    alt="Store Logo" 
                    className="h-14 mx-auto"
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex justify-center space-x-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
              </svg>
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintReceipt;
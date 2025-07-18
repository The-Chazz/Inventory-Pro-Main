import React, { useEffect, useRef } from 'react';

interface InvisibleBarcodeScannerProps {
  onScan: (result: string) => void;
  isActive: boolean;
}

const InvisibleBarcodeScanner: React.FC<InvisibleBarcodeScannerProps> = ({ 
  onScan, 
  isActive 
}) => {
  const activeRef = useRef<boolean>(isActive);

  // Update ref when isActive changes
  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  // Set up keyboard listener for barcode scanners
  useEffect(() => {
    if (!isActive) return;

    let barcodeBuffer = '';
    let lastKeyTime = 0;
    const SCANNER_TIMEOUT = 50;

    const keyListener = (e: KeyboardEvent) => {
      // Only process when active
      if (!activeRef.current) return;
      
      // Don't capture input if user is typing in an input field, textarea, or any interactive element
      const target = e.target as HTMLElement;
      if (target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('[contenteditable]') ||
        target.closest('iframe') ||
        target.closest('.chat-window') ||
        target.closest('[role="textbox"]')
      )) {
        return;
      }
      
      const currentTime = new Date().getTime();
      
      // Debug logging
      console.log(`Invisible Scanner - Key pressed: ${e.key}, Buffer: ${barcodeBuffer}, Active: ${activeRef.current}`);
      
      // If there's a long delay between keypresses, start a new barcode
      if (currentTime - lastKeyTime > 1000) {
        barcodeBuffer = '';
      }
      
      // Update last keypress time
      lastKeyTime = currentTime;
      
      // Handle Enter key as completion of barcode
      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        console.log(`Invisible Scanner - Processing barcode with Enter: ${barcodeBuffer}`);
        onScan(barcodeBuffer);
        barcodeBuffer = '';
        e.preventDefault();
        e.stopPropagation();
      } 
      // Handle all other keys that might be part of a barcode
      else if (/^[a-zA-Z0-9\-]$/.test(e.key)) {
        barcodeBuffer += e.key;
        console.log(`Invisible Scanner - Building barcode: ${barcodeBuffer}`);
        
        // Prevent the key from being typed elsewhere
        e.preventDefault();
        e.stopPropagation();
        
        // Process immediately if we have a complete barcode (12-13 digits for UPC/EAN)
        if (barcodeBuffer.length >= 12) {
          console.log(`Invisible Scanner - Auto-processing complete barcode: ${barcodeBuffer}`);
          // Pass to manual scanner for processing
          onScan(barcodeBuffer);
          barcodeBuffer = '';
        } else {
          // Auto-process after delay for shorter barcodes
          setTimeout(() => {
            if (barcodeBuffer.length >= 6) {
              console.log(`Invisible Scanner - Auto-processing barcode after delay: ${barcodeBuffer}`);
              // Pass to manual scanner for processing
              onScan(barcodeBuffer);
              barcodeBuffer = '';
            }
          }, 150);
        }
      }
    };
    
    // Add the listener
    document.addEventListener('keydown', keyListener);
    
    // Cleanup function
    return () => {
      document.removeEventListener('keydown', keyListener);
    };
  }, [isActive, onScan]);

  // This component renders nothing visible
  return null;
};

export default InvisibleBarcodeScanner;
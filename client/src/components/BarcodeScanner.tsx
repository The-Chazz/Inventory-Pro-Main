import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType, Result } from '@zxing/library';
import { checkForDedicatedScanner } from '@/utils/peripheralDetection';
import { useToast } from '@/hooks/use-toast';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: Error) => void;
  onClose: () => void;
  isActive: boolean;
  formats?: BarcodeFormat[];
  showModal?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  onScan, 
  onError, 
  onClose,
  isActive, 
  formats,
  showModal = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const activeRef = useRef<boolean>(isActive);
  // Always assume hardware scanner is available to disable camera activation
  const [hasHardwareScanner, setHasHardwareScanner] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  // Check for dedicated barcode scanner when component becomes active
  useEffect(() => {
    if (isActive) {
      // Always assume a hardware scanner is available
      setHasHardwareScanner(true);
      
      // Still check for actual hardware, but don't disable the assumption
      checkForDedicatedScanner().then(hasScanner => {
        // We're keeping hasHardwareScanner true regardless of detection result
        // Silent operation - no notifications needed in production
      });
    }
  }, [isActive, toast]);

  // We're not initializing camera scanning at all
  // This effect is modified to only handle barcode formats
  useEffect(() => {
    if (!isActive) return;

    const hints = new Map();
    
    // Set specific formats if provided, otherwise use defaults
    if (formats && formats.length > 0) {
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    } else {
      hints.set(
        DecodeHintType.POSSIBLE_FORMATS, 
        [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_128
        ]
      );
    }

    // Still create the reader for manual entry processing
    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    // No camera activation - we're disabling that functionality
    // Instead, focus on keyboard input for barcodes

    // Set up keyboard event listener for barcode scanners
    const handleKeyboardInput = () => {
      let barcodeBuffer = '';
      let lastKeyTime = 0;
      const SCANNER_TIMEOUT = 50; // Typical barcode scanners send keys very quickly

      const keyListener = (e: KeyboardEvent) => {
        // Only process when active
        if (!activeRef.current) return;
        
        // Don't capture input if user is typing in an input field or textarea
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        
        const currentTime = new Date().getTime();
        
        // Production: removed debug logging for performance
        
        // If there's a long delay between keypresses, start a new barcode
        if (currentTime - lastKeyTime > 1000) {
          barcodeBuffer = '';
        }
        
        // Update last keypress time
        lastKeyTime = currentTime;
        
        // Handle Enter key as completion of barcode
        if (e.key === 'Enter' && barcodeBuffer.length > 0) {
          onScan(barcodeBuffer);
          barcodeBuffer = '';
          e.preventDefault();
          e.stopPropagation();
        } 
        // Handle all other keys that might be part of a barcode
        else if (/^[a-zA-Z0-9\-]$/.test(e.key)) {
          barcodeBuffer += e.key;
          
          // Prevent the key from being typed elsewhere
          e.preventDefault();
          e.stopPropagation();
          
          // Process immediately if we have a complete barcode (exactly 12-13 digits for UPC/EAN)
          if (barcodeBuffer.length === 12 || barcodeBuffer.length === 13) {
            onScan(barcodeBuffer);
            barcodeBuffer = '';
          }
        }
      };
      
      // Add the listener
      document.addEventListener('keydown', keyListener);
      
      // Return cleanup function
      return () => {
        document.removeEventListener('keydown', keyListener);
      };
    };
    
    // Set up listener and store cleanup function
    const cleanupKeyListener = handleKeyboardInput();

    return () => {
      // Clean up keyboard listener
      if (cleanupKeyListener) cleanupKeyListener();
      
      // Clean up reader if needed
      if (readerRef.current) {
        readerRef.current.reset();
        readerRef.current = null;
      }
    };
  }, [isActive, formats, onScan, onError]);

  const handleClose = () => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    onClose();
  };

  // Only show modal UI if showModal is true, but always keep keyboard listener active
  if (!showModal) {
    return (
      <div className="hidden">
        {/* Scanner runs in background without UI */}
        <video ref={videoRef} className="hidden" />
      </div>
    );
  }

  // Always run invisibly in background - no popup window
  return (
    <div className="hidden">
      {/* Scanner runs invisibly in background */}
      <video ref={videoRef} className="hidden" />
    </div>
  );
};

export default BarcodeScanner;
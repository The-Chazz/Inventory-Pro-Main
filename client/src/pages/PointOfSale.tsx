import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useAppContext } from "@/context/AppContext";
import BarcodeScanner from "@/components/BarcodeScanner";
import InvisibleBarcodeScanner from "@/components/InvisibleBarcodeScanner";
import { BarcodeFormat } from '@zxing/library';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PrintReceipt from "@/components/PrintReceipt";

// Define types for inventory and cart
interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  priceUnit: string;
  threshold: number;
  status: string;
  image?: string;
  barcode?: string;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  subtotal: number;
}

const PointOfSale: React.FC = () => {
  const { currentPage } = useAppContext();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannerTimeout, setScannerTimeout] = useState<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  const [currentUser, setCurrentUser] = useState({ name: "Admin User", username: "admin" }); // Default to Admin User

  const { toast } = useToast();
  
  // Helper function to format time remaining
  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  

  

  
  // Fetch current user information
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('/api/users');
      if (response && response instanceof Response) {
        return await response.json();
      }
      return [];
    }
  });
  
  // Set the current user to the first admin user in the list
  useEffect(() => {
    if (users && users.length > 0) {
      // In a real app, this would use authentication to determine the current user
      // For now, we'll just use the first admin user
      const adminUser = users.find((user: any) => user.role === 'admin') || users[0];
      if (adminUser) {
        setCurrentUser({ 
          name: adminUser.name,
          username: adminUser.username 
        });
      }
    }
  }, [users]);
  
  // Fetch inventory data sorted by popularity with shorter cache time for real-time updates
  const { data: inventoryItems, refetch: refetchInventory } = useQuery({
    queryKey: ['/api/inventory/popular'],
    queryFn: async () => {
      // Use the new endpoint that returns inventory sorted by popularity
      const response = await apiRequest('/api/inventory/popular');
      if (response && response instanceof Response) {
        return await response.json() as InventoryItem[];
      }
      return [] as InventoryItem[];
    },
    staleTime: 30000, // Cache for 30 seconds only
    refetchInterval: 60000, // Auto-refresh every minute
  });
  
  // Filter inventory items based on search term
  const filteredItems = inventoryItems?.filter((item: InventoryItem) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Calculate cart totals
  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Handle barcode scan
  const handleBarcodeScan = (barcode: string) => {
    const item = inventoryItems?.find(item => {
      return item.barcode === barcode || item.sku === barcode;
    });
    
    if (item) {
      addToCart(item);
      toast({
        description: `${item.name} added to cart`,
        duration: 2000,
      });
      
      // Reset the scanner timer when an item is successfully scanned
      if (isScanning) {
        resetScannerTimer();
      }
    } else {
      toast({
        description: `Barcode ${barcode} not found in inventory`,
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Function to reset the scanner timer
  const resetScannerTimer = () => {
    // Clear existing timeout and interval
    if (scannerTimeout) {
      clearTimeout(scannerTimeout);
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    
    // Set new 30-minute timer
    const timeoutDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
    setTimeRemaining(30 * 60); // 30 minutes in seconds
    
    // Set timeout for deactivation
    const timeout = setTimeout(() => {
      setIsScanning(false);
      setTimeRemaining(0);
      toast({
        title: "Scanner Deactivated",
        description: "Barcode scanner automatically turned off after 30 minutes",
        duration: 3000,
      });
    }, timeoutDuration);
    
    setScannerTimeout(timeout);
    
    // Set interval for countdown
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setCountdownInterval(interval);
  };

  // Direct barcode scanner logic - stays active for 5 minutes or until manually turned off
  useEffect(() => {
    if (!isScanning) return;

    let scanBuffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 1000) {
        scanBuffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter' && scanBuffer.length >= 4) {
        handleBarcodeScan(scanBuffer);
        scanBuffer = '';
        e.preventDefault();
        e.stopPropagation();
      } 
      else if (/^[a-zA-Z0-9\-]$/.test(e.key)) {
        scanBuffer += e.key;
        e.preventDefault();
        e.stopPropagation();

        // Only process barcodes that are at least 8 characters long
        if (scanBuffer.length >= 8 && (scanBuffer.length === 12 || scanBuffer.length === 13)) {
          handleBarcodeScan(scanBuffer);
          scanBuffer = '';
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isScanning]);

  // Auto-deactivate scanner after 30 minutes with countdown
  useEffect(() => {
    if (isScanning) {
      resetScannerTimer();
    } else {
      // Clear timeout and interval when scanner is turned off
      if (scannerTimeout) {
        clearTimeout(scannerTimeout);
        setScannerTimeout(null);
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
        setCountdownInterval(null);
      }
      setTimeRemaining(0);
    }

    // Cleanup timeouts on component unmount
    return () => {
      if (scannerTimeout) {
        clearTimeout(scannerTimeout);
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [isScanning]);
  
  // Add item to cart - with optimized rendering to prevent screen distortion
  const addToCart = (item: InventoryItem) => {
    // Use functional state update to ensure we're working with the latest cart state
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(cartItem => cartItem.id === item.id);
      
      if (existingItemIndex !== -1) {
        // Item already in cart, update quantity without creating layout shifts
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + 1,
          subtotal: updatedCart[existingItemIndex].price * (updatedCart[existingItemIndex].quantity + 1)
        };
        return updatedCart;
      } else {
        // Add new item to cart
        const newItem: CartItem = {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          unit: item.unit,
          subtotal: item.price
        };
        return [...prevCart, newItem];
      }
    });
  };
  
  // Remove item from cart
  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };
  
  // Update item quantity
  const updateQuantity = (id: number, quantity: number) => {
    if (quantity < 1) return;
    
    const updatedCart = cart.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantity,
          subtotal: item.price * quantity
        };
      }
      return item;
    });
    
    setCart(updatedCart);
  };
  
  // Clear cart
  const clearCart = () => {
    setCart([]);
  };
  
  // Show receipt modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState<string>("");
  
  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        description: "Cart is empty",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }
    
    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit,
          subtotal: item.subtotal
        })),
        cashier: currentUser.name, // Use the current user's name from state
        amount: cartTotal,
        status: "Completed"
      };
      
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(saleData)
      });
      
      if (response.ok) {
        const saleResult = await response.json();
        
        toast({
          description: `Sale: $${cartTotal.toFixed(2)}`,
          duration: 2000,
        });
        
        // Store the transaction ID for the receipt
        setCurrentTransactionId(saleResult.id);
        
        // Show receipt modal for printing
        setShowReceiptModal(true);
        
        // Invalidate queries to update dashboard, inventory, etc.
        queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
        queryClient.invalidateQueries({ queryKey: ['/api/inventory/popular'] });
        queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/alerts/low-stock'] });
      } else {
        throw new Error("Failed to process sale");
      }
    } catch (error: any) {
      toast({
        description: error.message || "Sale failed",
        variant: "destructive",
        duration: 3000,
      });
    }
  };
  
  return (
    <>
      <Header title={currentPage} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Products */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Products</h3>
                <div className="flex space-x-2">
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <button 
                    onClick={() => refetchInventory()} 
                    className="px-3 py-2 rounded-md font-medium bg-green-100 text-green-700 hover:bg-green-200 text-sm"
                    title="Refresh inventory"
                  >
                    Refresh
                  </button>
                  <button 
                    onClick={() => {
                      if (!isScanning) {
                        setIsScanning(true);
                        toast({
                          title: "Scanner Activated",
                          description: "Barcode scanner will stay active for 30 minutes",
                          duration: 2000,
                        });
                      }
                    }} 
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      isScanning 
                        ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer'
                    }`}
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Scanner Active ({formatTimeRemaining(timeRemaining)})</span>
                      </div>
                    ) : (
                      'Activate Scanner'
                    )}
                  </button>
                </div>
              </div>
              
              {/* Barcode Scanner is now in a modal, only shown when isScanning is true */}
              
              {/* Product Grid - with popular items appearing more prominently but without layout distortion */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredItems && filteredItems.length > 0 ? (
                  filteredItems.map((item: InventoryItem, index: number) => {
                    // Use a special style for the first 4 items (most popular)
                    const isPopular = index < 4;
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`border ${isPopular ? 'border-blue-300 shadow-md' : 'border-gray-200'} 
                          rounded-md p-3 flex flex-col items-center cursor-pointer 
                          ${isPopular ? 'hover:bg-blue-50' : 'hover:bg-gray-50'}
                          h-[9.5rem] w-full overflow-hidden relative`}
                        onClick={() => addToCart(item)}
                      >
                        {/* Popular badge - positioned absolutely to avoid affecting layout */}
                        {isPopular && (
                          <div className="absolute top-0 right-0 mt-1 mr-1 z-10">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              Popular
                            </span>
                          </div>
                        )}
                        
                        {/* Fixed height image container */}
                        <div className="h-16 w-16 mb-2 flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                          ) : (
                            <div className={`h-full w-full ${isPopular ? 'bg-blue-100' : 'bg-gray-200'} flex items-center justify-center text-gray-500 rounded-md`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Fixed size text container */}
                        <div className="text-center w-full mt-auto">
                          <h4 className={`text-sm font-medium ${isPopular ? 'text-blue-800' : 'text-gray-800'} truncate max-w-full`}>{item.name}</h4>
                          <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-8 text-center text-gray-500">
                    {searchTerm ? 'No matching products found.' : 'No products available.'}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - Cart */}
          <div className="space-y-4">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Cart</h3>
                <button 
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All
                </button>
              </div>
              
              {/* Cart Items - Fixed layout to prevent screen distortion */}
              <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                {cart.length > 0 ? (
                  cart.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 border-b border-gray-200 pb-2">
                      {/* Item details - fixed width */}
                      <div className="col-span-5">
                        <h4 className="text-sm font-medium text-gray-800 truncate">{item.name}</h4>
                        <p className="text-xs text-gray-500">${item.price.toFixed(2)} per {item.unit}</p>
                      </div>
                      
                      {/* Quantity controls - fixed width */}
                      <div className="col-span-4 flex items-center justify-center">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="text-gray-500 hover:text-gray-700 min-w-[20px]"
                          aria-label="Decrease quantity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="text-gray-500 hover:text-gray-700 min-w-[20px]"
                          aria-label="Increase quantity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Subtotal - fixed width */}
                      <div className="col-span-2 flex items-center justify-end">
                        <span className="text-sm font-medium w-16 text-right">${item.subtotal.toFixed(2)}</span>
                      </div>
                      
                      {/* Remove button - fixed width */}
                      <div className="col-span-1 flex items-center justify-center">
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700"
                          aria-label="Remove item"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>Your cart is empty</p>
                  </div>
                )}
              </div>
              
              {/* Cart Summary */}
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items</span>
                  <span className="font-medium">{itemCount}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={processSale}
                  disabled={cart.length === 0}
                  className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Process Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Direct barcode scanner logic - no separate component */}

      {/* Print Receipt Modal */}
      <PrintReceipt 
        isOpen={showReceiptModal} 
        onClose={() => {
          setShowReceiptModal(false);
          clearCart(); // Clear cart after printing/closing receipt
        }}
        cart={cart}
        cartTotal={cartTotal}
        cashier={currentUser.username}
        transactionId={currentTransactionId} // Pass the actual transaction ID from the sale
      />
    </>
  );
};

export default PointOfSale;

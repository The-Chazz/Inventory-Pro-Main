import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppContext } from "@/context/AppContext";
import Header from "@/components/Header";
import PrintReceipt from "@/components/PrintReceipt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious
} from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CreditCard, ReceiptText, X as CloseIcon, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Sale type definition
interface SaleItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  unit: string;
  subtotal: number;
}

interface Sale {
  id: string;
  cashier: string;
  date: string;
  amount: number;
  status: string;
  items: SaleItem[];
  refundedBy?: string;
  refundDate?: string;
}

// Search form schema
const searchSchema = z.object({
  query: z.string().optional()
});

const Sales: React.FC = () => {
  const { currentPage: pageTitle } = useAppContext();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReceiptView, setShowReceiptView] = useState(false);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [filter, setFilter] = useState("");
  const pageSize = 10;
  
  // Form for search
  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: ""
    }
  });
  
  // Fetch sales data
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['/api/sales'],
    refetchOnWindowFocus: false,
  });
  
  // Filter and paginate sales
  const filteredSales = sales ? (sales as Sale[]).filter((sale: Sale) => {
    if (!filter) return true;
    
    const searchLower = filter.toLowerCase();
    return (
      sale.id.toLowerCase().includes(searchLower) ||
      sale.cashier.toLowerCase().includes(searchLower) ||
      sale.date.toLowerCase().includes(searchLower) ||
      sale.amount.toString().includes(searchLower)
    );
  }) : [];
  
  const totalPages = Math.ceil(filteredSales.length / pageSize);
  const paginatedSales = filteredSales.slice(
    (currentPageNum - 1) * pageSize,
    currentPageNum * pageSize
  );
  
  // Handle search submission
  const onSubmit = (data: z.infer<typeof searchSchema>) => {
    setFilter(data.query || "");
    setCurrentPageNum(1);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Handle view receipt details
  const handleViewReceipt = (sale: Sale) => {
    setSelectedSale(sale);
    setShowReceiptView(true);
  };
  
  // Handle reprint receipt
  const handleReprint = (sale: Sale) => {
    setSelectedSale(sale);
    setShowReceiptModal(true);
  };
  
  // Convert sale items to cart items format for PrintReceipt component
  const saleItemsToCartItems = (saleItems: SaleItem[]) => {
    return saleItems.map(item => ({
      id: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      unit: item.unit,
      subtotal: item.subtotal
    }));
  };
  
  // Dialog state for refund confirmation
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [saleToRefund, setSaleToRefund] = useState<Sale | null>(null);
  
  // Toast notifications
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Mutation for refund processing
  const refundMutation = useMutation({
    mutationFn: async (saleId: string) => {
      return apiRequest({
        url: `/api/sales/${saleId}/refund`,
        method: 'POST',
        data: {}
      });
    },
    onSuccess: () => {
      toast({
        title: "Refund Successful",
        description: "The transaction has been refunded and inventory has been updated.",
        variant: "default",
      });
      
      // Close the dialog
      setRefundConfirmOpen(false);
      
      // Refresh the sales data
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
    },
    onError: (error) => {
      toast({
        title: "Refund Failed",
        description: "There was an error processing the refund. Please try again.",
        variant: "destructive",
      });
      console.error("Refund error:", error);
    }
  });
  
  // Handle refund button click - opens confirmation dialog
  const handleRefund = (sale: Sale) => {
    setSaleToRefund(sale);
    setRefundConfirmOpen(true);
  };
  
  // Process the refund when confirmed
  const confirmRefund = () => {
    if (saleToRefund) {
      refundMutation.mutate(saleToRefund.id);
    }
  };
  
  return (
    <>
      <Header title={pageTitle} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Transaction Lookup</CardTitle>
            <CardDescription>
              Search for transactions by ID, cashier, date, or amount to view details or reprint receipts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end space-x-2">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="query"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Search Transactions</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="Search by ID, cashier, date, or amount..." 
                              className="pl-8"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit">Search</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Transaction History
            </CardTitle>
            <CardDescription>
              View all transactions and reprint receipts as needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading transaction data...</div>
            ) : paginatedSales.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                {filter ? "No transactions found matching your search criteria." : "No transactions available."}
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Cashier</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSales.map((sale: Sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.id}</TableCell>
                          <TableCell>{formatDate(sale.date)}</TableCell>
                          <TableCell>{sale.cashier}</TableCell>
                          <TableCell>${sale.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              sale.status.toLowerCase() === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : sale.status.toLowerCase() === 'refunded'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {sale.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewReceipt(sale)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                View
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleReprint(sale)}
                              >
                                <ReceiptText className="h-4 w-4 mr-1" />
                                Print
                              </Button>
                              {sale.status.toLowerCase() !== 'refunded' && (
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleRefund(sale)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                    <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                                    <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
                                    <path d="M12 3v6" />
                                  </svg>
                                  Refund
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPageNum(prev => Math.max(1, prev - 1))}
                            className={currentPageNum === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          // Calculate page numbers to show
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPageNum <= 3) {
                            pageNum = i + 1;
                          } else if (currentPageNum >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPageNum - 2 + i;
                          }
                          
                          return (
                            <PaginationItem key={i}>
                              <PaginationLink
                                onClick={() => setCurrentPageNum(pageNum)}
                                isActive={currentPageNum === pageNum}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPageNum(prev => Math.min(totalPages, prev + 1))}
                            className={currentPageNum === totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
      
      {/* Print Receipt Modal */}
      {selectedSale && (
        <PrintReceipt
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          cart={saleItemsToCartItems(selectedSale.items)}
          cartTotal={selectedSale.amount}
          cashier={selectedSale.cashier}
          transactionId={selectedSale.id}
        />
      )}
      
      {/* View Receipt Dialog */}
      {selectedSale && (
        <Dialog open={showReceiptView} onOpenChange={setShowReceiptView}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <ReceiptText className="h-5 w-5 mr-2" />
                  Receipt Details
                </div>
                <Badge variant="outline">{selectedSale.id}</Badge>
              </DialogTitle>
              <DialogDescription>
                Transaction from {formatDate(selectedSale.date)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="border-y py-4 my-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-muted-foreground">Cashier:</div>
                <div className="font-medium">{selectedSale.cashier}</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">Status:</div>
                <Badge variant={
                  selectedSale.status.toLowerCase() === 'completed' 
                    ? 'default' 
                    : selectedSale.status.toLowerCase() === 'refunded'
                      ? 'destructive'
                      : 'secondary'
                }>
                  {selectedSale.status}
                </Badge>
              </div>
              {selectedSale.refundedBy && selectedSale.refundDate && (
                <div className="flex justify-between items-center mt-2">
                  <div className="text-sm text-muted-foreground">Refunded by:</div>
                  <div className="font-medium">{selectedSale.refundedBy} on {formatDate(selectedSale.refundDate)}</div>
                </div>
              )}
            </div>
            
            <ScrollArea className="max-h-[320px] rounded-md border p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSale.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-right">${item.subtotal.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            
            <div className="flex justify-between items-center py-4 font-medium text-lg">
              <span>Total</span>
              <span>${selectedSale.amount.toFixed(2)}</span>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReceiptView(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setShowReceiptView(false);
                setShowReceiptModal(true);
              }}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Refund Confirmation Dialog */}
      <Dialog open={refundConfirmOpen} onOpenChange={setRefundConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirm Refund</DialogTitle>
            <DialogDescription>
              Are you sure you want to refund this transaction? This action will:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <ul className="list-disc pl-5 text-sm space-y-2">
              <li>Mark the transaction as "Refunded"</li>
              <li>Return all items to inventory</li>
              <li>Create a record of this refund in system logs</li>
            </ul>
            
            {saleToRefund && (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Transaction ID:</span>
                  <span>{saleToRefund.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Amount:</span>
                  <span className="text-destructive font-medium">${saleToRefund.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Items:</span>
                  <span>{saleToRefund.items.length} items, {saleToRefund.items.reduce((sum, item) => sum + item.quantity, 0)} units</span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRefundConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRefund}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending ? "Processing..." : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Sales;
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { FileDown, FileText } from "lucide-react";
import { saveAs } from 'file-saver';
import { useToast } from "@/hooks/use-toast";
import { generateReportPdf } from '@/utils/pdfGenerator';

// Types for sales data
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

// Main component
const RefundReportsInsights: React.FC = () => {
  const [refundData, setRefundData] = useState<any[]>([]);
  const [productRefundData, setProductRefundData] = useState<any[]>([]);
  const [refundsByUser, setRefundsByUser] = useState<any[]>([]);
  const [totalRefunded, setTotalRefunded] = useState(0);
  const [refundCount, setRefundCount] = useState(0);
  const [averageRefund, setAverageRefund] = useState(0);
  
  // Fetch sales data
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['/api/sales'],
    refetchOnWindowFocus: false,
  });

  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Process data when available
  useEffect(() => {
    if (salesData) {
      processSalesData();
    }
  }, [salesData]);
  
  // Generate PDF report for refunds
  const generateRefundReport = () => {
    setIsGeneratingPdf(true);
    
    try {
      if (!salesData || !Array.isArray(salesData)) {
        throw new Error("No sales data available");
      }
      
      // Filter refunded transactions
      const refunds = (salesData as Sale[]).filter(sale => 
        sale.status.toLowerCase() === 'refunded'
      );
      
      if (refunds.length === 0) {
        toast({
          title: "No Data",
          description: "There are no refunded transactions to generate a report.",
          variant: "destructive",
        });
        setIsGeneratingPdf(false);
        return;
      }
      
      // Define headers for the report
      const headers = ['Transaction ID', 'Date', 'Refunded By', 'Cashier', 'Amount ($)', 'Items'];
      
      // Format data for the report
      const data = refunds.map(refund => [
        refund.id,
        refund.refundDate || 'Unknown',
        refund.refundedBy || 'Unknown',
        refund.cashier,
        refund.amount.toFixed(2),
        refund.items.length.toString()
      ]);
      
      // Additional data for the report summary
      const additionalData = {
        totalRefunded,
        refundCount,
        averageRefund
      };
      
      // Generate the PDF
      const pdfBlob = generateReportPdf(
        'Refund Transactions Report',
        headers,
        data,
        `Generated on ${format(new Date(), 'PPP')}`,
        'refunds',
        additionalData
      );
      
      // Save the PDF file
      saveAs(pdfBlob, `Refund_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "Report Generated",
        description: "Refund transactions report has been generated and downloaded.",
        variant: "default",
      });
    } catch (error) {
      // Handle error with user notification
      toast({
        title: "Error",
        description: "Failed to generate refund report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Process sales data to extract refund information
  const processSalesData = () => {
    if (!salesData || !Array.isArray(salesData)) return;
    
    // Filter refunded transactions
    const refunds = (salesData as Sale[]).filter(sale => 
      sale.status.toLowerCase() === 'refunded'
    );
    
    if (refunds.length === 0) return;

    // Calculate totals
    const total = refunds.reduce((sum, sale) => sum + sale.amount, 0);
    const avg = total / refunds.length;
    
    setTotalRefunded(total);
    setRefundCount(refunds.length);
    setAverageRefund(avg);

    // Group refunds by date
    const groupedByDate = refunds.reduce((acc, sale) => {
      const date = sale.refundDate ? format(new Date(sale.refundDate), 'yyyy-MM-dd') : 'Unknown';
      if (!acc[date]) {
        acc[date] = {
          date,
          count: 0,
          amount: 0
        };
      }
      acc[date].count += 1;
      acc[date].amount += sale.amount;
      return acc;
    }, {} as Record<string, {date: string, count: number, amount: number}>);

    setRefundData(Object.values(groupedByDate));

    // Group refunds by user
    const groupedByUser = refunds.reduce((acc, sale) => {
      const user = sale.refundedBy || 'Unknown';
      if (!acc[user]) {
        acc[user] = {
          name: user,
          count: 0,
          amount: 0
        };
      }
      acc[user].count += 1;
      acc[user].amount += sale.amount;
      return acc;
    }, {} as Record<string, {name: string, count: number, amount: number}>);

    setRefundsByUser(Object.values(groupedByUser));

    // Group refunded products
    const products: Record<string, {name: string, quantity: number, amount: number}> = {};
    
    refunds.forEach(sale => {
      sale.items.forEach(item => {
        if (!products[item.name]) {
          products[item.name] = {
            name: item.name,
            quantity: 0,
            amount: 0
          };
        }
        products[item.name].quantity += item.quantity;
        products[item.name].amount += item.subtotal;
      });
    });

    setProductRefundData(Object.values(products));
  };

  // COLORS for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7300'];

  if (isLoading) {
    return <div className="text-center py-10">Loading refund data...</div>;
  }

  if (refundCount === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No refund data available. Refunded transactions will appear here when they are processed.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with generate report button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Refund Analysis Dashboard</h3>
        <Button 
          onClick={generateRefundReport}
          disabled={isGeneratingPdf || refundCount === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 px-4 py-2 shadow-md transition-all hover:shadow-lg"
        >
          {isGeneratingPdf ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Generating...
            </>
          ) : (
            <>
              <FileText size={18} />
              Generate Refund Report
            </>
          )}
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Refunded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalRefunded.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Number of Refunds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {refundCount}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Refund Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${averageRefund.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts and Analysis */}
      <Tabs defaultValue="timeline">
        <TabsList className="mb-4">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="users">By User</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Refunds Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    width={500}
                    height={300}
                    data={refundData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" name="Number of Refunds" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="amount" name="Refund Amount ($)" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Products Refunded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={productRefundData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                        nameKey="name"
                        label={(entry) => entry.name}
                      >
                        {productRefundData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productRefundData.map((product, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-right">{product.quantity}</TableCell>
                          <TableCell className="text-right">${product.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Refunds By User</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      width={500}
                      height={300}
                      data={refundsByUser}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Number of Refunds" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Refunds</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refundsByUser.map((user, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="text-right">{user.count}</TableCell>
                          <TableCell className="text-right">${user.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RefundReportsInsights;
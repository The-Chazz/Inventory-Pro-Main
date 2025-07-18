import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

// Define interfaces for data structures
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
}

// Custom analysis types
interface CategorySummary {
  name: string;
  count: number;
  value: number;
  percentage: number;
}

interface TimeTrend {
  date: string;
  sales: number;
  items: number;
}

// Component for chart display
const AnalyticsChart: React.FC<{
  data: any[];
  type: 'bar' | 'line' | 'pie';
  dataKey: string;
  nameKey: string;
  title: string;
}> = ({ data, type, dataKey, nameKey, title }) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nameKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={dataKey} fill="#8884d8" />
            </BarChart>
          ) : type === 'line' ? (
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nameKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={dataKey} stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey={dataKey}
                nameKey={nameKey}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// Insights Component
const InsightCard: React.FC<{ title: string; insight: string }> = ({ title, insight }) => {
  return (
    <Card className="p-4 border-l-4 border-blue-500">
      <h4 className="font-medium text-gray-800">{title}</h4>
      <p className="text-sm text-gray-600 mt-1">{insight}</p>
    </Card>
  );
};

// Main AnalyticsInsights Component
interface AnalyticsInsightsProps {
  salesData: any[];
  inventoryData: any[];
  isLoading: boolean;
}

const AnalyticsInsights: React.FC<AnalyticsInsightsProps> = ({ 
  salesData: propSalesData, 
  inventoryData: propInventoryData, 
  isLoading: propIsLoading 
}) => {
  const [activeTab, setActiveTab] = useState('sales');
  const [reportPeriod, setReportPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [insights, setInsights] = useState<string[]>([]);
  
  // Use props directly
  const salesData = propSalesData;
  const inventoryItems = propInventoryData;

  // Transformations and Analysis
  const generateCategorySummary = (): CategorySummary[] => {
    if (!inventoryItems || inventoryItems.length === 0) return [];
    
    const categories: Record<string, { count: number; value: number }> = {};
    let totalValue = 0;
    
    inventoryItems.forEach(item => {
      if (!categories[item.category]) {
        categories[item.category] = { count: 0, value: 0 };
      }
      
      categories[item.category].count += 1;
      const itemValue = item.price * item.stock;
      categories[item.category].value += itemValue;
      totalValue += itemValue;
    });
    
    return Object.entries(categories).map(([name, { count, value }]) => ({
      name,
      count,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  };
  
  const generatePopularProducts = () => {
    if (!salesData || salesData.length === 0) return [];
    
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    salesData.forEach(sale => {
      sale.items.forEach((item: { productId: number; name: string; quantity: number; subtotal: number }) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { 
            name: item.name, 
            quantity: 0, 
            revenue: 0 
          };
        }
        
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.subtotal;
      });
    });
    
    return Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .map(product => ({
        name: product.name,
        quantity: product.quantity,
        revenue: product.revenue
      }))
      .slice(0, 10); // Top 10
  };
  
  const generateSalesTrend = () => {
    if (!salesData || salesData.length === 0) return [];
    
    // Determine date range based on reportPeriod
    const now = new Date();
    let startDate = new Date();
    
    if (reportPeriod === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (reportPeriod === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    // Group sales by date
    const salesByDate: Record<string, { sales: number; items: number }> = {};
    
    // Initialize dates in range (for empty dates)
    const dateRange: Date[] = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      salesByDate[dateStr] = { sales: 0, items: 0 };
      dateRange.push(new Date(currentDate));
      
      if (reportPeriod === 'week' || reportPeriod === 'month') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    
    // Fill in actual sales data
    salesData.forEach(sale => {
      const saleDate = new Date(sale.date);
      if (saleDate >= startDate && saleDate <= now) {
        const dateStr = saleDate.toISOString().split('T')[0];
        
        if (!salesByDate[dateStr]) {
          salesByDate[dateStr] = { sales: 0, items: 0 };
        }
        
        salesByDate[dateStr].sales += sale.amount;
        
        const itemCount = sale.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
        salesByDate[dateStr].items += itemCount;
      }
    });
    
    // Convert to array format for charts
    return Object.entries(salesByDate)
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        items: data.items
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };
  
  const generateInventoryStatus = () => {
    if (!inventoryItems || inventoryItems.length === 0) return [];
    
    // Group by status
    const statusGroups: Record<string, number> = {};
    
    inventoryItems.forEach(item => {
      if (!statusGroups[item.status]) {
        statusGroups[item.status] = 0;
      }
      statusGroups[item.status] += 1;
    });
    
    return Object.entries(statusGroups).map(([status, count]) => ({
      status,
      count
    }));
  };
  
  // Generate business insights
  useEffect(() => {
    if (!inventoryItems || !salesData) return;
    
    const newInsights: string[] = [];
    
    // Inventory insights
    const categorySummary = generateCategorySummary();
    if (categorySummary.length > 0) {
      const topCategory = categorySummary[0];
      newInsights.push(`Your inventory is heavily weighted towards ${topCategory.name} at ${topCategory.percentage.toFixed(1)}% of total inventory value.`);
    }
    
    const inventoryStatus = generateInventoryStatus();
    const lowStockCount = inventoryStatus.find(i => i.status === 'Low Stock')?.count || 0;
    if (lowStockCount > 0) {
      newInsights.push(`${lowStockCount} products are currently at low stock levels and should be reordered soon.`);
    }
    
    // Sales insights
    const popularProducts = generatePopularProducts();
    if (popularProducts.length > 0) {
      const topProduct = popularProducts[0];
      newInsights.push(`${topProduct.name} is your best-selling product with ${topProduct.quantity} units sold.`);
    }
    
    const salesTrend = generateSalesTrend();
    if (salesTrend.length > 1) {
      const latestSales = salesTrend[salesTrend.length - 1].sales;
      const previousSales = salesTrend[salesTrend.length - 2].sales;
      
      const percentChange = previousSales > 0 
        ? ((latestSales - previousSales) / previousSales) * 100 
        : 0;
      
      if (percentChange > 10) {
        newInsights.push(`Sales are trending up by ${percentChange.toFixed(1)}% compared to the previous period.`);
      } else if (percentChange < -10) {
        newInsights.push(`Sales are down by ${Math.abs(percentChange).toFixed(1)}% compared to the previous period.`);
      }
    }
    
    setInsights(newInsights);
  }, [inventoryItems, salesData, reportPeriod]);
  
  // Use the loading state from props
  const dataIsLoading = propIsLoading;
  
  if (dataIsLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-blue-600 animate-pulse"></div>
          <div className="w-4 h-4 rounded-full bg-blue-600 animate-pulse delay-75"></div>
          <div className="w-4 h-4 rounded-full bg-blue-600 animate-pulse delay-150"></div>
          <span className="text-gray-800 font-medium">Loading analytics data...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Analytics & Insights</h2>
        <div className="flex space-x-2">
          <Button 
            variant={reportPeriod === 'week' ? 'default' : 'outline'} 
            onClick={() => setReportPeriod('week')}
            size="sm"
          >
            Last Week
          </Button>
          <Button 
            variant={reportPeriod === 'month' ? 'default' : 'outline'} 
            onClick={() => setReportPeriod('month')}
            size="sm"
          >
            Last Month
          </Button>
          <Button 
            variant={reportPeriod === 'year' ? 'default' : 'outline'} 
            onClick={() => setReportPeriod('year')}
            size="sm"
          >
            Last Year
          </Button>
        </div>
      </div>
      
      {/* Insights Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.length > 0 ? (
          insights.map((insight, index) => (
            <InsightCard 
              key={index} 
              title={`Business Insight ${index + 1}`} 
              insight={insight} 
            />
          ))
        ) : (
          <Card className="p-4 col-span-2">
            <p className="text-gray-500">Not enough data to generate insights yet.</p>
          </Card>
        )}
      </div>
      
      {/* Charts Section */}
      <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as 'sales' | 'inventory')}>
        <TabsList className="mb-6">
          <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsChart 
              data={generateSalesTrend()} 
              type="line"
              dataKey="sales"
              nameKey="date"
              title="Sales Trend"
            />
            <AnalyticsChart 
              data={generatePopularProducts()} 
              type="bar"
              dataKey="quantity"
              nameKey="name"
              title="Top-Selling Products"
            />
          </div>
        </TabsContent>
        
        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsChart 
              data={generateCategorySummary()} 
              type="pie"
              dataKey="value"
              nameKey="name"
              title="Inventory Value by Category"
            />
            <AnalyticsChart 
              data={generateInventoryStatus()} 
              type="bar"
              dataKey="count"
              nameKey="status"
              title="Inventory Status"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsInsights;
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

// Interfaces for data types
interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  priceUnit: string;
  costPrice?: number;
  profitMargin?: number;
  profitType?: 'percentage' | 'fixed';
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

// Top profitable items interface
interface ProfitableItem {
  name: string;
  profit: number;
  profitMargin: number;
}

// Date-based profit data
interface ProfitTrend {
  date: string;
  profit: number;
  sales: number;
}

// Category profit data
interface CategoryProfit {
  category: string;
  profit: number;
  percentage: number;
}

// Color palette
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

interface ProfitReportsInsightsProps {
  salesData: any[];
  inventoryData: any[];
  isLoading: boolean;
}

const ProfitReportsInsights: React.FC<ProfitReportsInsightsProps> = ({
  salesData: propSalesData,
  inventoryData: propInventoryData,
  isLoading: propIsLoading
}) => {
  // Use provided data from props instead of fetching
  const inventoryItems = propInventoryData;
  const salesData = propSalesData;

  // State for derived data
  const [mostProfitableItems, setMostProfitableItems] = useState<ProfitableItem[]>([]);
  const [profitByCategory, setProfitByCategory] = useState<CategoryProfit[]>([]);
  const [profitTrends, setProfitTrends] = useState<ProfitTrend[]>([]);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [averageProfitMargin, setAverageProfitMargin] = useState<number>(0);

  // Function to calculate item profit
  const calculateItemProfit = (item: InventoryItem, quantitySold: number) => {
    if (!item.costPrice) return { profit: 0, margin: 0 };
    const profit = (item.price - item.costPrice) * quantitySold;
    const margin = item.costPrice > 0 ? ((item.price - item.costPrice) / item.costPrice) * 100 : 0;
    return { profit, margin };
  };

  // Calculate profits from sales data and inventory cost data
  useEffect(() => {
    if (!salesData.length || !inventoryItems.length) return;

    const itemProfits: Record<number, { sales: number, profit: number, name: string, margin: number }> = {};
    const categoryProfits: Record<string, { profit: number, sales: number }> = {};
    const dailyProfits: Record<string, { profit: number, sales: number }> = {};
    let totalProfitSum = 0;
    let profitableItemCount = 0;
    let marginSum = 0;

    // Process sales data to calculate profits
    salesData.forEach(sale => {
      const saleDate = new Date(sale.date).toISOString().split('T')[0];
      
      if (!dailyProfits[saleDate]) {
        dailyProfits[saleDate] = { profit: 0, sales: 0 };
      }
      dailyProfits[saleDate].sales += sale.amount;

      // Process each item in the sale
      sale.items.forEach((item: { productId: number; quantity: number; price: number; subtotal: number }) => {
        const inventoryItem = inventoryItems.find(invItem => invItem.id === item.productId);
        
        if (inventoryItem && inventoryItem.costPrice) {
          const { profit, margin } = calculateItemProfit(inventoryItem, item.quantity);
          
          // Update item profits
          if (!itemProfits[inventoryItem.id]) {
            itemProfits[inventoryItem.id] = { 
              sales: 0, 
              profit: 0, 
              name: inventoryItem.name,
              margin: 0
            };
          }
          
          itemProfits[inventoryItem.id].sales += item.quantity;
          itemProfits[inventoryItem.id].profit += profit;
          itemProfits[inventoryItem.id].margin = margin;
          
          // Update category profits
          if (!categoryProfits[inventoryItem.category]) {
            categoryProfits[inventoryItem.category] = { profit: 0, sales: 0 };
          }
          categoryProfits[inventoryItem.category].profit += profit;
          categoryProfits[inventoryItem.category].sales += item.subtotal;
          
          // Update daily profits
          dailyProfits[saleDate].profit += profit;
          
          // Update total profit
          totalProfitSum += profit;
          
          // Count this item for average margin calculation
          profitableItemCount++;
          marginSum += margin;
        }
      });
    });

    // Convert to array and sort for most profitable items
    const profitableItems = Object.values(itemProfits)
      .map(item => ({
        name: item.name,
        profit: parseFloat(item.profit.toFixed(2)),
        profitMargin: parseFloat(item.margin.toFixed(1))
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
    
    // Calculate profit by category with percentages
    const totalCategoryProfit = Object.values(categoryProfits).reduce((sum, cat) => sum + cat.profit, 0);
    const categoryProfitArray = Object.entries(categoryProfits)
      .map(([category, data]) => ({
        category,
        profit: parseFloat(data.profit.toFixed(2)),
        percentage: parseFloat(((data.profit / totalCategoryProfit) * 100).toFixed(1))
      }))
      .sort((a, b) => b.profit - a.profit);
    
    // Create profit trends array
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();
    
    const profitTrendsArray = last7Days.map(date => {
      const dayData = dailyProfits[date] || { profit: 0, sales: 0 };
      return {
        date: date,
        profit: parseFloat(dayData.profit.toFixed(2)),
        sales: parseFloat(dayData.sales.toFixed(2))
      };
    });

    // Calculate average profit margin
    const avgMargin = profitableItemCount > 0 ? marginSum / profitableItemCount : 0;

    setMostProfitableItems(profitableItems);
    setProfitByCategory(categoryProfitArray);
    setProfitTrends(profitTrendsArray);
    setTotalProfit(parseFloat(totalProfitSum.toFixed(2)));
    setAverageProfitMargin(parseFloat(avgMargin.toFixed(1)));
  }, [salesData, inventoryItems]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">From all sales with cost data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageProfitMargin}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across all products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Most Profitable Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">
              {mostProfitableItems.length > 0 ? mostProfitableItems[0].name : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mostProfitableItems.length > 0 ? `$${mostProfitableItems[0].profit.toFixed(2)} profit` : 'No data available'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products with Cost Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryItems.filter(item => item.costPrice !== undefined).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Out of {inventoryItems.length} total products</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profit by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={profitByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="profit"
                  nameKey="category"
                  label={({ percent }) => 
                    percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                  }
                >
                  {profitByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value}`} />
                {/* Legend removed per user request */}
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Trends (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profitTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value) => `$${value}`} />
                {/* Legend removed per user request */}
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                  name="Profit"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#82ca9d" 
                  name="Sales"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Most Profitable Items */}
      <Card>
        <CardHeader>
          <CardTitle>Most Profitable Items</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={mostProfitableItems}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100}
                tick={{ fontSize: 0 }} 
              />
              <Tooltip 
                formatter={(value) => `$${value}`} 
                labelFormatter={(label) => label}
              />
              {/* Legend removed per user request */}
              <Bar dataKey="profit" name="Profit" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Inventory Items Missing Cost Data */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items Without Cost Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventoryItems
                  .filter(item => item.costPrice === undefined)
                  .slice(0, 5)
                  .map(item => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.price.toFixed(2)}</td>
                    </tr>
                  ))}
                {inventoryItems.filter(item => item.costPrice === undefined).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      All inventory items have cost data. Great job!
                    </td>
                  </tr>
                )}
                {inventoryItems.filter(item => item.costPrice === undefined).length > 5 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-blue-500">
                      {inventoryItems.filter(item => item.costPrice === undefined).length - 5} more items without cost data...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitReportsInsights;
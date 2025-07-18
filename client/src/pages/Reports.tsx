import Header from "@/components/Header";
import { useAppContext } from "@/context/AppContext";
import AnalyticsInsights from "@/components/AnalyticsInsights";
import LossReportsInsights from "@/components/LossReportsInsights";
import ProfitReportsInsights from "@/components/ProfitReportsInsights";
import RefundReportsInsights from "@/components/RefundReportsInsights";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  SalesTrendChart, 
  InventoryLevelsChart, 
  ProductSalesChart,
  RefundAnalysisChart,
  LossTrackingChart,
  CashierPerformanceChart,
  CategoryBreakdownChart
} from "@/components/ChartComponents";
import {
  transformSalesData,
  transformInventoryData,
  transformProductSalesData,
  transformLossData,
  transformCashierData,
  transformCategoryData
} from "@/utils/chartDataUtils";

const Reports: React.FC = () => {
  const { currentPage } = useAppContext();
  const [activeTab, setActiveTab] = useState("analytics");

  // Fetch sales data
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['/api/sales'],
    queryFn: async () => {
      const response = await fetch('/api/sales');
      if (!response.ok) throw new Error('Failed to fetch sales data');
      return response.json();
    },
  });

  // Fetch inventory data
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['/api/inventory'],
    queryFn: async () => {
      const response = await fetch('/api/inventory');
      if (!response.ok) throw new Error('Failed to fetch inventory data');
      return response.json();
    },
  });

  // Fetch low stock items
  const { data: lowStockData, isLoading: lowStockLoading } = useQuery({
    queryKey: ['/api/alerts/low-stock'],
    queryFn: async () => {
      const response = await fetch('/api/alerts/low-stock');
      if (!response.ok) throw new Error('Failed to fetch low stock data');
      return response.json();
    },
  });

  // Fetch loss data
  const { data: lossData, isLoading: lossLoading } = useQuery({
    queryKey: ['/api/losses'],
    queryFn: async () => {
      const response = await fetch('/api/losses');
      if (!response.ok) throw new Error('Failed to fetch loss data');
      return response.json();
    },
  });

  // Transform data for charts
  const salesChartData = salesData ? transformSalesData(salesData) : [];
  const inventoryChartData = inventoryData ? transformInventoryData(inventoryData) : [];
  const productSalesData = salesData ? transformProductSalesData(salesData) : [];
  const lossChartData = lossData ? transformLossData(lossData) : [];
  const cashierData = salesData ? transformCashierData(salesData) : [];
  const categoryData = inventoryData ? transformCategoryData(inventoryData) : [];
  
  return (
    <>
      <Header title="Reports & Analytics" />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <Tabs
              defaultValue={activeTab}
              onValueChange={(value) => setActiveTab(value)}
              className="w-full"
            >
              <TabsList className="mb-6">
                <TabsTrigger value="analytics">Analytics & Insights</TabsTrigger>
                <TabsTrigger value="sales">Sales Charts</TabsTrigger>
                <TabsTrigger value="inventory">Inventory Charts</TabsTrigger>
                <TabsTrigger value="profits">Profit Insights</TabsTrigger>
                <TabsTrigger value="losses">Loss Tracking</TabsTrigger>
              </TabsList>
              
              <TabsContent value="analytics">
                <AnalyticsInsights 
                  salesData={salesData || []}
                  inventoryData={inventoryData || []}
                  isLoading={salesLoading || inventoryLoading}
                />
              </TabsContent>
              
              <TabsContent value="sales">
                <Card className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Reports & Analytics</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sales Trend Chart - Full Width */}
                    <div className="lg:col-span-2">
                      {salesLoading ? (
                        <div className="h-80 flex items-center justify-center">
                          <p>Loading sales data...</p>
                        </div>
                      ) : (
                        <SalesTrendChart 
                          data={salesChartData} 
                          title="Sales Trend Analysis" 
                          description="Interactive chart showing daily sales trends with adjustable time periods"
                        />
                      )}
                    </div>
                    
                    {/* Product Sales Distribution */}
                    <div>
                      {salesLoading ? (
                        <div className="h-80 flex items-center justify-center">
                          <p>Loading product data...</p>
                        </div>
                      ) : (
                        <ProductSalesChart 
                          data={productSalesData} 
                          title="Top Selling Products" 
                          description="Distribution of sales by product based on quantity sold"
                        />
                      )}
                    </div>
                    
                    {/* Cashier Performance Chart */}
                    <div>
                      {salesLoading ? (
                        <div className="h-80 flex items-center justify-center">
                          <p>Loading cashier data...</p>
                        </div>
                      ) : (
                        <CashierPerformanceChart 
                          data={cashierData} 
                          title="Cashier Performance" 
                          description="Comparison of performance metrics across all cashiers"
                        />
                      )}
                    </div>
                    
                    {/* Refund Analysis Chart - Special Styling */}
                    <div className="lg:col-span-2 bg-red-50 rounded-lg p-4">
                      {salesLoading ? (
                        <div className="h-80 flex items-center justify-center">
                          <p>Loading refund data...</p>
                        </div>
                      ) : (
                        <RefundAnalysisChart 
                          data={salesData || []} 
                          title="Refund Analysis" 
                          description="Detailed breakdown of refunds and their impact on revenue"
                        />
                      )}
                    </div>
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="inventory">
                <Card className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Analytics</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Stock Levels Chart */}
                    <div className="lg:col-span-2">
                      {inventoryLoading ? (
                        <div className="h-80 flex items-center justify-center">
                          <p>Loading inventory data...</p>
                        </div>
                      ) : (
                        <InventoryLevelsChart 
                          data={inventoryChartData} 
                          title="Inventory Stock Levels" 
                          description="Interactive visualization of current stock levels with sorting options"
                        />
                      )}
                    </div>
                    
                    {/* Category Breakdown Chart */}
                    <div>
                      {inventoryLoading ? (
                        <div className="h-80 flex items-center justify-center">
                          <p>Loading category data...</p>
                        </div>
                      ) : (
                        <CategoryBreakdownChart 
                          data={categoryData} 
                          title="Category Breakdown" 
                          description="Inventory distribution across product categories"
                        />
                      )}
                    </div>
                    
                    {/* Low Stock Items Chart */}
                    <div className="bg-amber-50 rounded-lg p-4">
                      {lowStockLoading ? (
                        <div className="h-80 flex items-center justify-center">
                          <p>Loading low stock data...</p>
                        </div>
                      ) : (
                        <InventoryLevelsChart 
                          data={lowStockData || []} 
                          title="Low Stock Alert" 
                          description="Items at or below reorder threshold requiring attention"
                        />
                      )}
                    </div>
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="profits">
                <Card className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Profit Reports & Insights</h3>
                  <ProfitReportsInsights 
                    salesData={salesData || []}
                    inventoryData={inventoryData || []}
                    isLoading={salesLoading || inventoryLoading}
                  />
                </Card>
              </TabsContent>
              
              <TabsContent value="losses">
                <Card className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Loss Tracking Analytics</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Loss Tracking Chart */}
                    <div className="lg:col-span-2">
                      {lossLoading ? (
                        <div className="h-80 flex items-center justify-center">
                          <p>Loading loss data...</p>
                        </div>
                      ) : (
                        <LossTrackingChart 
                          data={lossChartData} 
                          title="Loss Trends & Categories" 
                          description="Interactive visualization of losses with time series and category breakdown views"
                        />
                      )}
                    </div>
                    
                    {/* Keep the existing insights component as it may have useful functionality */}
                    <div className="lg:col-span-2">
                      <h4 className="text-md font-medium text-gray-800 mb-2">Detailed Loss Insights</h4>
                      <LossReportsInsights 
                        lossesData={lossData || []}
                        inventoryData={inventoryData || []}
                        isLoading={lossLoading || inventoryLoading}
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>
              

            </Tabs>
          </div>
        </div>
      </main>
    </>
  );
};

export default Reports;

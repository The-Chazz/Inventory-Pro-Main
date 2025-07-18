import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { format } from 'date-fns';
import { saveAs } from 'file-saver';
import { useToast } from "@/hooks/use-toast";
import { generateReportPdf } from '@/utils/pdfGenerator';
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

interface LossItem {
  id: string;
  inventoryItemId: number;
  itemName: string;
  quantity: number;
  reason: string;
  date: string;
  recordedBy: string;
  value: number;
}

interface CategorySummary {
  name: string;
  count: number;
  value: number;
  percentage: number;
}

interface TopItemData {
  name: string;
  count: number;
  value: number;
}

interface ReasonData {
  name: string;
  count: number;
  value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#6C8EAD'];

interface LossReportsInsightsProps {
  lossesData: any[];
  inventoryData: any[];
  isLoading: boolean;
}

const LossReportsInsights: React.FC<LossReportsInsightsProps> = ({
  lossesData: propLossesData,
  inventoryData: propInventoryData,
  isLoading: propIsLoading
}) => {
  const [topItems, setTopItems] = useState<TopItemData[]>([]);
  const [reasonDistribution, setReasonDistribution] = useState<ReasonData[]>([]);
  const [totalLosses, setTotalLosses] = useState({ count: 0, value: 0 });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();

  // Use props data instead of fetching
  const lossesData = propLossesData;
  const inventoryData = propInventoryData;
  const isLoading = propIsLoading;
  
  // Generate PDF report for loss data
  const generateLossReport = () => {
    setIsGeneratingPdf(true);
    
    try {
      if (!lossesData || !Array.isArray(lossesData) || lossesData.length === 0) {
        toast({
          title: "No Data",
          description: "There are no loss records to generate a report.",
          variant: "destructive",
        });
        setIsGeneratingPdf(false);
        return;
      }
      
      // Define headers for the report
      const headers = ['ID', 'Date', 'Item Name', 'Quantity', 'Reason', 'Recorded By', 'Value ($)'];
      
      // Format data for the report
      const rows = lossesData.map(loss => [
        loss.id,
        loss.date,
        loss.itemName,
        loss.quantity.toString(),
        loss.reason,
        loss.recordedBy,
        loss.value.toFixed(2)
      ]);
      
      // Additional data for the report summary
      const additionalData = {
        lossCount: totalLosses.count,
        totalValue: totalLosses.value,
        averageLoss: totalLosses.count > 0 ? totalLosses.value / totalLosses.count : 0,
        topReasons: reasonDistribution.slice(0, 3).map(r => r.name).join(', ')
      };
      
      // Generate the PDF
      const pdfBlob = generateReportPdf(
        'Inventory Loss Report',
        headers,
        rows,
        `Generated on ${format(new Date(), 'PPP')}`,
        'losses',
        additionalData
      );
      
      // Save the PDF file
      saveAs(pdfBlob, `Loss_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "Report Generated",
        description: "Loss report has been generated and downloaded.",
        variant: "default",
      });
    } catch (error) {
      // Handle error with user notification
      toast({
        title: "Error",
        description: "Failed to generate loss report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (lossesData) {
      processLossData(lossesData);
    }
  }, [lossesData]);

  const processLossData = (losses: LossItem[]) => {
    // Calculate total losses
    const totalCount = losses.length;
    const totalValue = losses.reduce((sum, item) => sum + item.value, 0);
    setTotalLosses({ count: totalCount, value: totalValue });

    // Process top items with most losses
    const itemsMap = new Map<string, { count: number; value: number }>();
    
    losses.forEach(loss => {
      const existing = itemsMap.get(loss.itemName) || { count: 0, value: 0 };
      itemsMap.set(loss.itemName, {
        count: existing.count + 1,
        value: existing.value + loss.value,
      });
    });

    const topItemsArray = Array.from(itemsMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        value: data.value
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 items

    setTopItems(topItemsArray);

    // Process reasons for losses
    const reasonsMap = new Map<string, { count: number; value: number }>();
    
    losses.forEach(loss => {
      const existing = reasonsMap.get(loss.reason) || { count: 0, value: 0 };
      reasonsMap.set(loss.reason, {
        count: existing.count + 1,
        value: existing.value + loss.value,
      });
    });

    const reasonsArray = Array.from(reasonsMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        value: data.value
      }))
      .sort((a, b) => b.count - a.count);

    setReasonDistribution(reasonsArray);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-500">
          <i className="fas fa-spinner fa-spin mr-2"></i>
          Loading loss data...
        </div>
      </div>
    );
  }

  // Error handling moved to the parent component

  return (
    <div className="space-y-6">
      {/* Header with generate report button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Loss Analysis Dashboard</h3>
        <Button 
          onClick={generateLossReport}
          disabled={isGeneratingPdf || !lossesData || lossesData.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 px-4 py-2 shadow-md transition-all hover:shadow-lg"
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-1" />
              Generate Loss Report
            </>
          )}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4 bg-gradient-to-br from-red-50 to-white border border-red-100">
          <h3 className="font-medium text-red-800 mb-1">Total Lost Items</h3>
          <p className="text-3xl font-bold text-red-600">{totalLosses.count}</p>
          <p className="text-sm text-gray-500 mt-1">Number of recorded loss incidents</p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-white border border-orange-100">
          <h3 className="font-medium text-orange-800 mb-1">Total Value Loss</h3>
          <p className="text-3xl font-bold text-orange-600">${totalLosses.value.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">Financial impact of inventory losses</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border border-blue-100">
          <h3 className="font-medium text-blue-800 mb-1">Average Loss Value</h3>
          <p className="text-3xl font-bold text-blue-600">
            ${totalLosses.count > 0 ? (totalLosses.value / totalLosses.count).toFixed(2) : '0.00'}
          </p>
          <p className="text-sm text-gray-500 mt-1">Average value per loss incident</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top 5 Items with Most Losses */}
        <Card className="p-4 border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Most Frequent Losses</h3>
          
          {topItems.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topItems}
                  margin={{ top: 5, right: 30, left: 25, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
                    tick={{ fontSize: 11 }}
                    tickMargin={10}
                    interval={0}
                  />
                  <YAxis width={60} />
                  <Tooltip 
                    formatter={(value, name) => [value, name === 'count' ? 'Incidents' : 'Value ($)']}
                    labelFormatter={(label) => `Item: ${label}`}
                  />
                  {/* Legend removed as requested */}
                  <Bar dataKey="count" name=" " fill="#FF8042" />
                  <Bar dataKey="value" name=" " fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center p-6 text-gray-500">
              <p>No loss data available yet</p>
            </div>
          )}
        </Card>

        {/* Reasons for Losses */}
        <Card className="p-4 border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Loss Reasons Distribution</h3>
          
          {reasonDistribution.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reasonDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    labelLine={false}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {reasonDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any, props: any) => {
                      const percentage = totalLosses.count > 0 ? ((Number(value) / totalLosses.count) * 100).toFixed(0) : '0';
                      return [`${value} incidents (${percentage}%)`, props.payload.name];
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center p-6 text-gray-500">
              <p>No loss reason data available yet</p>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4 border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Loss Prevention Recommendations</h3>
        
        <div className="space-y-4">
          {topItems.length > 0 ? (
            <>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Focus Areas for Loss Prevention</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {topItems.slice(0, 3).map((item, index) => (
                    <li key={index}>
                      <span className="font-medium">{item.name}</span>: Consider adjusting inventory levels, 
                      checking storage conditions, or supplier quality for this item.
                    </li>
                  ))}
                </ul>
              </div>

              {reasonDistribution.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Address Common Reasons</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {reasonDistribution.slice(0, 2).map((reason, index) => (
                      <li key={index}>
                        <span className="font-medium">{reason.name}</span>: This accounts for 
                        approximately {(reason.count / totalLosses.count * 100).toFixed(0)}% of losses.
                        Review procedures related to this cause.
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">Financial Impact Reduction</h4>
                <p>
                  Focusing on the top items could potentially reduce loss value by up to
                  {' '}{((topItems.slice(0, 3).reduce((sum, item) => sum + item.value, 0) / totalLosses.value) * 100).toFixed(0)}%.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center p-6 text-gray-500">
              <p>Not enough loss data to generate recommendations</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LossReportsInsights;
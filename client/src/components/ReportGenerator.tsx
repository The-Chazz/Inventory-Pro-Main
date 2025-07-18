import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { generateReportPdf } from '@/utils/pdfGenerator';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';

interface ReportItem {
  id: number | string;
  name?: string;
  title?: string;
  date?: string;
}

interface ReportGeneratorProps {
  reportType: string;
  reportName: string;
  endpoint: string;
  description: string;
  onComplete?: () => void;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  reportType,
  reportName,
  endpoint,
  description,
  onComplete
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Fetch data from the API with a unique query key for each report type and name
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [endpoint, reportType, reportName], // Include reportType to differentiate between reports with same endpoint
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${reportName} data`);
      }
      return response.json();
    },
    // Don't fetch on mount, only when generate is clicked
    enabled: false,
    staleTime: 0, // Always get fresh data for each report
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  const generateReport = async () => {
    if (isGenerating) return; // Prevent multiple concurrent generation attempts
    
    setIsGenerating(true);
    try {
      // Refetch data with error handling
      try {
        await refetch();
      } catch (fetchError) {
        // Data fetch error with user notification
        toast({
          title: 'Data Fetch Error',
          description: `Could not retrieve the latest data for ${reportName}.`,
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }
      
      // Validate data with better debugging
      if (!data) {
        // This means the query didn't return any data at all
        toast({
          title: 'No Data Available',
          description: `There is no data available to generate the ${reportName}. Please try again.`,
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }
      
      // Simple check to make sure we have an array with some content
      if (!Array.isArray(data) || data.length === 0) {
        toast({
          title: 'Empty Dataset',
          description: `No records found for the ${reportName}. The data source may be empty.`,
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }
      
      // Format for export
      const headers = determineHeaders(reportType);
      
      // Make sure data is appropriate for this report type
      // Create a shallow copy of the data to avoid reference issues
      const processedData = [...data]; 
      const filteredData = filterDataByReportType(processedData, reportType);
      
      // Check if filtering removed all data
      if (filteredData.length === 0) {
        toast({
          title: 'No Matching Data',
          description: `No matching records found for ${reportName} of type "${reportType}".`,
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }
      
      const rows = formatDataForExport(filteredData, reportType);
      
      // Check if we have rows to export
      if (rows.length === 0) {
        toast({
          title: 'No Data to Export',
          description: `There are no records available for the ${reportName}.`,
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }
      
      // Create file name with current date
      const fileName = `${reportName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      // Calculate additional data for report
      const additionalData = calculateAdditionalData(data, reportType);
      
      // Generate PDF using our utility function
      const pdfBlob = generateReportPdf(
        reportName,
        headers,
        rows.map(row => row.map(cell => String(cell))), // Convert all cells to strings
        `Generated on ${format(new Date(), 'PPpp')}`,
        reportType,
        additionalData
      );
      
      // Save the PDF file
      try {
        saveAs(pdfBlob, fileName);
        
        // Show success message
        toast({
          title: 'Report Generated',
          description: `${reportName} has been downloaded as PDF.`,
          variant: 'default',
        });
        
        if (onComplete) onComplete();
      } catch (saveError) {
        toast({
          title: 'Download Error',
          description: `The report was generated but could not be downloaded: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: `Failed to generate ${reportName}. ${err instanceof Error ? err.message : 'Please try again.'}`,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Calculate additional summary data for different report types
  const calculateAdditionalData = (data: any[], type: string): any => {
    if (!Array.isArray(data)) {
      // Silently handle invalid data with a fallback
      return {}; // Return empty object to prevent errors
    }
    
    try {
      switch (type) {
        case 'sales':
          {
            const filteredData = data.filter(sale => sale && typeof sale === 'object');
            
            // Calculate total sales amount with safe parsing
            const totalSales = filteredData.reduce((sum, sale) => {
              let amount = 0;
              
              // Try different ways to safely get the amount
              if (typeof sale?.amount === 'number') {
                amount = sale.amount;
              } else if (typeof sale?.amount === 'string') {
                amount = parseFloat(sale.amount) || 0;
              }
              
              return sum + amount;
            }, 0);
            
            // Calculate total items sold with safe array access
            const totalItems = filteredData.reduce((sum, sale) => {
              let itemCount = 0;
              
              // Make sure items is an array before counting
              if (Array.isArray(sale?.items)) {
                itemCount = sale.items.length;
              }
              
              return sum + itemCount;
            }, 0);
            
            return {
              totalSales: Number(totalSales.toFixed(2)), // Format to 2 decimal places
              totalItems,
              saleCount: filteredData.length
            };
          }
        case 'inventory':
          {
            const filteredData = data.filter(item => item && typeof item === 'object');
            
            // Count unique categories with safe property access
            const categorySet = new Set();
            filteredData.forEach(item => {
              if (item?.category) categorySet.add(item.category);
            });
            
            // Calculate total inventory value with safe property access and parsing
            const totalValue = filteredData.reduce((sum, item) => {
              let price = 0;
              let stock = 0;
              
              // Get price safely
              if (typeof item?.price === 'number') {
                price = item.price;
              } else if (typeof item?.price === 'string') {
                price = parseFloat(item.price) || 0;
              }
              
              // Get stock safely
              if (typeof item?.stock === 'number') {
                stock = item.stock;
              } else if (typeof item?.stock === 'string') {
                stock = parseInt(item.stock) || 0;
              }
              
              return sum + (price * stock);
            }, 0);
            
            return {
              totalItems: filteredData.length,
              totalValue: Number(totalValue.toFixed(2)), // Format to 2 decimal places
              categories: categorySet.size
            };
          }
        case 'low-stock':
          {
            const filteredData = data.filter(item => item && typeof item === 'object');
            
            // Count unique categories with safe property access
            const categorySet = new Set();
            filteredData.forEach(item => {
              if (item?.category) categorySet.add(item.category);
            });
            
            // Count items with zero stock (urgent items) with safe parsing
            const urgentItems = filteredData.filter(item => {
              let stock = -1; // Default to -1 to avoid false positives
              
              // Get stock value safely
              if (typeof item?.stock === 'number') {
                stock = item.stock;
              } else if (typeof item?.stock === 'string') {
                const parsed = parseInt(item.stock);
                if (!isNaN(parsed)) stock = parsed;
              }
              
              return stock === 0; // Only count actual zero stock
            }).length;
            
            return {
              lowStockCount: filteredData.length,
              urgentItems,
              categories: categorySet.size
            };
          }
        case 'refunds':
          {
            // Identify refunded transactions with safe property access
            const filteredData = data.filter(sale => {
              return sale && 
                typeof sale === 'object' && 
                sale?.status && 
                typeof sale.status === 'string' &&
                sale.status.toLowerCase() === 'refunded';
            });
            
            // Calculate total refund amount with safe parsing
            const totalRefunded = filteredData.reduce((sum, refund) => {
              let amount = 0;
              
              // Get amount safely
              if (typeof refund?.amount === 'number') {
                amount = refund.amount;
              } else if (typeof refund?.amount === 'string') {
                amount = parseFloat(refund.amount) || 0;
              }
              
              return sum + amount;
            }, 0);
            
            // Calculate average with protection against division by zero
            const refundCount = filteredData.length;
            const averageRefund = refundCount > 0 
              ? Number((totalRefunded / refundCount).toFixed(2)) 
              : 0;
            
            return {
              totalRefunded: Number(totalRefunded.toFixed(2)),
              refundCount,
              averageRefund
            };
          }
        case 'losses':
          {
            const filteredData = data.filter(loss => loss && typeof loss === 'object');
            
            // Calculate total loss value with safe property access and parsing
            const totalValue = filteredData.reduce((sum, loss) => {
              let value = 0;
              
              // Get value safely
              if (typeof loss?.value === 'number') {
                value = loss.value;
              } else if (typeof loss?.value === 'string') {
                value = parseFloat(loss.value) || 0;
              }
              
              return sum + value;
            }, 0);
            
            // Count unique reasons with safe property access
            const reasonSet = new Set();
            filteredData.forEach(loss => {
              if (loss?.reason) reasonSet.add(loss.reason);
            });
            
            return {
              lossCount: filteredData.length,
              totalValue: Number(totalValue.toFixed(2)), // Format to 2 decimal places
              reasonCount: reasonSet.size
            };
          }
        default:
          // For any other report type, return basic count statistics
          return {
            recordCount: Array.isArray(data) ? data.length : 0,
            reportType: reportType || 'unknown'
          };
      }
    } catch (error) {
      // Silently handle errors in additional data calculation with a fallback
      return {}; // Return empty object to prevent errors
    }
  };

  const determineHeaders = (type: string): string[] => {
    switch (type) {
      case 'sales':
        return ['ID', 'Date', 'Cashier', 'Amount ($)', 'Status'];
      case 'inventory':
        return ['ID', 'SKU', 'Name', 'Category', 'Stock', 'Unit', 'Price ($)', 'Status'];
      case 'losses':
        return ['ID', 'Date', 'Item Name', 'Quantity', 'Reason', 'Recorded By', 'Value ($)'];
      case 'low-stock':
        return ['ID', 'SKU', 'Name', 'Category', 'Current Stock', 'Threshold', 'Status'];
      case 'refunds':
        return ['Transaction ID', 'Refund Date', 'Refunded By', 'Original Cashier', 'Amount ($)', 'Items'];
      default:
        return ['ID', 'Name', 'Value'];
    }
  };

  // Filter data based on report type - with more lenient checks
  const filterDataByReportType = (data: any[], type: string): any[] => {
    if (!Array.isArray(data)) {
      return []; // Return empty array for invalid data
    }
    
    // No data to filter
    if (data.length === 0) {
      return data;
    }
    
    try {
      // First pass - just return all valid objects
      const validRecords = data.filter(record => record && typeof record === 'object');
      
      // Special handling for refunds only - all other report types get all valid data
      if (type === 'refunds') {
        // Only select records where status is 'refunded'
        return validRecords.filter(sale => 
          sale.status && 
          sale.status.toString().toLowerCase() === 'refunded'
        );
      }
      
      // For all other report types, just return the valid records
      return validRecords;
      
    } catch (error) {
      // Return original data if filtering fails
      return data;
    }
  };

  const formatDataForExport = (data: any[], type: string): any[][] => {
    if (!Array.isArray(data)) {
      // Handle invalid data gracefully with a fallback
      return []; // Return empty array to prevent errors
    }
    
    try {
      switch (type) {
        case 'sales':
          return data.map(sale => {
            // More robust property access with error handling
            try {
              return [
                sale?.id?.toString() || 'N/A',
                sale?.date?.toString() || 'N/A',
                sale?.cashier?.toString() || 'N/A',
                typeof sale?.amount === 'number' 
                  ? sale.amount.toFixed(2) 
                  : (parseFloat(sale?.amount) || 0).toFixed(2),
                sale?.status?.toString() || 'N/A'
              ];
            } catch (err) {
              // Return a default row if any property fails
              return ['N/A', 'N/A', 'N/A', '0.00', 'N/A'];
            }
          });
        case 'inventory':
          return data.map(item => {
            // More robust property access with error handling
            try {
              return [
                item?.id?.toString() || 'N/A',
                item?.sku?.toString() || 'N/A',
                item?.name?.toString() || 'N/A',
                item?.category?.toString() || 'N/A',
                typeof item?.stock === 'number' 
                  ? item.stock.toString() 
                  : (parseInt(item?.stock) || 0).toString(),
                item?.unit?.toString() || 'ea',
                typeof item?.price === 'number' 
                  ? item.price.toFixed(2) 
                  : (parseFloat(item?.price) || 0).toFixed(2),
                item?.status?.toString() || 'Active'
              ];
            } catch (err) {
              // Return a default row if any property fails
              return ['N/A', 'N/A', 'N/A', 'N/A', '0', 'ea', '0.00', 'Unknown'];
            }
          });
        case 'losses':
          return data.map(loss => {
            // More robust property access with error handling
            try {
              return [
                loss?.id?.toString() || 'N/A',
                loss?.date?.toString() || 'N/A',
                loss?.itemName?.toString() || 'N/A',
                typeof loss?.quantity === 'number' 
                  ? loss.quantity.toString() 
                  : (parseInt(loss?.quantity) || 0).toString(),
                loss?.reason?.toString() || 'N/A',
                loss?.recordedBy?.toString() || 'N/A',
                typeof loss?.value === 'number' 
                  ? loss.value.toFixed(2) 
                  : (parseFloat(loss?.value) || 0).toFixed(2)
              ];
            } catch (err) {
              // Return a default row if any property fails
              return ['N/A', 'N/A', 'N/A', '0', 'N/A', 'N/A', '0.00'];
            }
          });
        case 'low-stock':
          return data.map(item => {
            // More robust property access with error handling
            try {
              return [
                item?.id?.toString() || 'N/A',
                item?.sku?.toString() || 'N/A',
                item?.name?.toString() || 'N/A',
                item?.category?.toString() || 'N/A',
                typeof item?.stock === 'number' 
                  ? item.stock.toString() 
                  : (parseInt(item?.stock) || 0).toString(),
                typeof item?.threshold === 'number' 
                  ? item.threshold.toString() 
                  : (parseInt(item?.threshold) || 0).toString(),
                item?.status?.toString() || 'Active'
              ];
            } catch (err) {
              // Return a default row if any property fails
              return ['N/A', 'N/A', 'N/A', 'N/A', '0', '0', 'Unknown'];
            }
          });
        case 'refunds':
          // No need to filter here as it's already filtered in filterDataByReportType
          return data.map(refund => {
            // More robust property access with error handling
            try {
              return [
                refund?.id?.toString() || 'N/A',
                refund?.refundDate?.toString() || refund?.date?.toString() || 'N/A',
                refund?.refundedBy?.toString() || 'N/A',
                refund?.cashier?.toString() || 'N/A',
                typeof refund?.amount === 'number' 
                  ? refund.amount.toFixed(2) 
                  : (parseFloat(refund?.amount) || 0).toFixed(2),
                Array.isArray(refund?.items) 
                  ? refund.items.length.toString() 
                  : '0'
              ];
            } catch (err) {
              // Return a default row if any property fails
              return ['N/A', 'N/A', 'N/A', 'N/A', '0.00', '0'];
            }
          });
        default:
          return data.map(item => {
            // More robust property access with error handling
            try {
              return [
                item?.id?.toString() || 'N/A',
                item?.name?.toString() || item?.title?.toString() || 'N/A',
                typeof item?.value === 'number' 
                  ? item.value.toString() 
                  : (parseFloat(item?.value) || 0).toString()
              ];
            } catch (err) {
              // Return a default row if any property fails
              return ['N/A', 'N/A', '0'];
            }
          });
      }
    } catch (error) {
      // Return empty array if data formatting fails
      return []; // Return empty array to prevent errors
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h4 className="font-medium mb-2">{reportName}</h4>
      <p className="text-sm text-gray-500 mb-4 flex-grow">
        {description}
      </p>
      <Button 
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 px-4 py-2 shadow-md transition-all hover:shadow-lg w-full justify-center"
        onClick={generateReport}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-1" />
            Generate Report
          </>
        )}
      </Button>
    </div>
  );
};

export default ReportGenerator;
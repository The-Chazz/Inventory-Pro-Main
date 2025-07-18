import { format, parseISO, startOfDay, endOfDay, isWithinInterval, isValid } from 'date-fns';

// Transform raw sales data into time series format for charts
export const transformSalesData = (salesData: any[]) => {
  if (!Array.isArray(salesData) || salesData.length === 0) {
    return [];
  }

  // Group sales by date
  const salesByDate = salesData.reduce((acc: {[key: string]: any}, sale) => {
    try {
      if (!sale.date) return acc;
      
      // Try to parse the date correctly
      let saleDate;
      try {
        // Handle ISO strings
        saleDate = parseISO(sale.date);
        // Check if valid date was parsed
        if (!isValid(saleDate)) {
          // Fallback - try parsing as a JS Date
          saleDate = new Date(sale.date);
        }
      } catch (e) {
        // Another fallback - try as a regular JS Date object
        saleDate = new Date(sale.date);
      }
      
      // Skip invalid dates
      if (!isValid(saleDate)) return acc;
      
      // Format date as YYYY-MM-DD for grouping
      const dateStr = format(saleDate, 'yyyy-MM-dd');
      
      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: dateStr,
          amount: 0,
          transactions: 0,
          refundAmount: 0,
          refundCount: 0
        };
      }
      
      const saleAmount = typeof sale.amount === 'number' ? sale.amount : parseFloat(sale.amount) || 0;
      
      if (sale.status && sale.status.toLowerCase() === 'refunded') {
        acc[dateStr].refundAmount += saleAmount;
        acc[dateStr].refundCount += 1;
      } else {
        acc[dateStr].amount += saleAmount;
        acc[dateStr].transactions += 1;
      }
      
      return acc;
    } catch (err) {
      // Skip invalid sale entries
      return acc;
    }
  }, {});
  
  // Convert to array and sort by date
  return Object.values(salesByDate).sort((a: any, b: any) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
};

// Transform inventory data for stock level visualization
export const transformInventoryData = (inventoryData: any[]) => {
  if (!Array.isArray(inventoryData) || inventoryData.length === 0) {
    return [];
  }

  return inventoryData.map(item => ({
    name: item.name || 'Unknown Item',
    stock: Number(item.stock) || 0,
    threshold: Number(item.threshold) || 0,
    value: (Number(item.stock) || 0) * (Number(item.price) || 0),
    category: item.category || 'Uncategorized'
  }));
};

// Transform sales data to show product distribution
export const transformProductSalesData = (salesData: any[]) => {
  if (!Array.isArray(salesData) || salesData.length === 0) {
    return [];
  }

  // Extract all sale items, filtering out bad data
  const allItems: any[] = [];
  salesData.forEach(sale => {
    try {
      // Skip refunded sales to avoid double-counting
      if (sale.status && sale.status.toLowerCase() === 'refunded') {
        return;
      }
      
      // Only add items if they're in an array
      if (Array.isArray(sale.items)) {
        allItems.push(...sale.items);
      }
    } catch (err) {
      // Skip invalid sales
    }
  });

  // Group by product and count quantities
  const productCounts: {[key: string]: number} = {};
  allItems.forEach(item => {
    try {
      const productName = item?.name || 'Unknown';
      
      if (!productCounts[productName]) {
        productCounts[productName] = 0;
      }
      
      const quantity = typeof item?.quantity === 'number' 
        ? item.quantity 
        : (parseInt(item?.quantity) || 1);
        
      productCounts[productName] += quantity;
    } catch (err) {
      // Skip invalid items
    }
  });

  // Convert to array format for charts
  const result = Object.entries(productCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Return top 10 products or all if less than 10
  return result.slice(0, 10);
};

// Transform loss data for charts
export const transformLossData = (lossData: any[]) => {
  if (!Array.isArray(lossData) || lossData.length === 0) {
    return [];
  }

  // Format all loss records
  const formattedData = lossData.map(loss => {
    try {
      const lossDate = loss.date ? parseISO(loss.date) : new Date();
      return {
        date: format(lossDate, 'yyyy-MM-dd'),
        value: Number(loss.value) || 0,
        reason: loss.reason || 'Unknown',
        recordedBy: loss.recordedBy || 'Unknown',
        itemName: loss.itemName || 'Unknown Item'
      };
    } catch (err) {
      // Skip invalid entries
      return null;
    }
  }).filter(item => item !== null);
  
  // Sort by date
  return formattedData.sort((a: any, b: any) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
};

// Group data by cashier for performance comparison
export const transformCashierData = (salesData: any[]) => {
  if (!Array.isArray(salesData) || salesData.length === 0) {
    return [];
  }

  // Group by cashier
  const cashierStats: {[key: string]: {amount: number, transactions: number, avgTransaction: number}} = {};
  
  salesData.forEach(sale => {
    if (!sale.cashier) return;
    
    const cashier = sale.cashier;
    if (!cashierStats[cashier]) {
      cashierStats[cashier] = {
        amount: 0,
        transactions: 0,
        avgTransaction: 0
      };
    }
    
    // Only count completed sales (not refunded)
    if (sale.status !== 'Refunded') {
      cashierStats[cashier].amount += Number(sale.amount) || 0;
      cashierStats[cashier].transactions += 1;
    }
  });
  
  // Calculate average transaction value
  Object.keys(cashierStats).forEach(cashier => {
    const stats = cashierStats[cashier];
    stats.avgTransaction = stats.transactions > 0 
      ? stats.amount / stats.transactions 
      : 0;
  });
  
  // Convert to array format for charts
  return Object.entries(cashierStats).map(([cashier, stats]) => ({
    cashier,
    ...stats
  }));
};

// Group inventory by category
export const transformCategoryData = (inventoryData: any[]) => {
  if (!Array.isArray(inventoryData) || inventoryData.length === 0) {
    return [];
  }

  // Group by category
  const categoryStats: {[key: string]: {count: number, value: number}} = {};
  
  inventoryData.forEach(item => {
    const category = item.category || 'Uncategorized';
    
    if (!categoryStats[category]) {
      categoryStats[category] = {
        count: 0,
        value: 0
      };
    }
    
    categoryStats[category].count += 1;
    categoryStats[category].value += (Number(item.stock) || 0) * (Number(item.price) || 0);
  });
  
  // Convert to array format for charts
  return Object.entries(categoryStats)
    .map(([category, stats]) => ({
      category,
      ...stats
    }))
    .sort((a, b) => b.value - a.value); // Sort by value (descending)
};
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Define types for sales data
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

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  
  const timeString = `${formattedHours}:${formattedMinutes} ${ampm}`;
  
  if (isToday) {
    return `Today, ${timeString}`;
  } else {
    return `${date.toLocaleDateString()}, ${timeString}`;
  }
};

const RecentSales: React.FC = () => {
  // Fetch sales data from API
  const { data: sales, isLoading, error } = useQuery({
    queryKey: ['/api/sales'],
    queryFn: async () => {
      const response = await apiRequest('/api/sales');
      if (response && response instanceof Response) {
        return await response.json() as Sale[];
      }
      return [] as Sale[];
    }
  });

  // Sort sales by date (newest first) and take the most recent 5
  const recentSales = sales && Array.isArray(sales) 
    ? [...sales].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ).slice(0, 5)
    : [];

  return (
    <div className="bg-white shadow rounded-lg lg:col-span-2">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Sales</h3>
      </div>
      {isLoading ? (
        <div className="p-6 text-center">
          <i className="fas fa-spinner fa-spin mr-2"></i> Loading recent sales...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-500">
          <i className="fas fa-exclamation-triangle mr-2"></i> Error loading sales data. Please try again.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cashier</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentSales && recentSales.length > 0 ? (
                recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.cashier}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(sale.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${sale.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        sale.status.toLowerCase() === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : sale.status.toLowerCase() === 'refunded'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.status}
                        {sale.status.toLowerCase() === 'refunded' && sale.refundedBy && (
                          <span className="text-xs ml-1 text-gray-500"> (by {sale.refundedBy})</span>
                        )}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No recent sales found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentSales;

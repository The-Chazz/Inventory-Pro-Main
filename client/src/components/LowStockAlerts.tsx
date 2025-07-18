import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

// Define type for inventory item
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
}

const LowStockAlerts: React.FC = () => {
  // Fetch low stock items
  const { data: lowStockItems, isLoading, error } = useQuery({
    queryKey: ['/api/alerts/low-stock'],
    queryFn: async () => {
      const response = await apiRequest('/api/alerts/low-stock');
      if (response && response instanceof Response) {
        return await response.json() as InventoryItem[];
      }
      return [] as InventoryItem[];
    }
  });

  // Show all low stock alerts with scrollable interface
  const alerts = lowStockItems && Array.isArray(lowStockItems) ? lowStockItems : [];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Low Stock Alerts</h3>
      </div>
      
      {isLoading ? (
        <div className="p-6 text-center">
          <i className="fas fa-spinner fa-spin mr-2"></i> Loading alerts...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-500">
          <i className="fas fa-exclamation-triangle mr-2"></i> Error loading alerts. Please try again.
        </div>
      ) : alerts && alerts.length > 0 ? (
        <div className="p-4 space-y-3 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {alerts.map((item) => {
            const isCritical = item.status === 'Low Stock';
            return (
              <div 
                key={item.id} 
                className={`p-3 rounded-lg border ${
                  isCritical
                    ? 'bg-red-50 border-red-100' 
                    : 'bg-yellow-50 border-yellow-100'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className={`text-sm font-medium ${
                      isCritical ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      {item.name}
                    </h4>
                    <p className={`text-xs ${
                      isCritical ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      Current Stock: {item.stock} {item.unit}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    isCritical
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isCritical ? 'Critical' : 'Warning'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center text-gray-500">
          No low stock items found.
        </div>
      )}
      
      <div className="px-4 py-3 bg-gray-50 text-right">
        <Link href="/inventory" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          Manage Inventory →
        </Link>
      </div>
    </div>
  );
};

export default LowStockAlerts;

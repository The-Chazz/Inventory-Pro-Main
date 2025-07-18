import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Stats {
  totalInventoryItems: number;
  todaySales: number;
  lowStockItems: number;
  activeUsers: number;
  totalInventoryValue: number;
  todayRefunds?: number;
  netSales?: number;
}

const DashboardStats: React.FC = () => {
  // Fetch stats from API with auto-refresh
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: async () => {
      const response = await apiRequest('/api/stats');
      const data = await response.json();
      return data as Stats;
    },
    refetchInterval: 3000, // Refresh every 3 seconds for more real-time updates
    refetchOnWindowFocus: true // Refresh when tab gets focus
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Row 1: Tiles with dollar values */}
      <div className="bg-teal-500 overflow-hidden shadow rounded-lg text-white">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-teal-700 rounded-md p-3">
              <i className="fas fa-chart-line text-white text-xl"></i>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-white truncate">Total Inventory Value</dt>
                <dd className="flex items-baseline">
                  {isLoading ? (
                    <div className="text-2xl font-semibold text-white">
                      <i className="fas fa-spinner fa-spin"></i>
                    </div>
                  ) : error ? (
                    <div className="text-xl font-semibold text-white">Error</div>
                  ) : (
                    <div className="text-2xl font-semibold text-white w-full whitespace-nowrap overflow-hidden text-ellipsis">
                      ${Number(stats?.totalInventoryValue || 0).toFixed(2)}
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      
      {/* Today's Sales */}
      <div className="bg-green-500 overflow-hidden shadow rounded-lg text-white">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-700 rounded-md p-3">
              <i className="fas fa-dollar-sign text-white text-xl"></i>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-white truncate">Today's Sales</dt>
                <dd className="flex items-baseline">
                  {isLoading ? (
                    <div className="text-2xl font-semibold text-white">
                      <i className="fas fa-spinner fa-spin"></i>
                    </div>
                  ) : error ? (
                    <div className="text-xl font-semibold text-white">Error</div>
                  ) : (
                    <div className="text-2xl font-semibold text-white w-full whitespace-nowrap overflow-hidden text-ellipsis">
                      ${Number(stats?.todaySales || 0).toFixed(2)}
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      
      {/* Today's Refunds */}
      <div className="bg-red-500 overflow-hidden shadow rounded-lg text-white">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-700 rounded-md p-3">
              <i className="fas fa-undo-alt text-white text-xl"></i>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-white truncate">Today's Refunds</dt>
                <dd className="flex items-baseline">
                  {isLoading ? (
                    <div className="text-2xl font-semibold text-white">
                      <i className="fas fa-spinner fa-spin"></i>
                    </div>
                  ) : error ? (
                    <div className="text-xl font-semibold text-white">Error</div>
                  ) : (
                    <div className="text-2xl font-semibold text-white w-full whitespace-nowrap overflow-hidden text-ellipsis">
                      ${Number(stats?.todayRefunds || 0).toFixed(2)}
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      
      {/* Row 2: Tiles with count values */}
      {/* Total Inventory Items */}
      <div className="bg-blue-500 overflow-hidden shadow rounded-lg text-white">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-700 rounded-md p-3">
              <i className="fas fa-box-open text-white text-xl"></i>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-white truncate">Total Inventory Items</dt>
                <dd className="flex items-baseline">
                  {isLoading ? (
                    <div className="text-2xl font-semibold text-white">
                      <i className="fas fa-spinner fa-spin"></i>
                    </div>
                  ) : error ? (
                    <div className="text-xl font-semibold text-white">Error</div>
                  ) : (
                    <div className="text-2xl font-semibold text-white">
                      {stats?.totalInventoryItems || 0}
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      
      {/* Low Stock Items */}
      <div className="bg-yellow-500 overflow-hidden shadow rounded-lg text-white">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-700 rounded-md p-3">
              <i className="fas fa-exclamation-triangle text-white text-xl"></i>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-white truncate">Low Stock Items</dt>
                <dd className="flex items-baseline">
                  {isLoading ? (
                    <div className="text-2xl font-semibold text-white">
                      <i className="fas fa-spinner fa-spin"></i>
                    </div>
                  ) : error ? (
                    <div className="text-xl font-semibold text-white">Error</div>
                  ) : (
                    <div className="text-2xl font-semibold text-white">
                      {stats?.lowStockItems || 0}
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      
      {/* Active Users */}
      <div className="bg-purple-500 overflow-hidden shadow rounded-lg text-white">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-700 rounded-md p-3">
              <i className="fas fa-users text-white text-xl"></i>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-white truncate">Active Users</dt>
                <dd className="flex items-baseline">
                  {isLoading ? (
                    <div className="text-2xl font-semibold text-white">
                      <i className="fas fa-spinner fa-spin"></i>
                    </div>
                  ) : error ? (
                    <div className="text-xl font-semibold text-white">Error</div>
                  ) : (
                    <div className="text-2xl font-semibold text-white">
                      {stats?.activeUsers || 0}
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;

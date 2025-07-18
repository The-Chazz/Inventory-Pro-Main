import { useState } from "react";
import Header from "@/components/Header";
import { useAppContext } from "@/context/AppContext";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

const ReorderAlerts: React.FC = () => {
  const { currentPage } = useAppContext();
  const [filter, setFilter] = useState<string>("all"); // "all", "critical", "warning"
  
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

  // Apply filter to low stock items
  const filteredItems = lowStockItems?.filter(item => {
    if (filter === "all") return true;
    if (filter === "critical") return item.status === "Low Stock";
    if (filter === "warning") return item.status === "Warning";
    return true;
  });

  // Handle reorder action
  const handleReorder = (item: InventoryItem) => {
    // In a real app, this would initiate a purchase order
    alert(`Initiated reorder for ${item.name}`);
  };
  
  return (
    <>
      <Header title={currentPage} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Reorder Alerts</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Items that need reordering based on inventory thresholds
                </p>
              </div>
              <div className="flex space-x-3">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Alerts</option>
                  <option value="critical">Critical (Low Stock)</option>
                  <option value="warning">Warning</option>
                </select>
              </div>
            </div>
            
            {isLoading ? (
              <div className="p-6 text-center">
                <i className="fas fa-spinner fa-spin mr-2"></i> Loading alerts...
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-500">
                <i className="fas fa-exclamation-triangle mr-2"></i> Error loading alerts. Please try again.
              </div>
            ) : filteredItems && filteredItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Threshold</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">{item.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.stock} {item.unit}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.threshold} {item.unit}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.status === 'Low Stock' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button 
                            onClick={() => handleReorder(item)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                          >
                            Reorder
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-6 text-gray-500">
                {filter !== "all" 
                  ? `No ${filter === "critical" ? "critical" : "warning"} alerts found.` 
                  : "No items need reordering at this time."}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default ReorderAlerts;

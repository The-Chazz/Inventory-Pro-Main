import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useAppContext } from "@/context/AppContext";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddInventoryItemForm from "@/components/AddInventoryItemForm";
import EditInventoryItemForm from "@/components/EditInventoryItemForm";
import BulkInventoryImport from "@/components/BulkInventoryImport";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";

// Define types for inventory data
interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  priceUnit: string;
  costPrice?: number; // Added: Cost price for profit tracking
  profitMargin?: number; // Added: Profit margin percentage
  profitType?: 'percentage' | 'fixed'; // Added: Whether profit is calculated as percentage or fixed amount
  threshold: number;
  status: string;
  image?: string;
  barcode?: string;
}

const Inventory: React.FC = () => {
  const { currentPage } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [userRole, setUserRole] = useState<string>("Administrator"); // Default to Administrator
  const { toast } = useToast();
  
  // Get user role from session storage
  useEffect(() => {
    const userInfo = sessionStorage.getItem("user");
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        setUserRole(user.role || "Administrator");
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }
    
    // Check for role changes every 3 seconds
    const interval = setInterval(() => {
      const updatedInfo = sessionStorage.getItem("user");
      if (updatedInfo) {
        try {
          const user = JSON.parse(updatedInfo);
          setUserRole(user.role || "Administrator");
        } catch (error) {
          console.error("Error parsing updated user info:", error);
        }
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch inventory data
  const { data: inventoryItems, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/inventory'],
    queryFn: async () => {
      const response = await apiRequest('/api/inventory');
      if (response && response instanceof Response) {
        return await response.json() as InventoryItem[];
      }
      return [] as InventoryItem[];
    }
  });

  // Filter inventory items based on search term and low stock filter
  const filteredItems = inventoryItems?.filter((item: InventoryItem) => {
    // First, apply search term filter
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Then apply low stock filter if enabled
    if (showLowStockOnly) {
      return matchesSearch && (item.stock <= item.threshold);
    }
    
    return matchesSearch;
  });
  
  const handleAddSuccess = () => {
    setShowAddForm(false);
    setShowBulkImport(false);
    refetch();
  };

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
  };

  const handleEditSuccess = () => {
    setEditingItem(null);
    refetch();
  };

  const handleDeleteClick = (item: InventoryItem) => {
    setDeletingItem(item);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    
    setIsDeleting(true);
    try {
      // Use apiRequest to ensure user info is included in headers
      const response = await apiRequest({
        url: `/api/inventory/${deletingItem.id}`,
        method: 'DELETE'
      });
      
      if (response && response.ok) {
        toast({
          title: "Item Deleted",
          description: `${deletingItem.name} has been deleted successfully`,
        });
        
        // Invalidate the inventory query to refresh the data
        queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
        
        // Invalidate low stock alerts
        queryClient.invalidateQueries({ queryKey: ['/api/alerts/low-stock'] });
        
        // Invalidate stats
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      } else {
        // Handle error response
        let errorMessage = "Failed to delete item";
        if (response) {
          try {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
          } catch (e) {
            // If response cannot be parsed as JSON
            errorMessage = response.statusText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while deleting the item",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeletingItem(null);
    }
  };
  
  return (
    <>
      <Header title={currentPage} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {showAddForm ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <AddInventoryItemForm onSuccess={handleAddSuccess} onCancel={() => setShowAddForm(false)} />
            </div>
          ) : showBulkImport ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <BulkInventoryImport onSuccess={handleAddSuccess} onCancel={() => setShowBulkImport(false)} />
            </div>
          ) : editingItem ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <EditInventoryItemForm 
                item={editingItem} 
                onSuccess={handleEditSuccess} 
                onCancel={() => setEditingItem(null)} 
              />
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Inventory Management</h3>
                <div className="flex space-x-3">
                  <div className="flex space-x-2">
                    <div className="relative">
                      <input
                        type="text"
                        id="inventory-search"
                        placeholder="Search inventory..."
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-4"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                        showLowStockOnly 
                          ? 'text-white bg-red-600 hover:bg-red-700' 
                          : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                      title="Show items that need reordering"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {showLowStockOnly ? "Show All Items" : "Show Low Stock Only"}
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowBulkImport(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Bulk Import
                  </button>
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Item
                  </button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="p-6 text-center">
                  <i className="fas fa-spinner fa-spin mr-2"></i> Loading inventory...
                </div>
              ) : error ? (
                <div className="p-6 text-center text-red-500">
                  <i className="fas fa-exclamation-triangle mr-2"></i> Error loading inventory. Please try again.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredItems && filteredItems.length > 0 ? (
                        filteredItems.map((item: InventoryItem) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.name} 
                                  className="h-10 w-10 rounded-md object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                {item.sku}
                                {item.barcode && (
                                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md" title="Has barcode">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.stock} {item.unit}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.price}/{item.priceUnit}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                item.status === 'Low Stock' 
                                  ? 'bg-red-100 text-red-800' 
                                  : item.status === 'Warning'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center space-x-3">
                                <button 
                                  onClick={() => handleEditClick(item)}
                                  className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1 rounded-md" 
                                  title="Edit Item"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                </button>
                                {/* Only show delete button for non-Stocker roles */}
                                {userRole !== "Stocker" && (
                                  <button 
                                    onClick={() => handleDeleteClick(item)}
                                    className="text-red-600 hover:text-red-900 bg-red-50 p-1 rounded-md"
                                    title="Delete Item"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                            {searchTerm ? 'No matching items found.' : 'No inventory items available.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deletingItem}
        itemName={deletingItem?.name || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingItem(null)}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default Inventory;

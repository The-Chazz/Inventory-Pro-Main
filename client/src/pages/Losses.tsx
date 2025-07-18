import { useState } from "react";
import Header from "@/components/Header";
import { useAppContext } from "@/context/AppContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  threshold: number;
  status: string;
  image?: string;
  barcode?: string;
}

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

const Losses: React.FC = () => {
  const { currentPage } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLoss, setEditingLoss] = useState<LossItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Fetch inventory data
  const { data: inventoryItems, isLoading: inventoryLoading } = useQuery({
    queryKey: ['/api/inventory'],
    queryFn: async () => {
      const response = await apiRequest('/api/inventory');
      if (response && response instanceof Response) {
        return await response.json() as InventoryItem[];
      }
      return [] as InventoryItem[];
    }
  });

  // Fetch losses data
  const { data: lossesItems, isLoading: lossesLoading, error, refetch } = useQuery({
    queryKey: ['/api/losses'],
    queryFn: async () => {
      const response = await apiRequest('/api/losses');
      if (response && response instanceof Response) {
        try {
          return await response.json() as LossItem[];
        } catch (e) {
          console.error("Error parsing JSON:", e);
          return [] as LossItem[];
        }
      }
      // If API endpoint doesn't exist yet, return empty array
      console.warn("Losses API endpoint may not be implemented yet");
      return [] as LossItem[];
    }
  });

  // Filter losses by search term
  const filteredLosses = lossesItems?.filter((item: LossItem) => 
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reason.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Add loss mutation
  const addLossMutation = useMutation({
    mutationFn: async (lossData: any) => {
      const response = await fetch('/api/losses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(lossData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to record loss');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Loss recorded successfully",
      });
      setShowAddForm(false);
      setSelectedInventoryItem(null);
      setQuantity(1);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ['/api/losses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record loss",
        variant: "destructive"
      });
    }
  });
  
  // Update loss mutation
  const updateLossMutation = useMutation({
    mutationFn: async (lossData: any) => {
      const response = await fetch(`/api/losses/${lossData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(lossData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update loss record');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Loss record updated successfully",
      });
      setEditingLoss(null);
      setIsEditing(false);
      setShowAddForm(false);
      setSelectedInventoryItem(null);
      setQuantity(1);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ['/api/losses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update loss record",
        variant: "destructive"
      });
    }
  });

  const handleEditClick = (loss: LossItem) => {
    setEditingLoss(loss);
    setIsEditing(true);
    setShowAddForm(true);
    
    // Find the corresponding inventory item
    const item = inventoryItems?.find(item => item.id === loss.inventoryItemId) || null;
    setSelectedInventoryItem(item);
    setQuantity(loss.quantity);
    setReason(loss.reason);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInventoryItem) {
      toast({
        title: "Error",
        description: "Please select an inventory item",
        variant: "destructive"
      });
      return;
    }
    
    if (!reason) {
      toast({
        title: "Error",
        description: "Please provide a reason for the loss",
        variant: "destructive"
      });
      return;
    }
    
    // Calculate value of loss
    const value = selectedInventoryItem.price * quantity;
    
    setIsSubmitting(true);
    
    try {
      // Get current user info from session storage
      const userInfoStr = sessionStorage.getItem("user");
      const userInfo = userInfoStr ? JSON.parse(userInfoStr) : { name: "Unknown User" };
      
      if (isEditing && editingLoss) {
        // Update existing loss record
        await updateLossMutation.mutateAsync({
          id: editingLoss.id,
          inventoryItemId: selectedInventoryItem.id,
          itemName: selectedInventoryItem.name,
          quantity,
          reason,
          recordedBy: userInfo.name || "Unknown User",
          value,
          date: editingLoss.date // keep original date
        });
      } else {
        // Create new loss record
        await addLossMutation.mutateAsync({
          inventoryItemId: selectedInventoryItem.id,
          itemName: selectedInventoryItem.name,
          quantity,
          reason,
          recordedBy: userInfo.name || "Unknown User",
          value
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingLoss(null);
    setIsEditing(false);
    setSelectedInventoryItem(null);
    setQuantity(1);
    setReason("");
  };
  
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  const isLoading = lossesLoading || inventoryLoading;

  const lossReasons = [
    "Damaged in Store",
    "Expired",
    "Quality Issues",
    "Spoiled",
    "Theft",
    "Vendor Error",
    "Other"
  ];

  return (
    <>
      <Header title={currentPage} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {showAddForm ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {isEditing ? 'Edit Loss Record' : 'Record Inventory Loss'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="inventoryItem" className="block text-sm font-medium text-gray-700 mb-1">
                    Inventory Item
                  </label>
                  <select
                    id="inventoryItem"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedInventoryItem?.id || ""}
                    onChange={(e) => {
                      const id = parseInt(e.target.value);
                      setSelectedInventoryItem(inventoryItems?.find(item => item.id === id) || null);
                    }}
                    required
                  >
                    <option value="">Select an item</option>
                    {inventoryItems?.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} - {item.sku} ({item.stock} {item.unit} in stock)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      id="quantity"
                      type="number"
                      min="1"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      required
                    />
                    {selectedInventoryItem && (
                      <p className="mt-1 text-sm text-gray-500">
                        Unit: {selectedInventoryItem.unit} | Current Stock: {selectedInventoryItem.stock}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Loss
                    </label>
                    <select
                      id="reason"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    >
                      <option value="">Select reason</option>
                      {lossReasons.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                    {reason === "Other" && (
                      <input
                        type="text"
                        placeholder="Specify reason"
                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => setReason(e.target.value)}
                        required
                      />
                    )}
                  </div>
                </div>
                
                {selectedInventoryItem && (
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-blue-700 mb-2">Loss Summary</h4>
                    <p className="text-sm text-blue-700">
                      Recording loss of {quantity} {selectedInventoryItem.unit} of {selectedInventoryItem.name}
                    </p>
                    <p className="text-sm text-blue-700">
                      Value: ${(selectedInventoryItem.price * quantity).toFixed(2)}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedInventoryItem || !reason}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Recording...
                      </span>
                    ) : (
                      "Record Loss"
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Inventory Losses</h3>
                <div className="flex space-x-3">
                  <div className="relative">
                    <input
                      type="text"
                      id="loss-search"
                      placeholder="Search losses..."
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-4"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="fas fa-search text-gray-400"></i>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Record Loss
                  </button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="p-6 text-center">
                  <i className="fas fa-spinner fa-spin mr-2"></i> Loading data...
                </div>
              ) : error ? (
                <div className="p-6 text-center text-red-500">
                  <i className="fas fa-exclamation-triangle mr-2"></i> Error loading data. Please try again.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recorded By</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLosses.length > 0 ? (
                        filteredLosses.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.itemName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.reason}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.recordedBy}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.value.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEditClick(item)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                            {searchTerm ? 'No matching losses found.' : 'No inventory losses recorded.'}
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
    </>
  );
};

export default Losses;
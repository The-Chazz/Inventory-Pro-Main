import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import BarcodeScanner from "./BarcodeScanner";
import ImageUploader from "./ImageUploader";

// Define schema for inventory item validation
const inventoryItemSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  stock: z.coerce.number().min(0, "Stock must be a positive number"),
  unit: z.string().min(1, "Unit type is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  priceUnit: z.string().default("each"),
  threshold: z.coerce.number().min(0, "Threshold must be a positive number"),
  image: z.string().optional(),
  barcode: z.string().optional(),
});

type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;

interface ProductLookupResponse {
  name?: string;
  description?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  success: boolean;
  source?: string;
}

interface AddInventoryItemFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AddInventoryItemForm: React.FC<AddInventoryItemFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string>("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const { toast } = useToast();
  
  // Initialize form
  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "",
      stock: 0,
      unit: "each",
      price: 0,
      priceUnit: "each",
      threshold: 5,
      image: "",
      barcode: ""
    }
  });
  
  // Handle barcode scan result
  const handleBarcodeScan = async (result: string) => {
    form.setValue("barcode", result);
    form.setValue("sku", result); // Also set the SKU to be the same as barcode
    setScannerActive(false);
    
    // Show initial scan success
    toast({
      title: "Barcode Scanned",
      description: `Barcode ${result} detected. Looking up product information...`,
    });
    
    // Attempt to lookup product information
    setIsLookingUp(true);
    try {
      const response = await apiRequest({
        url: `/api/product-lookup/${result}`,
        method: "GET"
      }) as unknown as ProductLookupResponse;
      
      if (response.success) {
        // Auto-fill form fields with found product data
        if (response.name) {
          form.setValue("name", response.name);
        }
        if (response.brand && response.name && !response.name.includes(response.brand)) {
          form.setValue("name", `${response.brand} ${response.name}`);
        }
        if (response.category) {
          form.setValue("category", response.category);
        }
        
        // Set product image if found
        if (response.imageUrl) {
          setUploadedImage(response.imageUrl);
          form.setValue("image", response.imageUrl);
        }
        
        toast({
          title: "Product Found!",
          description: `Found product: ${response.name || 'Unknown'}${response.source ? ` (via ${response.source})` : ''}${response.imageUrl ? ' with image' : ''}`,
        });
      } else {
        toast({
          title: "Product Not Found",
          description: "No product information found for this barcode. Please fill in details manually.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Lookup Failed",
        description: "Unable to search for product information. Please fill in details manually.",
        variant: "destructive"
      });
    } finally {
      setIsLookingUp(false);
    }
  };
  
  // Handle image upload
  const handleImageUploaded = (imageData: string) => {
    setUploadedImage(imageData);
    form.setValue("image", imageData);
  };

  const onSubmit = async (data: InventoryItemFormValues) => {
    setIsSubmitting(true);
    try {
      // Include image and barcode data
      const formData = {
        ...data,
        image: uploadedImage,
        barcode: form.getValues("barcode")
      };
      
      const response = await apiRequest({
        url: "/api/inventory",
        method: "POST",
        data: formData
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: "Item added to inventory successfully",
        });
        
        // Invalidate the inventory query to refresh the data
        queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
        
        // If success callback is provided, call it
        if (onSuccess) {
          onSuccess();
        }
        
        // Reset the form
        form.reset();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to add item");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while adding the item",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    "Produce",
    "Dairy",
    "Meat",
    "Bakery",
    "Frozen Foods",
    "Beverages",
    "Snacks",
    "Canned Goods",
    "Cleaning Supplies",
    "Personal Care",
    "Other"
  ];

  const units = [
    "each",
    "kg",
    "g",
    "l",
    "ml",
    "pack",
    "box",
    "dozen"
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Add New Inventory Item</h2>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Image Uploader */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Image
          </label>
          <ImageUploader onImageUploaded={handleImageUploaded} currentImage={uploadedImage} />
        </div>
        
        {/* Barcode Scanner */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Scan Barcode
            </label>
            <button
              type="button"
              onClick={() => setScannerActive(!scannerActive)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {scannerActive ? 'Disable Scanner' : 'Enable Scanner'}
            </button>
          </div>
          {scannerActive && (
            <div className="mb-4">
              <BarcodeScanner 
                onScan={handleBarcodeScan}
                isActive={scannerActive}
                onError={(error) => console.error('Barcode scan error:', error)}
                onClose={() => setScannerActive(false)}
              />
            </div>
          )}
          {form.watch("barcode") && (
            <div className="p-2 bg-blue-50 text-blue-700 rounded-md mb-4">
              <p className="text-sm">Barcode scanned: <span className="font-medium">{form.watch("barcode")}</span></p>
            </div>
          )}
          {isLookingUp && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md mb-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                <p className="text-sm">Looking up product information...</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Product Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name
            </label>
            <input
              id="name"
              type="text"
              {...form.register("name")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* SKU */}
          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
              SKU
            </label>
            <div className="flex">
              <input
                id="sku"
                type="text"
                {...form.register("sku")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {!scannerActive && (
                <button
                  type="button"
                  onClick={() => setScannerActive(true)}
                  className="ml-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  title="Scan Barcode"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 11a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 4a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2V5h1v1h-1z" />
                    <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" />
                  </svg>
                </button>
              )}
            </div>
            {form.formState.errors.sku && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.sku.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              {...form.register("category")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {form.formState.errors.category && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.category.message}</p>
            )}
          </div>

          {/* Stock */}
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
              Stock
            </label>
            <input
              id="stock"
              type="number"
              min="0"
              step="1"
              {...form.register("stock")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.formState.errors.stock && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.stock.message}</p>
            )}
          </div>

          {/* Unit */}
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              id="unit"
              {...form.register("unit")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            {form.formState.errors.unit && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.unit.message}</p>
            )}
          </div>

          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              {...form.register("price")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.formState.errors.price && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.price.message}</p>
            )}
          </div>

          {/* Price Unit */}
          <div>
            <label htmlFor="priceUnit" className="block text-sm font-medium text-gray-700 mb-1">
              Price Per
            </label>
            <select
              id="priceUnit"
              {...form.register("priceUnit")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            {form.formState.errors.priceUnit && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.priceUnit.message}</p>
            )}
          </div>

          {/* Threshold */}
          <div>
            <label htmlFor="threshold" className="block text-sm font-medium text-gray-700 mb-1">
              Low Stock Threshold
            </label>
            <input
              id="threshold"
              type="number"
              min="0"
              step="1"
              {...form.register("threshold")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.formState.errors.threshold && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.threshold.message}</p>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              "Save Item"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddInventoryItemForm;
import React, { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { queryClient } from '@/lib/queryClient';

// Define the expected CSV structure
interface CSVRow {
  sku: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  priceUnit: string;
  threshold: number;
  barcode?: string;
}

interface BulkInventoryImportProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BulkInventoryImport: React.FC<BulkInventoryImportProps> = ({ 
  onSuccess,
  onCancel
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Reset form state
  const resetForm = () => {
    setFile(null);
    setPreview([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      resetForm();
      return;
    }

    // Validate file type (should be CSV)
    if (!selectedFile.name.endsWith('.csv')) {
      setErrors(['Please select a valid CSV file']);
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    parseCSV(selectedFile);
  };

  // Parse CSV file using the server's CSV parsing API
  const parseCSV = async (csvFile: File) => {
    setIsValidating(true);
    setErrors([]);
    
    try {
      // Create a FormData object to send the file to the server
      const formData = new FormData();
      formData.append('file', csvFile);
      
      // Send the file to the server for parsing
      const response = await fetch('/api/inventory/csv-upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to parse CSV file');
      }
      
      const result = await response.json();
      
      if (!result.items || !Array.isArray(result.items) || result.items.length === 0) {
        setErrors(['No valid items found in the CSV file']);
        setPreview([]);
        toast({
          title: "No valid data",
          description: "No valid inventory items found in the CSV file.",
          variant: "destructive"
        });
        return;
      }
      
      // Validate each item
      const parsedRows: CSVRow[] = [];
      const rowErrors: string[] = [];
      
      result.items.forEach((item: any, index: number) => {
        try {
          // Convert all item keys to lowercase for case-insensitive comparison
          const normalizedItem: any = {};
          Object.keys(item).forEach(key => {
            normalizedItem[key.toLowerCase()] = item[key];
          });
          
          // Check required fields (using lowercase for case-insensitivity)
          const requiredFields = ['sku', 'name', 'category', 'stock', 'unit', 'price', 'priceunit', 'threshold'];
          const missingFields = requiredFields.filter(field => 
            (normalizedItem[field] === undefined || normalizedItem[field] === '') && 
            normalizedItem[field] !== 0
          );
          
          if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
          }
          
          // Copy normalized values back to the item
          requiredFields.forEach(field => {
            if (normalizedItem[field] !== undefined) {
              item[field] = normalizedItem[field];
            }
          });
          
          // Ensure numeric fields are actually numbers
          ['stock', 'price', 'threshold'].forEach(field => {
            const value = parseFloat(item[field]);
            if (isNaN(value)) {
              throw new Error(`Invalid number for ${field}: ${item[field]}`);
            }
            item[field] = value;
          });
          
          parsedRows.push(item as CSVRow);
        } catch (error: any) {
          rowErrors.push(`Row ${index + 1}: ${error.message}`);
        }
      });
      
      setPreview(parsedRows.slice(0, 5)); // Show only first 5 rows in preview
      setErrors(rowErrors);
      
      if (parsedRows.length === 0) {
        toast({
          title: "No valid data",
          description: "No valid inventory items found in the CSV file.",
          variant: "destructive"
        });
      } else if (rowErrors.length > 0) {
        toast({
          title: "Validation issues",
          description: `Found ${rowErrors.length} issues in CSV file.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "CSV validated",
          description: `Successfully parsed ${parsedRows.length} inventory items.`
        });
      }
    } catch (error: any) {
      console.error('Error parsing CSV:', error);
      setErrors([error.message || 'Failed to parse CSV file. Please check the format.']);
      setPreview([]);
      
      toast({
        title: "Error",
        description: error.message || "Failed to parse CSV file",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Submit form to update inventory
  const handleSubmit = async () => {
    if (!file || errors.length > 0) return;
    
    setIsSubmitting(true);
    console.log("Starting bulk import submission");
    
    try {
      console.log("Preview data available:", preview.length, "items");
      
      // Normalize the validated items to ensure proper field mapping
      const itemsToSubmit = preview.map(item => {
        // Fix field names to match expected format in database
        const normalizedItem: any = {};
        
        // Explicitly map each field with proper casing
        normalizedItem.sku = item.sku;
        normalizedItem.name = item.name;
        normalizedItem.category = item.category;
        normalizedItem.stock = typeof item.stock === 'number' ? item.stock : parseFloat(String(item.stock));
        normalizedItem.unit = item.unit;
        normalizedItem.price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price));
        
        // Handle price unit field with proper capitalization (priceUnit instead of priceunit)
        normalizedItem.priceUnit = item.priceUnit || (item as any).priceunit;
        
        normalizedItem.threshold = typeof item.threshold === 'number' ? item.threshold : parseFloat(String(item.threshold));
        if (item.barcode) {
          normalizedItem.barcode = item.barcode;
        }
        
        return normalizedItem;
      });
      
      console.log("Submitting items with normalized fields:", itemsToSubmit);
      
      // Send data to the server
      const response = await fetch('/api/inventory/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: itemsToSubmit })
      });
      
      console.log("Server response status:", response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log("Bulk import success:", result);
        
        toast({
          title: "Bulk Update Complete",
          description: `Successfully updated ${result.updated} items, added ${result.created} new items.`
        });
        
        // Invalidate inventory queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
        
        // Reset form
        resetForm();
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const error = await response.json();
        console.error("Bulk import failed:", error);
        throw new Error(error.message || 'Failed to update inventory');
      }
    } catch (error: any) {
      console.error("Error during bulk import:", error);
      toast({
        title: "Update Failed",
        description: error.message || "An error occurred during bulk update",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Bulk Inventory Import</h2>
      
      <div className="space-y-6">
        {/* File Input Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload CSV File
          </label>
          <div className="flex items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              disabled={isSubmitting}
            />
            {file && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={resetForm}
                className="ml-2"
                disabled={isSubmitting}
              >
                Clear
              </Button>
            )}
          </div>
          
          <p className="mt-2 text-sm text-gray-500">
            The CSV file must include the following columns: sku, name, category, stock, unit, price, priceUnit, threshold
          </p>
          
          <a 
            href="/sample-inventory-import.csv" 
            download 
            className="mt-1 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <span>Download sample CSV template</span>
            <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>
        
        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {errors.length} {errors.length === 1 ? 'error' : 'errors'} found in CSV file
                </h3>
                <div className="mt-2 text-sm text-red-700 max-h-40 overflow-y-auto">
                  <ul className="list-disc pl-5 space-y-1">
                    {errors.slice(0, 10).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {errors.length > 10 && (
                      <li>...and {errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Data Preview */}
        {preview.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Preview</h3>
            <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((row, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-500">{row.sku}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{row.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{row.category}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{row.stock} {row.unit}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">${row.price}/{row.priceUnit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length < 5 ? (
                <p className="mt-2 text-xs text-gray-500">Showing all {preview.length} items</p>
              ) : (
                <p className="mt-2 text-xs text-gray-500">Showing first 5 of {preview.length} items</p>
              )}
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            disabled={!file || errors.length > 0 || isValidating || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Import Inventory"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default BulkInventoryImport;
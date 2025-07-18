import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface StoreLogoUploaderProps {
  currentLogo?: string;
  onSuccess?: () => void;
}

const StoreLogoUploader: React.FC<StoreLogoUploaderProps> = ({ 
  currentLogo,
  onSuccess
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentLogo);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    // Validate file size (max 2MB for logo)
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo image must be less than 2MB.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Create a local preview immediately
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onloadend = async () => {
        // Show preview first
        const dataUrl = reader.result as string;
        setPreviewUrl(dataUrl);
        
        // Then upload the file to the server
        const formData = new FormData();
        formData.append('logo', file);
        
        const response = await fetch('/api/settings/logo-upload', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to upload logo');
        }
        
        const result = await response.json();
        
        // Invalidate settings query to update logo in UI
        queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
        
        toast({
          title: "Success",
          description: "Store logo updated successfully",
        });
        
        if (onSuccess) {
          onSuccess();
        }
        
        setIsLoading(false);
      };
      
      reader.onerror = () => {
        throw new Error('Failed to read file');
      };
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      setError(error.message || 'Failed to upload logo');
      setIsLoading(false);
      
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive"
      });
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = async () => {
    setIsLoading(true);
    
    try {
      // Send request to remove logo (update settings with empty logo)
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ storeLogo: '' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove logo');
      }
      
      // Clear preview
      setPreviewUrl(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Invalidate settings query
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      toast({
        title: "Success",
        description: "Store logo removed successfully",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove logo",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Store Logo</h3>
      <p className="text-sm text-gray-500">
        Upload your store logo to display on receipts and the application header.
        For best results, use a square image with a transparent background.
      </p>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative mt-2">
          <img
            src={previewUrl}
            alt="Store Logo Preview"
            className="w-40 h-40 object-contain border border-gray-300 rounded-md"
          />
          <div className="mt-4 flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleButtonClick}
              disabled={isLoading}
            >
              Change Logo
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemoveImage}
              disabled={isLoading}
            >
              Remove Logo
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={handleButtonClick}
          disabled={isLoading}
          variant="outline"
          className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isLoading ? (
            <svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">Upload Logo</p>
            </div>
          )}
        </Button>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default StoreLogoUploader;
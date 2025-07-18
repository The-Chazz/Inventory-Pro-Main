import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { queryClient } from '@/lib/queryClient';
import { Separator } from '@/components/ui/separator';
import { useAppContext } from '@/context/AppContext';
import Header from '@/components/Header';

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
  costPrice?: number;
  profitMargin?: number;
  profitType?: 'percentage' | 'fixed';
  threshold: number;
  status: string;
  image?: string;
  barcode?: string;
}

const ProfitTracker: React.FC = () => {
  const { currentPage } = useAppContext();
  const { toast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [costPrice, setCostPrice] = useState<string>('');
  const [profitType, setProfitType] = useState<'percentage' | 'fixed'>('percentage');
  const [profitMargin, setProfitMargin] = useState<string>('');
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [showHistoricalPrices, setShowHistoricalPrices] = useState(false);
  
  // Fetch inventory items
  const { data: inventoryItems = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['/api/inventory'],
    refetchInterval: 5000
  });

  // Find the selected item
  const selectedItem = selectedItemId
    ? inventoryItems.find((item: InventoryItem) => item.id === selectedItemId)
    : null;

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (updates: Partial<InventoryItem>) => {
      const response = await fetch(`/api/inventory/${selectedItemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update item');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({
        title: "Success",
        description: "Item price and profit settings have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update item: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Calculate the new price based on cost and profit settings
  useEffect(() => {
    if (!costPrice || !profitMargin || !selectedItem) {
      setCalculatedPrice(null);
      return;
    }

    const cost = parseFloat(costPrice);
    const margin = parseFloat(profitMargin);
    
    if (isNaN(cost) || isNaN(margin)) {
      setCalculatedPrice(null);
      return;
    }
    
    let newPrice: number;
    
    if (profitType === 'percentage') {
      // Calculate price with percentage markup
      newPrice = cost * (1 + margin / 100);
    } else {
      // Calculate price with fixed markup
      newPrice = cost + margin;
    }
    
    setCalculatedPrice(parseFloat(newPrice.toFixed(2)));
  }, [costPrice, profitMargin, profitType, selectedItem]);

  // Reset form when item selection changes
  useEffect(() => {
    if (selectedItem) {
      setCostPrice(selectedItem.costPrice?.toString() || '');
      setProfitMargin(selectedItem.profitMargin?.toString() || '');
      setProfitType(selectedItem.profitType || 'percentage');
    } else {
      setCostPrice('');
      setProfitMargin('');
      setProfitType('percentage');
    }
  }, [selectedItem]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem || !costPrice || !profitMargin || calculatedPrice === null) {
      toast({
        title: "Validation Error",
        description: "Please fill out all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    updateItemMutation.mutate({
      id: selectedItem.id,
      costPrice: parseFloat(costPrice),
      profitMargin: parseFloat(profitMargin),
      profitType: profitType,
      price: calculatedPrice
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Header title="Profit Tracker" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Set Profit Margins</CardTitle>
            <CardDescription>
              Adjust cost price and profit margins to automatically calculate selling prices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="item-select">Select Inventory Item</Label>
                  <Select
                    value={selectedItemId?.toString() || ''}
                    onValueChange={(value) => setSelectedItemId(parseInt(value))}
                  >
                    <SelectTrigger id="item-select" className="w-full">
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} ({item.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedItem && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cost-price">Cost Price ($)</Label>
                        <Input
                          id="cost-price"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={costPrice}
                          onChange={(e) => setCostPrice(e.target.value)}
                          placeholder="Enter cost price"
                        />
                      </div>
                      <div>
                        <Label htmlFor="current-price">Current Selling Price</Label>
                        <Input
                          id="current-price"
                          type="text"
                          value={`$${selectedItem.price.toFixed(2)}`}
                          disabled
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Profit Type</Label>
                      <RadioGroup
                        value={profitType}
                        onValueChange={(value: 'percentage' | 'fixed') => setProfitType(value)}
                        className="flex space-x-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="percentage" id="percentage" />
                          <Label htmlFor="percentage">Percentage (%)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="fixed" id="fixed" />
                          <Label htmlFor="fixed">Fixed Amount ($)</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label htmlFor="profit-margin">
                        {profitType === 'percentage' ? 'Profit Percentage (%)' : 'Profit Amount ($)'}
                      </Label>
                      <Input
                        id="profit-margin"
                        type="number"
                        min={profitType === 'percentage' ? '1' : '0.01'}
                        step={profitType === 'percentage' ? '1' : '0.01'}
                        value={profitMargin}
                        onChange={(e) => setProfitMargin(e.target.value)}
                        placeholder={profitType === 'percentage' ? "Enter percentage" : "Enter amount"}
                      />
                    </div>

                    {calculatedPrice !== null && (
                      <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                        <div className="font-semibold text-blue-800">Calculated Selling Price</div>
                        <div className="text-2xl font-bold text-blue-900 mt-1">${calculatedPrice.toFixed(2)}</div>
                        {selectedItem.price !== calculatedPrice && (
                          <div className="text-sm text-blue-600 mt-1">
                            {calculatedPrice > selectedItem.price
                              ? `Price will increase by $${(calculatedPrice - selectedItem.price).toFixed(2)}`
                              : `Price will decrease by $${(selectedItem.price - calculatedPrice).toFixed(2)}`}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end pt-4">
                      <Button
                        type="submit"
                        disabled={!selectedItem || !costPrice || !profitMargin || calculatedPrice === null || updateItemMutation.isPending}
                        className="w-full sm:w-auto"
                      >
                        {updateItemMutation.isPending ? "Updating..." : "Update Price & Profit Settings"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Summary</CardTitle>
            <CardDescription>Current profit metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedItem ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Item</div>
                  <div className="font-medium">{selectedItem.name}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Current Price</div>
                  <div className="font-medium">${selectedItem.price.toFixed(2)}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Cost Price</div>
                  <div className="font-medium">
                    {selectedItem.costPrice
                      ? `$${selectedItem.costPrice.toFixed(2)}`
                      : 'Not set'}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Profit Margin</div>
                  <div className="font-medium">
                    {selectedItem.profitMargin && selectedItem.profitType
                      ? `${selectedItem.profitMargin.toFixed(2)}${selectedItem.profitType === 'percentage' ? '%' : '$'}`
                      : 'Not set'}
                  </div>
                </div>
                
                {selectedItem.costPrice && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Current Profit</div>
                    <div className="font-medium">
                      ${(selectedItem.price - selectedItem.costPrice).toFixed(2)}
                      {selectedItem.costPrice > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({((selectedItem.price - selectedItem.costPrice) / selectedItem.costPrice * 100).toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="pt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={showHistoricalPrices}
                      onCheckedChange={setShowHistoricalPrices}
                      id="historical-prices"
                    />
                    <Label htmlFor="historical-prices">Show Historical Prices</Label>
                  </div>
                  
                  {showHistoricalPrices && (
                    <div className="mt-4 text-sm text-muted-foreground">
                      Historical price data will be displayed here as it becomes available
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select an item to view profit details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfitTracker;
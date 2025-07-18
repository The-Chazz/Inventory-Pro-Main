import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import Header from "@/components/Header";
import ImageUploader from "@/components/ImageUploader";
import StoreLogoUploader from "@/components/StoreLogoUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

// Define the store settings schema
const storeSettingsSchema = z.object({
  storeName: z.string().min(3, "Store name must be at least 3 characters"),
  storeAddress: z.string().min(5, "Store address must be at least 5 characters"),
  storePhone: z.string().min(5, "Store phone must be at least 5 characters"),
  thankYouMessage: z.string().min(3, "Thank you message must be at least 3 characters"),
  storeLogo: z.string().optional()
  // nextTransactionId removed - now handled automatically by the system
});

type StoreSettings = z.infer<typeof storeSettingsSchema>;

const Settings: React.FC = () => {
  const { currentPage, addNotification } = useAppContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("receipt");
  
  const { data: settings, isLoading } = useQuery<StoreSettings>({
    queryKey: ['/api/settings'],
    refetchOnWindowFocus: false,
  });
  
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<StoreSettings>) => 
      apiRequest({ url: '/api/settings', method: 'PUT', data }),
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Store settings have been successfully updated.",
      });
      addNotification({
        type: "success",
        title: "Settings Updated",
        message: "Store settings have been successfully updated."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update settings: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  });
  
  const form = useForm<StoreSettings>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      storeName: "",
      storeAddress: "",
      storePhone: "",
      thankYouMessage: ""
    }
  });
  
  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);
  
  const onSubmit = (data: StoreSettings) => {
    updateSettingsMutation.mutate(data);
  };
  
  const handleLogoUpload = (imageUrl: string) => {
    form.setValue("storeLogo", imageUrl);
  };
  
  if (isLoading) {
    return (
      <>
        <Header title={currentPage} />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[250px]" />
              <Skeleton className="h-4 w-[350px]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }
  
  return (
    <>
      <Header title={currentPage} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-[400px] mb-6">
            <TabsTrigger value="receipt">Receipt Customization</TabsTrigger>
            <TabsTrigger value="branding">Store Branding</TabsTrigger>
          </TabsList>
          
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Store Branding</CardTitle>
                <CardDescription>
                  Customize your store's visual identity. Upload your store logo for receipts and application header.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StoreLogoUploader 
                  currentLogo={settings?.storeLogo || ''} 
                  onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/settings'] })}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="receipt" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Receipt Settings</CardTitle>
                <CardDescription>
                  Customize how your receipts appear to customers. These settings will be applied to all printed and digital receipts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="storeName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Store Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter store name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="storePhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Store Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter store phone" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="storeAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter store address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="thankYouMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thank You Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter thank you message to display at the bottom of receipts"
                              className="resize-none" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-4">
                      <FormLabel>Store Logo</FormLabel>
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="border rounded-md p-4 flex-1">
                          <ImageUploader 
                            onImageUploaded={handleLogoUpload} 
                            currentImage={form.getValues().storeLogo}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 mb-2">
                            Upload a logo to be displayed at the top of your receipts. 
                            For best results, use a square image with a transparent background.
                          </p>
                          {form.getValues().storeLogo && (
                            <div className="border rounded-md p-2 mt-4">
                              <p className="text-xs text-gray-500 mb-1">Preview:</p>
                              <img 
                                src={form.getValues().storeLogo} 
                                alt="Store Logo Preview" 
                                className="max-h-20 mx-auto"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updateSettingsMutation.isPending}
                        className="w-full sm:w-auto"
                      >
                        {updateSettingsMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Settings
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
};

export default Settings;

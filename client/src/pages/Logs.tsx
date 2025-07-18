import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import Header from "@/components/Header";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

// Define the ActivityLog interface
interface ActivityLog {
  id: number;
  userId: number;
  username: string;
  action: string;
  category: string;
  details?: string;
  timestamp: string;
}

const Logs = () => {
  const { currentPage } = useAppContext();
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  // Check if user has admin permissions
  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setIsAdmin(user.role === "Administrator");
      } catch (e) {
        setIsAdmin(false);
        toast({
          title: "Authentication Error",
          description: "There was a problem with your user session. Please log in again.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  // Fetch logs from API - only fetch if user is admin
  const { data: logs = [], isLoading, error } = useQuery<ActivityLog[]>({
    queryKey: ['/api/logs'],
    refetchInterval: 3000, // Refresh every 3 seconds for real-time updates
    enabled: isAdmin, // Only run this query if user is admin
  });
  
  // Handle errors with useEffect instead of onError
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load activity logs. You may not have permission to access this page.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Fetch log categories for the filter dropdown
  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ['/api/logs/categories'],
    enabled: isAdmin // Only run this query if user is admin
  });

  // Filter logs when logs data, categoryFilter, or searchQuery changes
  useEffect(() => {
    // Type guard to ensure logs is an array
    if (Array.isArray(logs) && logs.length > 0) {
      let filtered = [...logs];
      
      // Apply category filter
      if (categoryFilter && categoryFilter !== 'all') {
        filtered = filtered.filter(log => log.category === categoryFilter);
      }
      
      // Apply search filter - search in username, action, or details
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(log => 
          (typeof log.username === 'string' && log.username.toLowerCase().includes(query)) ||
          (typeof log.action === 'string' && log.action.toLowerCase().includes(query)) ||
          (typeof log.details === 'string' && log.details.toLowerCase().includes(query))
        );
      }
      
      setFilteredLogs(filtered);
    } else {
      setFilteredLogs([]);
    }
  }, [logs, categoryFilter, searchQuery]);

  // Define badge colors based on categories
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'user':
        return 'bg-blue-100 text-blue-800';
      case 'inventory':
        return 'bg-green-100 text-green-800';
      case 'sales':
        return 'bg-purple-100 text-purple-800';
      case 'authentication':
        return 'bg-yellow-100 text-yellow-800';
      case 'settings':
        return 'bg-pink-100 text-pink-800';
      case 'losses':
        return 'bg-red-100 text-red-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Map category to user-friendly module name
  const getModuleName = (category: string) => {
    switch (category.toLowerCase()) {
      case 'user':
        return 'User Management';
      case 'inventory':
        return 'Inventory';
      case 'sales':
        return 'Sales';
      case 'authentication':
        return 'Authentication';
      case 'settings':
        return 'Settings';
      case 'losses':
        return 'Loss Tracker';
      case 'system':
        return 'System';
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (e) {
      return timestamp;
    }
  };

  const handleClearFilters = () => {
    setCategoryFilter("all");
    setSearchQuery("");
  };

  return (
    <>
      <Header title={currentPage} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Detailed Activity History</CardTitle>
            <CardDescription>
              Comprehensive record of all user actions and system changes across all modules
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isAdmin && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>You do not have permission to view system logs. This page is only accessible to administrators.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {isAdmin && (
              <>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Search logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Button 
                      variant="outline" 
                      onClick={handleClearFilters}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {Array(5).fill(0).map((_, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[300px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">Date & Time</TableHead>
                          <TableHead className="w-[120px]">User</TableHead>
                          <TableHead className="w-[120px]">Module</TableHead>
                          <TableHead className="w-[150px]">Action Type</TableHead>
                          <TableHead>Detailed Information</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.length > 0 ? (
                          filteredLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-xs">
                                {formatTimestamp(log.timestamp)}
                              </TableCell>
                              <TableCell>
                                {log.username}
                              </TableCell>
                              <TableCell>
                                <Badge className={getCategoryColor(log.category)} variant="outline">
                                  {getModuleName(log.category)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {typeof log.action === 'string' ? log.action : 'Unknown Action'}
                              </TableCell>
                              <TableCell className="max-w-md">
                                <div className="text-sm text-gray-800">
                                  {typeof log.details === 'string' ? (
                                    <div className="whitespace-normal break-words">
                                      {log.details.length > 100 ? (
                                        <>
                                          <span>{log.details.substring(0, 100)}...</span>
                                          <button 
                                            className="ml-1 text-blue-600 hover:text-blue-800 text-xs underline" 
                                            onClick={() => {
                                              toast({
                                                title: "Complete Details",
                                                description: log.details
                                              });
                                            }}
                                          >
                                            View More
                                          </button>
                                        </>
                                      ) : (
                                        log.details
                                      )}
                                    </div>
                                  ) : ''}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              No logs found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default Logs;
import { useState } from "react";
import Header from "@/components/Header";
import { useAppContext } from "@/context/AppContext";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddUserForm from "@/components/AddUserForm";
import EditUserForm from "@/components/EditUserForm";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";

// Define type for user
interface User {
  id: number;
  name: string;
  username: string;
  role: string;
  lastActive: string;
  status: string;
}

const UserManagement: React.FC = () => {
  const { currentPage } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  // Fetch users from API
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('/api/users');
      if (response && response instanceof Response) {
        return await response.json() as User[];
      }
      return [] as User[];
    }
  });

  // Filter users based on search term
  const filteredUsers = users?.filter((user: User) => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date to readable string
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    refetch();
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
  };

  const handleEditSuccess = () => {
    setEditingUser(null);
    refetch();
  };

  const handleDeleteClick = (user: User) => {
    setDeletingUser(user);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    
    setIsDeleting(true);
    try {
      // Use apiRequest to ensure user info is included in headers
      const response = await apiRequest({
        url: `/api/users/${deletingUser.id}`,
        method: 'DELETE'
      });
      
      if (response && response.ok) {
        toast({
          title: "User Deleted",
          description: `${deletingUser.name} has been deleted successfully`,
        });
        
        // Invalidate the users query to refresh the data
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      } else {
        // Handle error response
        let errorMessage = "Failed to delete user";
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
        description: error.message || "An error occurred while deleting the user",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeletingUser(null);
    }
  };
  
  return (
    <>
      <Header title={currentPage} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {showAddForm ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <AddUserForm onSuccess={handleAddSuccess} onCancel={() => setShowAddForm(false)} />
            </div>
          ) : editingUser ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <EditUserForm 
                user={editingUser} 
                onSuccess={handleEditSuccess} 
                onCancel={() => setEditingUser(null)} 
              />
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">User Management</h3>
                <div className="flex space-x-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-4"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="fas fa-search text-gray-400"></i>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <i className="fas fa-user-plus mr-2"></i> Add User
                  </button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="p-6 text-center">
                  <i className="fas fa-spinner fa-spin mr-2"></i> Loading users...
                </div>
              ) : error ? (
                <div className="p-6 text-center text-red-500">
                  <i className="fas fa-exclamation-triangle mr-2"></i> Error loading users. Please try again.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers && filteredUsers.length > 0 ? (
                        filteredUsers.map((user: User) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.username}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.role === 'Administrator' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : user.role === 'Manager'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.lastActive)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.status === 'Active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center space-x-3">
                                <button 
                                  onClick={() => handleEditClick(user)}
                                  className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1 rounded-md"
                                  title="Edit User"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={() => handleDeleteClick(user)}
                                  className="text-red-600 hover:text-red-900 bg-red-50 p-1 rounded-md"
                                  title="Delete User"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                            {searchTerm ? 'No matching users found.' : 'No users available.'}
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
        isOpen={!!deletingUser}
        itemName={deletingUser?.name || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingUser(null)}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default UserManagement;

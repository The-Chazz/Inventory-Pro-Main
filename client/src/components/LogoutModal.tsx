import { useAppContext } from "@/context/AppContext";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const LogoutModal: React.FC = () => {
  const { showLogoutModal, setShowLogoutModal } = useAppContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    // Clear the user session
    sessionStorage.removeItem("user");
    
    // Close the modal
    setShowLogoutModal(false);
    
    // Show success message
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
    
    // Redirect to login page
    setLocation("/login");
  };

  const handleCancel = () => {
    setShowLogoutModal(false);
  };

  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowLogoutModal(false);
    }
  };

  if (!showLogoutModal) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOutsideClick}
    >
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Logout</h3>
        <p className="text-gray-500 mb-6">Are you sure you want to log out of Inventory Pro?</p>
        <div className="flex justify-end space-x-3">
          <button 
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md"
          >
            Cancel
          </button>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;

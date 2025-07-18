import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useSidebarState } from '@/hooks/useSidebarState';

const SidebarNew: React.FC = () => {
  const { setShowLogoutModal } = useAppContext();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [userName, setUserName] = useState("Admin User");
  const [userRole, setUserRole] = useState("Administrator");
  
  // Use the sidebar state hook for navigation items
  const { sidebarCollapsed, toggleSidebar, navItems } = useSidebarState();

  // Function to update user info from session storage
  const updateUserInfoFromSession = () => {
    try {
      const userInfo = sessionStorage.getItem("user");
      if (userInfo) {
        const user = JSON.parse(userInfo);
        // Validate user object has required properties
        if (user && typeof user === 'object') {
          setUserName(user.name || "Admin User");
          setUserRole(user.role || "Manager");
          
          // Update session with validated data if needed
          const updatedUser = {
            ...user,
            name: user.name || "Admin User",
            role: user.role || "Manager",
            lastActive: new Date().toISOString()
          };
          sessionStorage.setItem("user", JSON.stringify(updatedUser));
        } else {
          // Invalid user data, set defaults
          setUserName("Admin User");
          setUserRole("Manager");
        }
      } else {
        // No user data, set defaults
        setUserName("Admin User");
        setUserRole("Manager");
      }
    } catch (error) {
      console.error("Error parsing user info:", error);
      // On error, set defaults for safety
      setUserName("Admin User");
      setUserRole("Manager");
    }
  };

  // Update on component mount and after route changes
  useEffect(() => {
    // Initialize user info from session
    updateUserInfoFromSession();
    
    // Create an interval to check for user data changes every 2 seconds
    const checkInterval = setInterval(() => {
      updateUserInfoFromSession();
    }, 2000);
    
    return () => clearInterval(checkInterval);
  }, []);

  // Add direct logout handler function
  const handleDirectLogout = () => {
    // Clear user session
    sessionStorage.removeItem("user");
    
    // Show success message
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
    
    // Redirect to login page
    setLocation("/login");
  };

  return (
    <div className={`sidebar bg-blue-800 text-white ${sidebarCollapsed ? 'collapsed w-[70px]' : 'w-64'} flex flex-col h-full transition-all duration-300`}>
      <div className="p-4 flex items-center space-x-2 border-b border-blue-700">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <span className={`logo-text text-xl font-bold ${sidebarCollapsed ? 'hidden' : ''}`}>Inventory Pro</span>
      </div>
      
      <div className="p-4 flex justify-between items-center border-b border-blue-700">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className={`sidebar-text ${sidebarCollapsed ? 'hidden' : ''}`}>
            <div className="font-medium" id="current-user-name">{userName}</div>
            <div className="text-xs text-blue-200" id="current-user-role">{userRole}</div>
          </div>
        </div>
        <button 
          onClick={toggleSidebar} 
          className="text-blue-200 hover:text-white"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {navItems.map((item) => (
            <Link 
              key={item.id}
              href={item.path}
              className={`nav-item flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                item.isActive 
                  ? 'bg-blue-900 text-white' 
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <span className={`${sidebarCollapsed ? '' : 'mr-3'}`}>
                {item.id === 'dashboard' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h2a1 1 0 001-1V10" />
                  </svg>
                )}
                {item.id === 'inventory' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                )}
                {item.id === 'pos' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )}
                {item.id === 'sales' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {item.id === 'users' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
                {item.id === 'reports' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )}
                {item.id === 'alerts' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17V7a4 4 0 00-8 0v10m8 0H7" />
                  </svg>
                )}
                {item.id === 'losses' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                {item.id === 'profit-tracker' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {item.id === 'settings' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {item.id === 'logs' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                )}
              </span>
              <span className={`sidebar-text ${sidebarCollapsed ? 'hidden' : ''}`}>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      
      <div className="p-4 border-t border-blue-700">
        <button 
          onClick={handleDirectLogout} 
          className={`w-full flex items-center ${
            sidebarCollapsed ? 'justify-center' : ''
          } px-4 py-2 text-sm font-medium rounded-md text-blue-100 hover:bg-blue-700 hover:text-white`}
        >
          <span className={`${sidebarCollapsed ? '' : 'mr-2'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </span>
          <span className={`sidebar-text ${sidebarCollapsed ? 'hidden' : ''}`}>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default SidebarNew;
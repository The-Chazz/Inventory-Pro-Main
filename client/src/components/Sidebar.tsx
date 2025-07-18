import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Link, useLocation } from 'wouter';

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, setShowLogoutModal } = useAppContext();
  const [location] = useLocation();
  const [userName, setUserName] = useState("Admin User");
  const [userRole, setUserRole] = useState("Administrator");

  useEffect(() => {
    // Get user info from session storage
    const userInfo = sessionStorage.getItem("user");
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        setUserName(user.name || "Admin User");
        setUserRole(user.role || "Administrator");
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }
  }, []);

  // Define navigation items
  const navItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: 'fa-tachometer-alt',
      path: '/dashboard',
      isActive: location === '/dashboard' || location === '/',
    },
    { 
      id: 'inventory', 
      label: 'Inventory', 
      icon: 'fa-boxes-stacked',
      path: '/inventory',
      isActive: location === '/inventory',
    },
    { 
      id: 'pos', 
      label: 'Point of Sale', 
      icon: 'fa-cash-register',
      path: '/pos',
      isActive: location === '/pos',
    },
    { 
      id: 'users', 
      label: 'User Management', 
      icon: 'fa-users',
      path: '/users',
      isActive: location === '/users',
    },
    { 
      id: 'reports', 
      label: 'Business Analytics', 
      icon: 'fa-chart-line',
      path: '/reports',
      isActive: location === '/reports',
    },
    { 
      id: 'alerts', 
      label: 'Reorder Alerts', 
      icon: 'fa-bell',
      path: '/alerts',
      isActive: location === '/alerts',
    },
    { 
      id: 'losses', 
      label: 'Losses', 
      icon: 'fa-triangle-exclamation',
      path: '/losses',
      isActive: location === '/losses',
    },
  ];

  return (
    <div className={`sidebar bg-blue-800 text-white ${sidebarCollapsed ? 'collapsed w-[70px]' : 'w-64'} flex flex-col h-full fixed transition-all duration-300`}>
      <div className="p-4 flex items-center space-x-2 border-b border-blue-700">
        <i className="fas fa-boxes-stacked text-2xl"></i>
        <span className={`logo-text text-xl font-bold ${sidebarCollapsed ? 'hidden' : ''}`}>Inventory Pro</span>
      </div>
      
      <div className="p-4 flex justify-between items-center border-b border-blue-700">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            <i className="fas fa-user"></i>
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
          <i className={`fas ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
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
              <i className={`fas ${item.icon} ${sidebarCollapsed ? '' : 'mr-3'}`}></i>
              <span className={`sidebar-text ${sidebarCollapsed ? 'hidden' : ''}`}>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      
      <div className="p-4 border-t border-blue-700">
        <button 
          onClick={() => setShowLogoutModal(true)} 
          className={`w-full flex items-center ${
            sidebarCollapsed ? 'justify-center' : ''
          } px-4 py-2 text-sm font-medium rounded-md text-blue-100 hover:bg-blue-700 hover:text-white`}
        >
          <i className={`fas fa-sign-out-alt ${sidebarCollapsed ? '' : 'mr-2'}`}></i>
          <span className={`sidebar-text ${sidebarCollapsed ? 'hidden' : ''}`}>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

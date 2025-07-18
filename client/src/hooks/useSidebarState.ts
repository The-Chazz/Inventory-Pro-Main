import { useAppContext } from "@/context/AppContext";
import { useLocation, useRoute } from "wouter";
import { useState, useEffect } from "react";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  isActive: boolean;
  roles?: string[]; // Roles that can access this item
}

export function useSidebarState() {
  const { currentPage, sidebarCollapsed, toggleSidebar } = useAppContext();
  const [, navigate] = useLocation();
  const [userRole, setUserRole] = useState<string>("Manager"); // Default to Manager for better access
  
  // Check if route is active
  const [isDashboardActive] = useRoute("/");
  const [isDashboardExactActive] = useRoute("/dashboard");
  const [isInventoryActive] = useRoute("/inventory");
  const [isPosActive] = useRoute("/pos");
  const [isUsersActive] = useRoute("/users");
  const [isReportsActive] = useRoute("/reports");
  const [isLossesActive] = useRoute("/losses");
  const [isProfitTrackerActive] = useRoute("/profit-tracker");
  const [isSalesActive] = useRoute("/sales");
  const [isSettingsActive] = useRoute("/settings");
  const [isLogsActive] = useRoute("/logs");
  
  // Initialize session and get user role
  useEffect(() => {
    const initializeSession = () => {
      try {
        const userInfo = sessionStorage.getItem("user");
        if (userInfo) {
          const user = JSON.parse(userInfo);
          // Validate user object has required properties
          if (user && typeof user === 'object') {
            // Normalize user role to handle common variations
            const normalizeRole = (role: string): string => {
              const roleLower = role.toLowerCase();
              // Map common role variations to standard form
              switch (roleLower) {
                case 'admin':
                case 'administrator':
                  return 'Administrator';
                case 'manager':
                  return 'Manager';
                case 'cashier':
                  return 'Cashier';
                case 'stocker':
                  return 'Stocker';
                default:
                  // If no specific mapping, use title case
                  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
              }
            };
            
            // Set role with normalization and fallback to Manager for better access
            const validatedRole = normalizeRole(user.role || "Manager");
            setUserRole(validatedRole);
            
            // Update session with validated data
            const updatedUser = {
              ...user,
              role: validatedRole,
              lastActive: new Date().toISOString()
            };
            sessionStorage.setItem("user", JSON.stringify(updatedUser));
          } else {
            // Invalid user data, set default role
            setUserRole("Manager");
          }
        } else {
          // No user data, set default role
          setUserRole("Manager");
        }
      } catch (error) {
        console.error("Error parsing user info:", error);
        // On error, set default role for safety
        setUserRole("Manager");
      }
    };

    initializeSession();
  }, []);
  
  // Define all possible navigation items
  const allNavItems: NavItem[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: 'fa-tachometer-alt',
      path: '/dashboard',
      isActive: isDashboardActive || isDashboardExactActive,
      roles: ["Administrator", "Manager", "Cashier", "Stocker"] // All roles can access
    },
    { 
      id: 'inventory', 
      label: 'Inventory', 
      icon: 'fa-boxes-stacked',
      path: '/inventory',
      isActive: isInventoryActive,
      roles: ["Administrator", "Manager", "Stocker"] // Cashiers can't manage inventory
    },
    { 
      id: 'pos', 
      label: 'Point of Sale (POS)', 
      icon: 'fa-cash-register',
      path: '/pos',
      isActive: isPosActive,
      roles: ["Administrator", "Manager", "Cashier"] // All roles except stocker can access POS
    },
    { 
      id: 'sales', 
      label: 'Sales History', 
      icon: 'fa-history',
      path: '/sales',
      isActive: isSalesActive,
      roles: ["Administrator", "Manager", "Cashier"] // All roles except stocker can access sales
    },
    { 
      id: 'users', 
      label: 'User Management', 
      icon: 'fa-users',
      path: '/users',
      isActive: isUsersActive,
      roles: ["Administrator"] // Only admin can manage users
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: 'fa-chart-bar',
      path: '/reports',
      isActive: isReportsActive,
      roles: ["Administrator", "Manager"] // Only admin and manager can see reports
    },
    { 
      id: 'losses', 
      label: 'Loss Tracker', 
      icon: 'fa-triangle-exclamation',
      path: '/losses',
      isActive: isLossesActive,
      roles: ["Administrator", "Manager", "Stocker"] // Cashiers don't need access to losses
    },
    { 
      id: 'profit-tracker', 
      label: 'Profit Tracker', 
      icon: 'fa-dollar-sign',
      path: '/profit-tracker',
      isActive: isProfitTrackerActive,
      roles: ["Administrator", "Manager"] // Only admin and manager can track profits
    },
    { 
      id: 'settings', 
      label: 'Receipt Design', 
      icon: 'fa-receipt',
      path: '/settings',
      isActive: isSettingsActive,
      roles: ["Administrator", "Manager"] // Only admin and manager can access settings
    },
    { 
      id: 'logs', 
      label: 'Activity Logs', 
      icon: 'fa-list-check',
      path: '/logs',
      isActive: isLogsActive,
      roles: ["Administrator"] // Only admin can access logs
    },
  ];

  // Filter items based on user role with fallback for unknown roles
  const navItems = allNavItems.filter(item => {
    // If no roles specified, show to all users
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    
    // Always show dashboard to all authenticated users
    if (item.id === 'dashboard') {
      return true;
    }
    
    // Check if user role is in allowed roles
    if (item.roles.includes(userRole)) {
      return true;
    }
    
    // Fallback for unknown roles - show only dashboard
    if (!["Administrator", "Manager", "Cashier", "Stocker"].includes(userRole)) {
      return item.id === 'dashboard';
    }
    
    return false;
  });

  return {
    currentPage,
    sidebarCollapsed,
    toggleSidebar,
    navItems,
    navigate,
    userRole
  };
}

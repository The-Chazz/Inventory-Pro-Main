import React from 'react';
import { useAppContext, Notification } from '@/context/AppContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

/**
 * NotificationPanel Component
 * Displays a dropdown panel with all notifications
 */
const NotificationPanel: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    clearAllNotifications,
    showNotifications,
    toggleNotifications,
  } = useAppContext();

  // Stop propagation on panel click to prevent closing when clicking inside
  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!showNotifications) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-end bg-black bg-opacity-30" 
      onClick={toggleNotifications}
    >
      <div 
        className="mt-16 mr-4 w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in slide-in-from-right-4 duration-200" 
        onClick={handlePanelClick}
      >
        <Card className="bg-white rounded-md border border-gray-100">
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <i className="fas fa-bell text-blue-600 mr-2"></i>
                <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={markAllNotificationsAsRead}
                  className="text-xs bg-white hover:bg-gray-50"
                >
                  <i className="fas fa-check-double mr-1 text-blue-500"></i>
                  Read all
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearAllNotifications}
                  className="text-xs bg-white hover:bg-gray-50"
                >
                  <i className="fas fa-trash-alt mr-1 text-red-500"></i>
                  Clear all
                </Button>
              </div>
            </div>
          </div>
          
          <div className="max-h-[70vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markNotificationAsRead}
                    onClear={clearNotification}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

/**
 * Props for NotificationItem component
 */
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClear: (id: string) => void;
}

/**
 * NotificationItem Component
 * Renders a single notification with appropriate styling based on type
 */
const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onMarkAsRead,
  onClear
}) => {
  const { id, type, title, message, read, createdAt } = notification;
  
  // Format the notification timestamp
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  
  // Define styles based on notification type
  const getBgColor = () => {
    if (read) return 'bg-gray-50';
    
    switch (type) {
      case 'info': return 'bg-blue-50';
      case 'warning': return 'bg-yellow-50';
      case 'error': return 'bg-red-50';
      case 'success': return 'bg-green-50';
      default: return 'bg-gray-50';
    }
  };
  
  const getIconColor = () => {
    switch (type) {
      case 'info': return 'text-blue-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      case 'success': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };
  
  const getIcon = () => {
    switch (type) {
      case 'info':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'error':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'success':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };
  
  const handleMarkAsRead = () => {
    if (!read) {
      onMarkAsRead(id);
    }
  };
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear(id);
  };
  
  return (
    <div 
      className={`${getBgColor()} p-4 hover:bg-gray-100 cursor-pointer`} 
      onClick={handleMarkAsRead}
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 mt-0.5 ${getIconColor()}`}>
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-medium ${read ? 'text-gray-700' : 'text-gray-900'}`}>
                {title}
              </p>
              <p className={`mt-1 text-sm ${read ? 'text-gray-500' : 'text-gray-700'}`}>
                {message}
              </p>
            </div>
            <button 
              onClick={handleClear}
              className="ml-2 text-gray-400 hover:text-gray-600"
              aria-label="Clear notification"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">{timeAgo}</p>
        </div>
      </div>
      
      {!read && (
        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500"></div>
      )}
    </div>
  );
};

export default NotificationPanel;
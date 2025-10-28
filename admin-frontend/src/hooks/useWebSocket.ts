import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  notifications: Notification[];
  unreadCount: number;
  recentActivity: any[];
  systemStatus: any;
  sendMessage: (event: string, data: any) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !user) return;

    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Subscribe to relevant channels based on user role
      if (user.role === 'admin') {
        newSocket.emit('subscribe_to_orders');
        newSocket.emit('subscribe_to_customers');
        newSocket.emit('subscribe_to_manufacturing');
        newSocket.emit('subscribe_to_subscriptions');
        newSocket.emit('subscribe_to_marketing');
        newSocket.emit('subscribe_to_logistics');
      }
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Order events
    newSocket.on('order_created', (message: WebSocketMessage) => {
      console.log('New order created:', message.data);
      addToRecentActivity({
        type: 'order',
        title: 'New Order',
        description: `Order #${message.data.id} created`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    newSocket.on('order_status_changed', (message: WebSocketMessage) => {
      console.log('Order status changed:', message.data);
      addToRecentActivity({
        type: 'order',
        title: 'Order Updated',
        description: `Order #${message.data.id} status changed to ${message.data.status}`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    // Customer events
    newSocket.on('customer_registered', (message: WebSocketMessage) => {
      console.log('New customer registered:', message.data);
      addToRecentActivity({
        type: 'customer',
        title: 'New Customer',
        description: `${message.data.first_name} ${message.data.last_name} registered`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    newSocket.on('customer_updated', (message: WebSocketMessage) => {
      console.log('Customer updated:', message.data);
      addToRecentActivity({
        type: 'customer',
        title: 'Customer Updated',
        description: `${message.data.first_name} ${message.data.last_name} profile updated`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    // Manufacturing events
    newSocket.on('manufacturing_batch_created', (message: WebSocketMessage) => {
      console.log('Manufacturing batch created:', message.data);
      addToRecentActivity({
        type: 'manufacturing',
        title: 'Production Batch',
        description: `Batch #${message.data.id} created - ${message.data.quantity_produced} units`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    newSocket.on('manufacturing_batch_updated', (message: WebSocketMessage) => {
      console.log('Manufacturing batch updated:', message.data);
      addToRecentActivity({
        type: 'manufacturing',
        title: 'Batch Updated',
        description: `Batch #${message.data.id} status: ${message.data.status}`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    // Subscription events
    newSocket.on('subscription_created', (message: WebSocketMessage) => {
      console.log('Subscription created:', message.data);
      addToRecentActivity({
        type: 'subscription',
        title: 'New Subscription',
        description: `Subscription created for ${message.data.frequency} delivery`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    newSocket.on('subscription_status_changed', (message: WebSocketMessage) => {
      console.log('Subscription status changed:', message.data);
      addToRecentActivity({
        type: 'subscription',
        title: 'Subscription Updated',
        description: `Subscription status changed to ${message.data.status}`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    // Marketing events
    newSocket.on('email_campaign_sent', (message: WebSocketMessage) => {
      console.log('Email campaign sent:', message.data);
      addToRecentActivity({
        type: 'marketing',
        title: 'Email Campaign',
        description: `Campaign "${message.data.name}" sent to ${message.data.total_recipients} recipients`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    newSocket.on('sms_campaign_sent', (message: WebSocketMessage) => {
      console.log('SMS campaign sent:', message.data);
      addToRecentActivity({
        type: 'marketing',
        title: 'SMS Campaign',
        description: `SMS campaign "${message.data.name}" sent`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    // Logistics events
    newSocket.on('shipment_created', (message: WebSocketMessage) => {
      console.log('Shipment created:', message.data);
      addToRecentActivity({
        type: 'logistics',
        title: 'New Shipment',
        description: `Shipment created for order #${message.data.order_id}`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    newSocket.on('shipment_status_changed', (message: WebSocketMessage) => {
      console.log('Shipment status changed:', message.data);
      addToRecentActivity({
        type: 'logistics',
        title: 'Shipment Updated',
        description: `Shipment status changed to ${message.data.status}`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    // Notification events
    newSocket.on('notification', (message: WebSocketMessage) => {
      console.log('New notification:', message.data);
      setNotifications(prev => [message.data, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    newSocket.on('notification_count', (message: any) => {
      setUnreadCount(message.count);
    });

    // System events
    newSocket.on('system_alert', (message: WebSocketMessage) => {
      console.log('System alert:', message.data);
      addToRecentActivity({
        type: 'system',
        title: 'System Alert',
        description: message.data.message,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    newSocket.on('low_inventory', (message: WebSocketMessage) => {
      console.log('Low inventory alert:', message.data);
      addToRecentActivity({
        type: 'inventory',
        title: 'Low Inventory',
        description: `${message.data.name} is running low (${message.data.current_stock} remaining)`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    newSocket.on('high_demand', (message: WebSocketMessage) => {
      console.log('High demand alert:', message.data);
      addToRecentActivity({
        type: 'inventory',
        title: 'High Demand',
        description: `${message.data.name} has high demand (${message.data.order_count} orders)`,
        timestamp: message.timestamp,
        data: message.data
      });
    });

    // Analytics updates
    newSocket.on('analytics_update', (message: WebSocketMessage) => {
      console.log('Analytics updated:', message.data);
    });

    newSocket.on('dashboard_update', (message: WebSocketMessage) => {
      console.log('Dashboard updated:', message.data);
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, [token, user]);

  const addToRecentActivity = (activity: any) => {
    setRecentActivity(prev => {
      const newActivity = [activity, ...prev.slice(0, 19)]; // Keep last 20 activities
      return newActivity;
    });
  };

  const sendMessage = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    if (socket && isConnected) {
      socket.emit('mark_notification_read', notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, is_read: true }))
    );
    setUnreadCount(0);
  };

  return {
    socket,
    isConnected,
    notifications,
    unreadCount,
    recentActivity,
    systemStatus,
    sendMessage,
    markNotificationAsRead,
    markAllNotificationsAsRead
  };
};

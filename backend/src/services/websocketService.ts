import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { query } from './config/database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userEmail?: string;
}

interface Socket extends any {
  userId?: string;
  userRole?: string;
  userEmail?: string;
}

class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private adminConnections: Set<string> = new Set(); // socketIds of admin users

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as any;
        
        // Verify user exists and is active
        const userResult = await query(
          'SELECT id, email, role, is_active FROM users WHERE id = $1',
          [decoded.id]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
          return next(new Error('Authentication error: User not found or inactive'));
        }

        const user = userResult.rows[0];
        socket.userId = user.id;
        socket.userRole = user.role;
        socket.userEmail = user.email;

        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User connected: ${socket.userEmail} (${socket.userRole})`);
      
      // Store user connection
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
        
        // Track admin connections
        if (socket.userRole === 'admin') {
          this.adminConnections.add(socket.id);
        }
      }

      // Join user to their personal room
      if (socket.userId) {
        socket.join(`user_${socket.userId}`);
      }

      // Join admin to admin room
      if (socket.userRole === 'admin') {
        socket.join('admin_room');
      }

      // Handle subscription to specific events
      socket.on('subscribe_to_orders', () => {
        if (socket.userRole === 'admin') {
          socket.join('orders_updates');
        }
      });

      socket.on('subscribe_to_customers', () => {
        if (socket.userRole === 'admin') {
          socket.join('customers_updates');
        }
      });

      socket.on('subscribe_to_manufacturing', () => {
        if (socket.userRole === 'admin') {
          socket.join('manufacturing_updates');
        }
      });

      socket.on('subscribe_to_subscriptions', () => {
        if (socket.userRole === 'admin') {
          socket.join('subscriptions_updates');
        }
      });

      socket.on('subscribe_to_marketing', () => {
        if (socket.userRole === 'admin') {
          socket.join('marketing_updates');
        }
      });

      socket.on('subscribe_to_logistics', () => {
        if (socket.userRole === 'admin') {
          socket.join('logistics_updates');
        }
      });

      // Handle real-time notifications
      socket.on('mark_notification_read', async (notificationId: string) => {
        try {
          await query(
            'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
            [notificationId, socket.userId]
          );
          
          // Send updated notification count
          this.sendNotificationCount(socket.userId!);
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data: { room: string; user: string }) => {
        socket.to(data.room).emit('user_typing', { user: data.user, typing: true });
      });

      socket.on('typing_stop', (data: { room: string; user: string }) => {
        socket.to(data.room).emit('user_typing', { user: data.user, typing: false });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userEmail}`);
        
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
        }
        
        if (socket.userRole === 'admin') {
          this.adminConnections.delete(socket.id);
        }
      });
    });
  }

  // Order Events
  public notifyOrderCreated(order: any) {
    this.io.to('admin_room').to('orders_updates').emit('order_created', {
      type: 'order_created',
      data: order,
      timestamp: new Date().toISOString()
    });

    // Notify customer
    if (order.user_id) {
      this.io.to(`user_${order.user_id}`).emit('order_created', {
        type: 'order_created',
        data: order,
        timestamp: new Date().toISOString()
      });
    }
  }

  public notifyOrderStatusChanged(order: any) {
    this.io.to('admin_room').to('orders_updates').emit('order_status_changed', {
      type: 'order_status_changed',
      data: order,
      timestamp: new Date().toISOString()
    });

    // Notify customer
    if (order.user_id) {
      this.io.to(`user_${order.user_id}`).emit('order_status_changed', {
        type: 'order_status_changed',
        data: order,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Customer Events
  public notifyCustomerRegistered(customer: any) {
    this.io.to('admin_room').to('customers_updates').emit('customer_registered', {
      type: 'customer_registered',
      data: customer,
      timestamp: new Date().toISOString()
    });
  }

  public notifyCustomerUpdated(customer: any) {
    this.io.to('admin_room').to('customers_updates').emit('customer_updated', {
      type: 'customer_updated',
      data: customer,
      timestamp: new Date().toISOString()
    });
  }

  // Manufacturing Events
  public notifyManufacturingBatchCreated(batch: any) {
    this.io.to('admin_room').to('manufacturing_updates').emit('manufacturing_batch_created', {
      type: 'manufacturing_batch_created',
      data: batch,
      timestamp: new Date().toISOString()
    });
  }

  public notifyManufacturingBatchUpdated(batch: any) {
    this.io.to('admin_room').to('manufacturing_updates').emit('manufacturing_batch_updated', {
      type: 'manufacturing_batch_updated',
      data: batch,
      timestamp: new Date().toISOString()
    });
  }

  // Subscription Events
  public notifySubscriptionCreated(subscription: any) {
    this.io.to('admin_room').to('subscriptions_updates').emit('subscription_created', {
      type: 'subscription_created',
      data: subscription,
      timestamp: new Date().toISOString()
    });

    // Notify customer
    if (subscription.user_id) {
      this.io.to(`user_${subscription.user_id}`).emit('subscription_created', {
        type: 'subscription_created',
        data: subscription,
        timestamp: new Date().toISOString()
      });
    }
  }

  public notifySubscriptionStatusChanged(subscription: any) {
    this.io.to('admin_room').to('subscriptions_updates').emit('subscription_status_changed', {
      type: 'subscription_status_changed',
      data: subscription,
      timestamp: new Date().toISOString()
    });

    // Notify customer
    if (subscription.user_id) {
      this.io.to(`user_${subscription.user_id}`).emit('subscription_status_changed', {
        type: 'subscription_status_changed',
        data: subscription,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Marketing Events
  public notifyEmailCampaignSent(campaign: any) {
    this.io.to('admin_room').to('marketing_updates').emit('email_campaign_sent', {
      type: 'email_campaign_sent',
      data: campaign,
      timestamp: new Date().toISOString()
    });
  }

  public notifySMSCampaignSent(campaign: any) {
    this.io.to('admin_room').to('marketing_updates').emit('sms_campaign_sent', {
      type: 'sms_campaign_sent',
      data: campaign,
      timestamp: new Date().toISOString()
    });
  }

  // Logistics Events
  public notifyShipmentCreated(shipment: any) {
    this.io.to('admin_room').to('logistics_updates').emit('shipment_created', {
      type: 'shipment_created',
      data: shipment,
      timestamp: new Date().toISOString()
    });

    // Notify customer
    if (shipment.customer_id) {
      this.io.to(`user_${shipment.customer_id}`).emit('shipment_created', {
        type: 'shipment_created',
        data: shipment,
        timestamp: new Date().toISOString()
      });
    }
  }

  public notifyShipmentStatusChanged(shipment: any) {
    this.io.to('admin_room').to('logistics_updates').emit('shipment_status_changed', {
      type: 'shipment_status_changed',
      data: shipment,
      timestamp: new Date().toISOString()
    });

    // Notify customer
    if (shipment.customer_id) {
      this.io.to(`user_${shipment.customer_id}`).emit('shipment_status_changed', {
        type: 'shipment_status_changed',
        data: shipment,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Notification System
  public async sendNotification(userId: string, notification: any) {
    try {
      // Save notification to database
      const result = await query(
        `INSERT INTO notifications (user_id, title, message, type, data, is_read)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`,
        [userId, notification.title, notification.message, notification.type, notification.data]
      );

      // Send real-time notification
      this.io.to(`user_${userId}`).emit('notification', {
        type: 'notification',
        data: result.rows[0],
        timestamp: new Date().toISOString()
      });

      // Update notification count
      this.sendNotificationCount(userId);

      return result.rows[0];
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  public async sendNotificationCount(userId: string) {
    try {
      const result = await query(
        'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
        [userId]
      );

      this.io.to(`user_${userId}`).emit('notification_count', {
        type: 'notification_count',
        count: parseInt(result.rows[0].unread_count),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending notification count:', error);
    }
  }

  // System Events
  public notifySystemAlert(alert: any) {
    this.io.to('admin_room').emit('system_alert', {
      type: 'system_alert',
      data: alert,
      timestamp: new Date().toISOString()
    });
  }

  public notifyLowInventory(product: any) {
    this.io.to('admin_room').emit('low_inventory', {
      type: 'low_inventory',
      data: product,
      timestamp: new Date().toISOString()
    });
  }

  public notifyHighDemand(product: any) {
    this.io.to('admin_room').emit('high_demand', {
      type: 'high_demand',
      data: product,
      timestamp: new Date().toISOString()
    });
  }

  // Analytics Updates
  public notifyAnalyticsUpdate(analytics: any) {
    this.io.to('admin_room').emit('analytics_update', {
      type: 'analytics_update',
      data: analytics,
      timestamp: new Date().toISOString()
    });
  }

  // Live Dashboard Updates
  public notifyDashboardUpdate(update: any) {
    this.io.to('admin_room').emit('dashboard_update', {
      type: 'dashboard_update',
      data: update,
      timestamp: new Date().toISOString()
    });
  }

  // Get connected users count
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get admin connections count
  public getAdminConnectionsCount(): number {
    return this.adminConnections.size;
  }

  // Send message to specific user
  public sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Send message to all admins
  public sendToAdmins(event: string, data: any) {
    this.io.to('admin_room').emit(event, data);
  }

  // Send message to all connected users
  public broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }
}

export default WebSocketService;




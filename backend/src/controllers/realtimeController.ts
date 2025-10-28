import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Real-time notifications controller
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const userId = req.user?.id;

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId];
    let paramCount = 1;

    if (unread_only === 'true') {
      paramCount++;
      whereClause += ` AND is_read = false`;
    }

    params.push(Number(limit), offset);

    const result = await query(`
      SELECT * FROM notifications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countResult = await query(`
      SELECT COUNT(*) as total FROM notifications ${whereClause}
    `, params.slice(0, -2));

    res.status(200).json({
      success: true,
      notifications: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id;

    const result = await query(
      'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const result = await query(
      'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false RETURNING COUNT(*) as updated_count',
      [userId]
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      updatedCount: parseInt(result.rows[0].updated_count)
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
  }
};

export const getUnreadNotificationCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const result = await query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.status(200).json({
      success: true,
      unreadCount: parseInt(result.rows[0].unread_count)
    });
  } catch (error) {
    console.error('Get unread notification count error:', error);
    res.status(500).json({ success: false, message: 'Failed to get unread notification count' });
  }
};

// Real-time dashboard data
export const getLiveDashboardData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = '24' } = req.query;

    // Get real-time metrics
    const [
      ordersResult,
      customersResult,
      revenueResult,
      manufacturingResult,
      subscriptionsResult,
      marketingResult
    ] = await Promise.all([
      // Recent orders
      query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '${period} hours' THEN 1 END) as recent_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as avg_order_value
        FROM orders 
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${period} hours'
      `),
      
      // Recent customers
      query(`
        SELECT 
          COUNT(*) as new_customers,
          COUNT(CASE WHEN last_login >= CURRENT_TIMESTAMP - INTERVAL '${period} hours' THEN 1 END) as active_customers
        FROM users 
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${period} hours' OR last_login >= CURRENT_TIMESTAMP - INTERVAL '${period} hours'
      `),
      
      // Revenue metrics
      query(`
        SELECT 
          SUM(total_amount) as total_revenue,
          COUNT(*) as order_count,
          AVG(total_amount) as avg_order_value
        FROM orders 
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${period} hours'
      `),
      
      // Manufacturing metrics
      query(`
        SELECT 
          COUNT(*) as batches_created,
          SUM(quantity_produced) as total_produced,
          AVG(quality_score) as avg_quality_score
        FROM manufacturing_batches 
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${period} hours'
      `),
      
      // Subscription metrics
      query(`
        SELECT 
          COUNT(*) as subscriptions_created,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions
        FROM subscriptions 
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${period} hours'
      `),
      
      // Marketing metrics
      query(`
        SELECT 
          COUNT(*) as campaigns_sent,
          SUM(total_recipients) as total_recipients,
          SUM(delivered_count) as total_delivered
        FROM email_campaigns 
        WHERE sent_at >= CURRENT_TIMESTAMP - INTERVAL '${period} hours'
      `)
    ]);

    // Get recent activities
    const recentActivities = await query(`
      SELECT 
        'order' as type,
        'New Order' as title,
        CONCAT('Order #', o.id, ' placed by ', u.first_name, ' ', u.last_name) as description,
        o.created_at as timestamp,
        o.total_amount as amount
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.created_at >= CURRENT_TIMESTAMP - INTERVAL '${period} hours'
      
      UNION ALL
      
      SELECT 
        'customer' as type,
        'New Customer' as title,
        CONCAT(u.first_name, ' ', u.last_name, ' registered') as description,
        u.created_at as timestamp,
        NULL as amount
      FROM users u
      WHERE u.created_at >= CURRENT_TIMESTAMP - INTERVAL '${period} hours'
      
      UNION ALL
      
      SELECT 
        'manufacturing' as type,
        'Production Batch' as title,
        CONCAT('Batch #', mb.id, ' - ', mb.quantity_produced, ' units produced') as description,
        mb.created_at as timestamp,
        NULL as amount
      FROM manufacturing_batches mb
      WHERE mb.created_at >= CURRENT_TIMESTAMP - INTERVAL '${period} hours'
      
      ORDER BY timestamp DESC
      LIMIT 20
    `);

    res.status(200).json({
      success: true,
      data: {
        orders: ordersResult.rows[0],
        customers: customersResult.rows[0],
        revenue: revenueResult.rows[0],
        manufacturing: manufacturingResult.rows[0],
        subscriptions: subscriptionsResult.rows[0],
        marketing: marketingResult.rows[0],
        recentActivities: recentActivities.rows
      }
    });
  } catch (error) {
    console.error('Get live dashboard data error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch live dashboard data' });
  }
};

// Real-time order tracking
export const getOrderTracking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    // Get order details
    const orderResult = await query(`
      SELECT 
        o.*,
        u.first_name,
        u.last_name,
        u.email,
        s.tracking_number,
        s.status as shipment_status,
        s.courier_name,
        s.awb_code
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN shipments s ON o.id = s.order_id
      WHERE o.id = $1 AND (o.user_id = $2 OR $3 = 'admin')
    `, [orderId, userId, req.user?.role]);

    if (orderResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const order = orderResult.rows[0];

    // Get order status history
    const statusHistoryResult = await query(`
      SELECT 
        osh.*,
        u.first_name,
        u.last_name
      FROM order_status_history osh
      LEFT JOIN users u ON osh.updated_by = u.id
      WHERE osh.order_id = $1
      ORDER BY osh.created_at ASC
    `, [orderId]);

    // Get shipment tracking if exists
    let shipmentTracking = [];
    if (order.tracking_number) {
      const trackingResult = await query(`
        SELECT *
        FROM shipment_tracking
        WHERE shipment_id = (SELECT id FROM shipments WHERE order_id = $1)
        ORDER BY event_time ASC
      `, [orderId]);
      shipmentTracking = trackingResult.rows;
    }

    res.status(200).json({
      success: true,
      order: order,
      statusHistory: statusHistoryResult.rows,
      shipmentTracking: shipmentTracking
    });
  } catch (error) {
    console.error('Get order tracking error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order tracking' });
  }
};

// Real-time inventory alerts
export const getInventoryAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Low inventory alerts
    const lowInventoryResult = await query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        pv.size,
        pv.unit,
        iv.current_stock,
        iv.min_stock_level,
        (iv.min_stock_level - iv.current_stock) as shortage
      FROM products p
      JOIN product_variants pv ON p.id = pv.product_id
      JOIN inventory_movements iv ON pv.id = iv.variant_id
      WHERE iv.current_stock <= iv.min_stock_level
      ORDER BY shortage DESC
    `);

    // High demand alerts
    const highDemandResult = await query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as total_quantity,
        AVG(oi.quantity) as avg_quantity_per_order
      FROM products p
      JOIN product_variants pv ON p.id = pv.product_id
      JOIN order_items oi ON pv.id = oi.variant_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY p.id, p.name, p.sku
      HAVING COUNT(oi.id) >= 5
      ORDER BY order_count DESC
    `);

    res.status(200).json({
      success: true,
      alerts: {
        lowInventory: lowInventoryResult.rows,
        highDemand: highDemandResult.rows
      }
    });
  } catch (error) {
    console.error('Get inventory alerts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory alerts' });
  }
};

// Real-time system status
export const getSystemStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const webSocketService = (req as any).app.get('webSocketService');
    
    // Get system metrics
    const [
      dbStatusResult,
      redisStatusResult,
      websocketConnectionsResult
    ] = await Promise.all([
      // Database status
      query('SELECT 1 as status'),
      
      // Redis status (if available)
      Promise.resolve({ rows: [{ status: 1 }] }), // Mock for now
      
      // WebSocket connections
      Promise.resolve({ 
        rows: [{ 
          total_connections: webSocketService?.getConnectedUsersCount() || 0,
          admin_connections: webSocketService?.getAdminConnectionsCount() || 0
        }] 
      })
    ]);

    res.status(200).json({
      success: true,
      status: {
        database: dbStatusResult.rows[0].status === 1 ? 'online' : 'offline',
        redis: redisStatusResult.rows[0].status === 1 ? 'online' : 'offline',
        websocket: {
          totalConnections: websocketConnectionsResult.rows[0].total_connections,
          adminConnections: websocketConnectionsResult.rows[0].admin_connections
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system status' });
  }
};





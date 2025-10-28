import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, shipping_address, payment_method, notes } = req.body;
    const userId = req.user?.id;

    if (!items || items.length === 0) {
      res.status(400).json({ success: false, message: 'Order items are required' });
      return;
    }

    // Calculate total amount
    let totalAmount = 0;
    for (const item of items) {
      const variantResult = await query(
        'SELECT price FROM product_variants WHERE id = $1',
        [item.variant_id]
      );
      if (variantResult.rows.length === 0) {
        res.status(400).json({ success: false, message: `Product variant ${item.variant_id} not found` });
        return;
      }
      totalAmount += variantResult.rows[0].price * item.quantity;
    }

    // Create order
    const orderResult = await query(
      `INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_method, notes)
       VALUES ($1, $2, 'pending', $3, $4, $5)
       RETURNING *`,
      [userId, totalAmount, shipping_address, payment_method, notes]
    );

    const order = orderResult.rows[0];

    // Create order items
    for (const item of items) {
      const variantResult = await query(
        'SELECT price FROM product_variants WHERE id = $1',
        [item.variant_id]
      );
      
      await query(
        `INSERT INTO order_items (order_id, variant_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.variant_id, item.quantity, variantResult.rows[0].price]
      );
    }

    // Notify via WebSocket
    const webSocketService = (req as any).app.get('webSocketService');
    if (webSocketService) {
      webSocketService.notifyOrderCreated(order);
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};

export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, search, date_from, date_to } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    let queryParams: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += `WHERE (o.order_number ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      const statusCondition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${statusCondition} o.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (date_from) {
      paramCount++;
      const dateCondition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${dateCondition} o.created_at >= $${paramCount}`;
      queryParams.push(date_from);
    }

    if (date_to) {
      paramCount++;
      const dateCondition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${dateCondition} o.created_at <= $${paramCount}`;
      queryParams.push(date_to);
    }

    const ordersQuery = `
      SELECT 
        o.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        COUNT(oi.id) as item_count,
        SUM(oi.quantity * oi.price) as total_amount
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id, u.first_name, u.last_name, u.email, u.phone
      ORDER BY o.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(Number(limit), offset);

    const result = await query(ordersQuery, queryParams);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM orders o LEFT JOIN users u ON o.user_id = u.id ${whereClause}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      orders: result.rows,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get order details
    const orderResult = await query(
      `SELECT o.*, u.first_name, u.last_name, u.email, u.phone
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Get order items
    const itemsResult = await query(
      `SELECT oi.*, p.name as product_name, pv.name as variant_name
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_variants pv ON oi.variant_id = pv.id
       WHERE oi.order_id = $1`,
      [id]
    );

    // Get order status history
    const statusHistoryResult = await query(
      `SELECT * FROM order_status_history
       WHERE order_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    const order = orderResult.rows[0];
    order.items = itemsResult.rows;
    order.status_history = statusHistoryResult.rows;

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = (req as any).user?.id;

    // Valid statuses
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    // Start transaction
    await query('BEGIN');

    // Update order status
    const orderResult = await query(
      `UPDATE orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (orderResult.rows.length === 0) {
      await query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Add status history
    await query(
      `INSERT INTO order_status_history (order_id, status, notes, created_by)
       VALUES ($1, $2, $3, $4)`,
      [id, status, notes || '', userId]
    );

    await query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order: orderResult.rows[0]
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};

export const updateOrderShipping = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      shipping_method, 
      tracking_number, 
      shipping_address, 
      estimated_delivery,
      shipping_cost 
    } = req.body;

    const orderResult = await query(
      `UPDATE orders 
       SET shipping_method = $1, tracking_number = $2, shipping_address = $3, 
           estimated_delivery = $4, shipping_cost = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [shipping_method, tracking_number, shipping_address, estimated_delivery, shipping_cost, id]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Shipping information updated successfully',
      order: orderResult.rows[0]
    });
  } catch (error) {
    console.error('Update shipping error:', error);
    res.status(500).json({ success: false, message: 'Failed to update shipping information' });
  }
};

export const getOrderAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query; // days

    // Total orders and revenue
    const totalsResult = await query(
      `SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value
       FROM orders 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
       AND status != 'cancelled'`
    );

    // Orders by status
    const statusResult = await query(
      `SELECT 
        status,
        COUNT(*) as count,
        SUM(total_amount) as revenue
       FROM orders 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
       GROUP BY status
       ORDER BY count DESC`
    );

    // Daily sales trend
    const trendResult = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue
       FROM orders 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
       AND status != 'cancelled'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // Top products
    const productsResult = await query(
      `SELECT 
        p.name as product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.price) as total_revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.created_at >= CURRENT_DATE - INTERVAL '${period} days'
       AND o.status != 'cancelled'
       GROUP BY p.id, p.name
       ORDER BY total_quantity DESC
       LIMIT 10`
    );

    res.status(200).json({
      success: true,
      analytics: {
        totals: totalsResult.rows[0],
        statusBreakdown: statusResult.rows,
        dailyTrend: trendResult.rows,
        topProducts: productsResult.rows
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

export const bulkUpdateOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { order_ids, action, value } = req.body;
    const userId = (req as any).user?.id;

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      res.status(400).json({ success: false, message: 'Invalid order IDs' });
      return;
    }

    // Start transaction
    await query('BEGIN');

    let updateQuery = '';
    let queryParams: any[] = [];

    switch (action) {
      case 'update_status':
        updateQuery = `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2)`;
        queryParams = [value, order_ids];
        break;
      case 'assign_shipping':
        updateQuery = `UPDATE orders SET shipping_method = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2)`;
        queryParams = [value, order_ids];
        break;
      default:
        await query('ROLLBACK');
        res.status(400).json({ success: false, message: 'Invalid action' });
        return;
    }

    const result = await query(updateQuery, queryParams);

    // Add status history for each order
    if (action === 'update_status') {
      for (const orderId of order_ids) {
        await query(
          `INSERT INTO order_status_history (order_id, status, notes, created_by)
           VALUES ($1, $2, $3, $4)`,
          [orderId, value, 'Bulk status update', userId]
        );
      }
    }

    await query('COMMIT');

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.rowCount} orders`,
      updatedCount: result.rowCount
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Bulk update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update orders' });
  }
};
import { Request, Response } from 'express';
import { query } from '../config/database';

export const getAllSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, frequency, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    let queryParams: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += `WHERE s.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (frequency) {
      paramCount++;
      const frequencyCondition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${frequencyCondition} s.frequency = $${paramCount}`;
      queryParams.push(frequency);
    }

    if (search) {
      paramCount++;
      const searchCondition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${searchCondition} (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR p.name ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    const subscriptionsQuery = `
      SELECT 
        s.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        p.name as product_name,
        pv.name as variant_name,
        pv.price as variant_price,
        CASE 
          WHEN s.status = 'active' AND s.next_delivery_date <= CURRENT_DATE THEN 'due'
          WHEN s.status = 'active' THEN 'active'
          WHEN s.status = 'paused' THEN 'paused'
          WHEN s.status = 'cancelled' THEN 'cancelled'
          ELSE s.status
        END as display_status
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN product_variants pv ON s.variant_id = pv.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(Number(limit), offset);

    const result = await query(subscriptionsQuery, queryParams);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM subscriptions s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN products p ON s.product_id = p.id ${whereClause}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      subscriptions: result.rows,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
  }
};

export const getSubscriptionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const subscriptionResult = await query(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.phone, p.name as product_name, pv.name as variant_name, pv.price as variant_price
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN products p ON s.product_id = p.id
       LEFT JOIN product_variants pv ON s.variant_id = pv.id
       WHERE s.id = $1`,
      [id]
    );

    if (subscriptionResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    // Get delivery history
    const deliveryHistoryResult = await query(
      `SELECT * FROM subscription_deliveries
       WHERE subscription_id = $1
       ORDER BY delivery_date DESC`,
      [id]
    );

    const subscription = subscriptionResult.rows[0];
    subscription.delivery_history = deliveryHistoryResult.rows;

    res.status(200).json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscription' });
  }
};

export const createSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      user_id,
      product_id,
      variant_id,
      frequency,
      quantity,
      delivery_address,
      delivery_instructions,
      start_date,
      end_date,
      payment_method,
      discount_percentage
    } = req.body;

    // Start transaction
    await query('BEGIN');

    // Calculate next delivery date
    const startDate = new Date(start_date);
    const nextDeliveryDate = new Date(startDate);
    
    switch (frequency) {
      case 'weekly':
        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 14);
        break;
      case 'monthly':
        nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 3);
        break;
    }

    // Create subscription
    const subscriptionResult = await query(
      `INSERT INTO subscriptions (user_id, product_id, variant_id, frequency, quantity, delivery_address, delivery_instructions, start_date, end_date, next_delivery_date, payment_method, discount_percentage, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
       RETURNING *`,
      [user_id, product_id, variant_id, frequency, quantity, delivery_address, delivery_instructions, start_date, end_date, nextDeliveryDate.toISOString().split('T')[0], payment_method, discount_percentage]
    );

    const subscription = subscriptionResult.rows[0];

    await query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      subscription
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Create subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to create subscription' });
  }
};

export const updateSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      frequency,
      quantity,
      delivery_address,
      delivery_instructions,
      end_date,
      payment_method,
      discount_percentage,
      status
    } = req.body;

    // Start transaction
    await query('BEGIN');

    // If frequency changed, recalculate next delivery date
    let updateFields = 'frequency = $1, quantity = $2, delivery_address = $3, delivery_instructions = $4, end_date = $5, payment_method = $6, discount_percentage = $7, status = $8, updated_at = CURRENT_TIMESTAMP';
    let queryParams = [frequency, quantity, delivery_address, delivery_instructions, end_date, payment_method, discount_percentage, status];

    if (frequency) {
      // Get current subscription to calculate new next delivery date
      const currentSubResult = await query('SELECT next_delivery_date FROM subscriptions WHERE id = $1', [id]);
      if (currentSubResult.rows.length > 0) {
        const currentNextDelivery = new Date(currentSubResult.rows[0].next_delivery_date);
        const newNextDelivery = new Date(currentNextDelivery);
        
        switch (frequency) {
          case 'weekly':
            newNextDelivery.setDate(newNextDelivery.getDate() + 7);
            break;
          case 'biweekly':
            newNextDelivery.setDate(newNextDelivery.getDate() + 14);
            break;
          case 'monthly':
            newNextDelivery.setMonth(newNextDelivery.getMonth() + 1);
            break;
          case 'quarterly':
            newNextDelivery.setMonth(newNextDelivery.getMonth() + 3);
            break;
        }
        
        updateFields += ', next_delivery_date = $9';
        queryParams.push(newNextDelivery.toISOString().split('T')[0]);
      }
    }

    queryParams.push(id);

    const subscriptionResult = await query(
      `UPDATE subscriptions 
       SET ${updateFields}
       WHERE id = $${queryParams.length}
       RETURNING *`,
      queryParams
    );

    if (subscriptionResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    await query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: subscriptionResult.rows[0]
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Update subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to update subscription' });
  }
};

export const pauseSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { pause_reason, pause_until } = req.body;

    const subscriptionResult = await query(
      `UPDATE subscriptions 
       SET status = 'paused', pause_reason = $1, pause_until = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [pause_reason, pause_until, id]
    );

    if (subscriptionResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Subscription paused successfully',
      subscription: subscriptionResult.rows[0]
    });
  } catch (error) {
    console.error('Pause subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to pause subscription' });
  }
};

export const resumeSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Calculate new next delivery date
    const currentDate = new Date();
    const subscriptionResult = await query(
      `UPDATE subscriptions 
       SET status = 'active', pause_reason = NULL, pause_until = NULL, next_delivery_date = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [currentDate.toISOString().split('T')[0], id]
    );

    if (subscriptionResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Subscription resumed successfully',
      subscription: subscriptionResult.rows[0]
    });
  } catch (error) {
    console.error('Resume subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to resume subscription' });
  }
};

export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    const subscriptionResult = await query(
      `UPDATE subscriptions 
       SET status = 'cancelled', cancellation_reason = $1, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [cancellation_reason, id]
    );

    if (subscriptionResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: subscriptionResult.rows[0]
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel subscription' });
  }
};

export const processSubscriptionDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { delivery_date, tracking_number, delivery_notes } = req.body;

    // Start transaction
    await query('BEGIN');

    // Create delivery record
    const deliveryResult = await query(
      `INSERT INTO subscription_deliveries (subscription_id, delivery_date, tracking_number, delivery_notes, status)
       VALUES ($1, $2, $3, $4, 'delivered')
       RETURNING *`,
      [id, delivery_date, tracking_number, delivery_notes]
    );

    // Update subscription next delivery date
    const subscriptionResult = await query('SELECT frequency, next_delivery_date FROM subscriptions WHERE id = $1', [id]);
    if (subscriptionResult.rows.length > 0) {
      const { frequency, next_delivery_date } = subscriptionResult.rows[0];
      const currentDeliveryDate = new Date(delivery_date);
      const nextDeliveryDate = new Date(currentDeliveryDate);
      
      switch (frequency) {
        case 'weekly':
          nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 7);
          break;
        case 'biweekly':
          nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 14);
          break;
        case 'monthly':
          nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 3);
          break;
      }

      await query(
        `UPDATE subscriptions 
         SET next_delivery_date = $1, last_delivery_date = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [nextDeliveryDate.toISOString().split('T')[0], delivery_date, id]
      );
    }

    await query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Delivery processed successfully',
      delivery: deliveryResult.rows[0]
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Process delivery error:', error);
    res.status(500).json({ success: false, message: 'Failed to process delivery' });
  }
};

export const getSubscriptionAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;

    // Subscription metrics
    const metricsResult = await query(`
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_subscriptions,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '${period} days' THEN 1 END) as new_subscriptions,
        AVG(CASE WHEN status = 'active' THEN quantity ELSE NULL END) as avg_quantity
      FROM subscriptions
    `);

    // Revenue from subscriptions
    const revenueResult = await query(`
      SELECT 
        SUM(s.quantity * pv.price * (1 - COALESCE(s.discount_percentage, 0) / 100)) as total_revenue,
        COUNT(sd.id) as total_deliveries,
        AVG(s.quantity * pv.price * (1 - COALESCE(s.discount_percentage, 0) / 100)) as avg_delivery_value
      FROM subscriptions s
      LEFT JOIN product_variants pv ON s.variant_id = pv.id
      LEFT JOIN subscription_deliveries sd ON s.id = sd.subscription_id
      WHERE s.status = 'active'
      AND sd.delivery_date >= CURRENT_DATE - INTERVAL '${period} days'
    `);

    // Frequency breakdown
    const frequencyResult = await query(`
      SELECT 
        frequency,
        COUNT(*) as count,
        AVG(quantity) as avg_quantity
      FROM subscriptions
      WHERE status = 'active'
      GROUP BY frequency
      ORDER BY count DESC
    `);

    // Monthly subscription trends
    const trendsResult = await query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_subscriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions
      FROM subscriptions
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);

    res.status(200).json({
      success: true,
      analytics: {
        metrics: metricsResult.rows[0],
        revenue: revenueResult.rows[0],
        frequency: frequencyResult.rows,
        trends: trendsResult.rows
      }
    });
  } catch (error) {
    console.error('Get subscription analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscription analytics' });
  }
};

export const getUpcomingDeliveries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = 7 } = req.query;

    const deliveriesResult = await query(`
      SELECT 
        s.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        p.name as product_name,
        pv.name as variant_name,
        pv.price as variant_price,
        EXTRACT(DAYS FROM (s.next_delivery_date - CURRENT_DATE)) as days_until_delivery
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN product_variants pv ON s.variant_id = pv.id
      WHERE s.status = 'active'
      AND s.next_delivery_date <= CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY s.next_delivery_date ASC
    `);

    res.status(200).json({
      success: true,
      deliveries: deliveriesResult.rows
    });
  } catch (error) {
    console.error('Get upcoming deliveries error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming deliveries' });
  }
};
import { Request, Response } from 'express';
import { query } from '../config/database';

export const getCustomerSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { status } = req.query;

    let whereClause = 'WHERE s.user_id = $1';
    let queryParams: any[] = [userId];

    if (status) {
      queryParams.push(status);
      whereClause += ' AND s.status = $2';
    }

    const subscriptionsQuery = `
      SELECT 
        s.*,
        p.name as product_name,
        p.description as product_description,
        p.image_url as product_image,
        pv.name as variant_name,
        pv.price as variant_price,
        pv.image_url as variant_image,
        CASE 
          WHEN s.status = 'active' AND s.next_delivery_date <= CURRENT_DATE THEN 'due'
          WHEN s.status = 'active' THEN 'active'
          WHEN s.status = 'paused' THEN 'paused'
          WHEN s.status = 'cancelled' THEN 'cancelled'
          ELSE s.status
        END as display_status
      FROM subscriptions s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN product_variants pv ON s.variant_id = pv.id
      ${whereClause}
      ORDER BY s.created_at DESC
    `;

    const result = await query(subscriptionsQuery, queryParams);

    res.status(200).json({
      success: true,
      subscriptions: result.rows
    });
  } catch (error) {
    console.error('Get customer subscriptions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
  }
};

export const getCustomerSubscriptionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const subscriptionResult = await query(
      `SELECT s.*, p.name as product_name, p.description as product_description, p.image_url as product_image, pv.name as variant_name, pv.price as variant_price, pv.image_url as variant_image
       FROM subscriptions s
       LEFT JOIN products p ON s.product_id = p.id
       LEFT JOIN product_variants pv ON s.variant_id = pv.id
       WHERE s.id = $1 AND s.user_id = $2`,
      [id, userId]
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
    console.error('Get customer subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscription' });
  }
};

export const createCustomerSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const {
      product_id,
      variant_id,
      frequency,
      quantity,
      start_date
    } = req.body;

    // Start transaction
    await query('BEGIN');

    // Calculate next delivery date
    const startDate = new Date(start_date || new Date());
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
      `INSERT INTO subscriptions (user_id, product_id, variant_id, frequency, quantity, next_delivery_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [userId, product_id, variant_id, frequency, quantity, nextDeliveryDate.toISOString().split('T')[0]]
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
    console.error('Create customer subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to create subscription' });
  }
};

export const updateCustomerSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const {
      frequency,
      quantity
    } = req.body;

    // Start transaction
    await query('BEGIN');

    // If frequency changed, recalculate next delivery date
    let updateFields = 'frequency = $1, quantity = $2, updated_at = CURRENT_TIMESTAMP';
    let queryParams = [frequency, quantity];

    if (frequency) {
      // Get current subscription to calculate new next delivery date
      const currentSubResult = await query('SELECT next_delivery_date FROM subscriptions WHERE id = $1 AND user_id = $2', [id, userId]);
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
        
        updateFields += ', next_delivery_date = $3';
        queryParams.push(newNextDelivery.toISOString().split('T')[0]);
      }
    }

    queryParams.push(id, userId);

    const subscriptionResult = await query(
      `UPDATE subscriptions 
       SET ${updateFields}
       WHERE id = $${queryParams.length - 1} AND user_id = $${queryParams.length}
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
    console.error('Update customer subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to update subscription' });
  }
};

export const pauseCustomerSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { pause_until } = req.body;

    const subscriptionResult = await query(
      `UPDATE subscriptions 
       SET status = 'paused', pause_until = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [pause_until, id, userId]
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
    console.error('Pause customer subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to pause subscription' });
  }
};

export const resumeCustomerSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    // Calculate new next delivery date
    const currentDate = new Date();
    const subscriptionResult = await query(
      `UPDATE subscriptions 
       SET status = 'active', pause_until = NULL, next_delivery_date = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [currentDate.toISOString().split('T')[0], id, userId]
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
    console.error('Resume customer subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to resume subscription' });
  }
};

export const cancelCustomerSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const subscriptionResult = await query(
      `UPDATE subscriptions 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
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
    console.error('Cancel customer subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel subscription' });
  }
};

export const getCustomerSubscriptionAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    // Customer subscription metrics
    const metricsResult = await query(`
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_subscriptions,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
        AVG(CASE WHEN status = 'active' THEN quantity ELSE NULL END) as avg_quantity
      FROM subscriptions
      WHERE user_id = $1
    `, [userId]);

    // Total savings from subscriptions
    const savingsResult = await query(`
      SELECT 
        SUM(s.quantity * pv.price * 0.1) as estimated_savings
      FROM subscriptions s
      LEFT JOIN product_variants pv ON s.variant_id = pv.id
      WHERE s.user_id = $1 AND s.status = 'active'
    `, [userId]);

    // Frequency breakdown
    const frequencyResult = await query(`
      SELECT 
        frequency,
        COUNT(*) as count,
        AVG(quantity) as avg_quantity
      FROM subscriptions
      WHERE user_id = $1 AND status = 'active'
      GROUP BY frequency
      ORDER BY count DESC
    `, [userId]);

    res.status(200).json({
      success: true,
      analytics: {
        metrics: metricsResult.rows[0],
        savings: savingsResult.rows[0],
        frequency: frequencyResult.rows
      }
    });
  } catch (error) {
    console.error('Get customer subscription analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscription analytics' });
  }
};

export const getAvailableProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const productsResult = await query(`
      SELECT 
        p.*,
        COUNT(pv.id) as variant_count,
        MIN(pv.price) as min_price,
        MAX(pv.price) as max_price
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE p.is_active = true
      GROUP BY p.id
      ORDER BY p.name ASC
    `);

    // Get variants for each product
    const products = productsResult.rows;
    for (let product of products) {
      const variantsResult = await query(
        `SELECT * FROM product_variants WHERE product_id = $1 ORDER BY price ASC`,
        [product.id]
      );
      product.variants = variantsResult.rows;
    }

    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Get available products error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};








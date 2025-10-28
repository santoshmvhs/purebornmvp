import { Request, Response } from 'express';
import { query } from '../config/database';
import crypto from 'crypto';

// Additional E-commerce Features Controller
export const getRecentlyViewed = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { limit = 10 } = req.query;

    const result = await query(`
      SELECT 
        rv.*,
        p.name as product_name,
        p.image_url as product_image,
        p.average_rating,
        p.review_count,
        MIN(pv.price) as min_price,
        MAX(pv.price) as max_price
      FROM recently_viewed rv
      LEFT JOIN products p ON rv.product_id = p.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE rv.user_id = $1
      GROUP BY rv.id, p.id
      ORDER BY rv.viewed_at DESC
      LIMIT $2
    `, [userId, limit]);

    res.status(200).json({
      success: true,
      recentlyViewed: result.rows
    });
  } catch (error) {
    console.error('Get recently viewed error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recently viewed' });
  }
};

export const addToRecentlyViewed = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { product_id } = req.params;
    const sessionId = req.headers['x-session-id'] as string;

    await query(`
      INSERT INTO recently_viewed (user_id, product_id, session_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, product_id) 
      DO UPDATE SET viewed_at = CURRENT_TIMESTAMP, session_id = $3
    `, [userId, product_id, sessionId]);

    res.status(200).json({
      success: true,
      message: 'Added to recently viewed'
    });
  } catch (error) {
    console.error('Add to recently viewed error:', error);
    res.status(500).json({ success: false, message: 'Failed to add to recently viewed' });
  }
};

export const getFrequentlyBoughtTogether = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { limit = 5 } = req.query;

    const result = await query(`
      SELECT 
        fbt.*,
        p.name as product_name,
        p.image_url as product_image,
        p.average_rating,
        p.review_count,
        MIN(pv.price) as min_price,
        MAX(pv.price) as max_price
      FROM frequently_bought_together fbt
      LEFT JOIN products p ON fbt.related_product_id = p.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE fbt.product_id = $1 AND p.is_active = true
      GROUP BY fbt.id, p.id
      ORDER BY fbt.confidence_score DESC, fbt.frequency DESC
      LIMIT $2
    `, [productId, limit]);

    res.status(200).json({
      success: true,
      frequentlyBoughtTogether: result.rows
    });
  } catch (error) {
    console.error('Get frequently bought together error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch frequently bought together' });
  }
};

export const getAbandonedCarts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hours = 24, limit = 50 } = req.query;

    const result = await query(`
      SELECT 
        ac.*,
        u.first_name,
        u.last_name,
        u.email
      FROM abandoned_carts ac
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE ac.abandoned_at >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
      AND ac.recovery_email_sent = false
      ORDER BY ac.abandoned_at DESC
      LIMIT $1
    `, [limit]);

    res.status(200).json({
      success: true,
      abandonedCarts: result.rows
    });
  } catch (error) {
    console.error('Get abandoned carts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch abandoned carts' });
  }
};

export const createGiftCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { amount, recipient_email, recipient_name, message, expires_at } = req.body;

    // Generate unique gift card code
    const code = 'GC' + crypto.randomBytes(6).toString('hex').toUpperCase();

    const result = await query(
      `INSERT INTO gift_cards (code, amount, remaining_amount, created_by, purchased_by, recipient_email, recipient_name, message, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [code, amount, amount, userId, userId, recipient_email, recipient_name, message, expires_at]
    );

    res.status(201).json({
      success: true,
      message: 'Gift card created successfully',
      giftCard: result.rows[0]
    });
  } catch (error) {
    console.error('Create gift card error:', error);
    res.status(500).json({ success: false, message: 'Failed to create gift card' });
  }
};

export const validateGiftCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;

    const result = await query(
      `SELECT * FROM gift_cards 
       WHERE code = $1 AND status = 'active' 
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [code]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Invalid or expired gift card' });
      return;
    }

    res.status(200).json({
      success: true,
      giftCard: result.rows[0]
    });
  } catch (error) {
    console.error('Validate gift card error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate gift card' });
  }
};

// Enhanced Payment & Financial Features Controller
export const getPaymentMethods = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const result = await query(
      `SELECT * FROM payment_methods 
       WHERE user_id = $1 AND is_active = true 
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      paymentMethods: result.rows
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment methods' });
  }
};

export const addPaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { method_type, provider, token, last_four, expiry_month, expiry_year, is_default } = req.body;

    // If setting as default, unset other defaults
    if (is_default) {
      await query(
        'UPDATE payment_methods SET is_default = false WHERE user_id = $1',
        [userId]
      );
    }

    const result = await query(
      `INSERT INTO payment_methods (user_id, method_type, provider, token, last_four, expiry_month, expiry_year, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, method_type, provider, token, last_four, expiry_month, expiry_year, is_default]
    );

    res.status(201).json({
      success: true,
      message: 'Payment method added successfully',
      paymentMethod: result.rows[0]
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ success: false, message: 'Failed to add payment method' });
  }
};

export const createRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { order_id, amount, reason } = req.body;

    // Verify order belongs to user
    const orderResult = await query(
      'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
      [order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Get payment transaction
    const paymentResult = await query(
      'SELECT * FROM payment_transactions WHERE order_id = $1 AND status = $2',
      [order_id, 'success']
    );

    if (paymentResult.rows.length === 0) {
      res.status(400).json({ success: false, message: 'No successful payment found for this order' });
      return;
    }

    const result = await query(
      `INSERT INTO refunds (order_id, payment_transaction_id, amount, reason, processed_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [order_id, paymentResult.rows[0].id, amount, reason, userId]
    );

    res.status(201).json({
      success: true,
      message: 'Refund request submitted successfully',
      refund: result.rows[0]
    });
  } catch (error) {
    console.error('Create refund error:', error);
    res.status(500).json({ success: false, message: 'Failed to create refund request' });
  }
};

export const generateInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    // Get order details
    const orderResult = await query(`
      SELECT 
        o.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const order = orderResult.rows[0];

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const result = await query(
      `INSERT INTO invoices (order_id, invoice_number, invoice_date, subtotal, tax_amount, discount_amount, total_amount)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6)
       RETURNING *`,
      [orderId, invoiceNumber, order.total_amount, 0, 0, order.total_amount]
    );

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      invoice: result.rows[0]
    });
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate invoice' });
  }
};

// Logistics & Delivery Management Controller (Shiprocket Integration)
export const createShipment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { shipping_provider_id, weight, dimensions, special_instructions } = req.body;

    // Get order details
    const orderResult = await query(`
      SELECT 
        o.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const order = orderResult.rows[0];

    // Generate tracking number
    const trackingNumber = 'SR' + crypto.randomBytes(8).toString('hex').toUpperCase();

    const result = await query(
      `INSERT INTO shipments (order_id, shipping_provider_id, tracking_number, weight, dimensions, shipping_address, special_instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [orderId, shipping_provider_id, trackingNumber, weight, dimensions, order.shipping_address, special_instructions]
    );

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      shipment: result.rows[0]
    });
  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({ success: false, message: 'Failed to create shipment' });
  }
};

export const trackShipment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trackingNumber } = req.params;

    const shipmentResult = await query(`
      SELECT 
        s.*,
        o.order_number,
        u.first_name,
        u.last_name
      FROM shipments s
      LEFT JOIN orders o ON s.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE s.tracking_number = $1
    `, [trackingNumber]);

    if (shipmentResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Shipment not found' });
      return;
    }

    const trackingResult = await query(
      `SELECT * FROM shipment_tracking 
       WHERE shipment_id = $1 
       ORDER BY timestamp DESC`,
      [shipmentResult.rows[0].id]
    );

    res.status(200).json({
      success: true,
      shipment: shipmentResult.rows[0],
      tracking: trackingResult.rows
    });
  } catch (error) {
    console.error('Track shipment error:', error);
    res.status(500).json({ success: false, message: 'Failed to track shipment' });
  }
};

// Marketing & Customer Engagement Controller
export const createEmailCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { name, subject, content, campaign_type, target_audience, scheduled_at } = req.body;

    const result = await query(
      `INSERT INTO email_campaigns (name, subject, content, campaign_type, target_audience, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, subject, content, campaign_type, target_audience, scheduled_at, userId]
    );

    res.status(201).json({
      success: true,
      message: 'Email campaign created successfully',
      campaign: result.rows[0]
    });
  } catch (error) {
    console.error('Create email campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to create email campaign' });
  }
};

export const createPromotionalCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, valid_from, valid_until, applicable_products, applicable_categories } = req.body;

    const result = await query(
      `INSERT INTO promotional_codes (code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, valid_from, valid_until, applicable_products, applicable_categories, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, valid_from, valid_until, applicable_products, applicable_categories, userId]
    );

    res.status(201).json({
      success: true,
      message: 'Promotional code created successfully',
      promotionalCode: result.rows[0]
    });
  } catch (error) {
    console.error('Create promotional code error:', error);
    res.status(500).json({ success: false, message: 'Failed to create promotional code' });
  }
};

export const validatePromotionalCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const { order_amount, user_id } = req.query;

    const result = await query(
      `SELECT * FROM promotional_codes 
       WHERE code = $1 AND is_active = true 
       AND valid_from <= CURRENT_TIMESTAMP 
       AND valid_until >= CURRENT_TIMESTAMP
       AND (usage_limit IS NULL OR used_count < usage_limit)
       AND (min_order_amount IS NULL OR min_order_amount <= $2)`,
      [code, order_amount]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Invalid or expired promotional code' });
      return;
    }

    const promotionalCode = result.rows[0];
    let discountAmount = 0;

    if (promotionalCode.discount_type === 'percentage') {
      discountAmount = (parseFloat(order_amount as string) * promotionalCode.discount_value) / 100;
      if (promotionalCode.max_discount_amount) {
        discountAmount = Math.min(discountAmount, promotionalCode.max_discount_amount);
      }
    } else if (promotionalCode.discount_type === 'fixed') {
      discountAmount = promotionalCode.discount_value;
    }

    res.status(200).json({
      success: true,
      promotionalCode: promotionalCode,
      discountAmount: discountAmount
    });
  } catch (error) {
    console.error('Validate promotional code error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate promotional code' });
  }
};

// Multi-channel Integration Controller
export const getMarketplaceIntegrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT 
        id, marketplace, is_active, sync_enabled, last_sync_at, created_at
       FROM marketplace_integrations 
       ORDER BY marketplace ASC`
    );

    res.status(200).json({
      success: true,
      integrations: result.rows
    });
  } catch (error) {
    console.error('Get marketplace integrations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch marketplace integrations' });
  }
};

export const syncMarketplaceProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { marketplace } = req.params;

    // Update last sync time
    await query(
      'UPDATE marketplace_integrations SET last_sync_at = CURRENT_TIMESTAMP WHERE marketplace = $1',
      [marketplace]
    );

    res.status(200).json({
      success: true,
      message: `${marketplace} products sync initiated`
    });
  } catch (error) {
    console.error('Sync marketplace products error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync marketplace products' });
  }
};

// Security & Compliance Controller
export const logSecurityEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { action, resource, success, failure_reason, metadata } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    await query(
      `INSERT INTO security_logs (user_id, action, resource, ip_address, user_agent, success, failure_reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, action, resource, ipAddress, userAgent, success, failure_reason, metadata]
    );

    res.status(200).json({
      success: true,
      message: 'Security event logged successfully'
    });
  } catch (error) {
    console.error('Log security event error:', error);
    res.status(500).json({ success: false, message: 'Failed to log security event' });
  }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, action, table_name, user_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    let queryParams: any[] = [];
    let paramCount = 0;

    if (action) {
      paramCount++;
      whereClause += ` AND action = $${paramCount}`;
      queryParams.push(action);
    }

    if (table_name) {
      paramCount++;
      whereClause += ` AND table_name = $${paramCount}`;
      queryParams.push(table_name);
    }

    if (user_id) {
      paramCount++;
      whereClause += ` AND user_id = $${paramCount}`;
      queryParams.push(user_id);
    }

    queryParams.push(Number(limit), offset);

    const result = await query(`
      SELECT 
        al.*,
        u.first_name,
        u.last_name,
        u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);

    const countResult = await query(`
      SELECT COUNT(*) as total FROM audit_logs ${whereClause}
    `, queryParams.slice(0, -2));

    res.status(200).json({
      success: true,
      auditLogs: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
};

export const createDataPrivacyRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { request_type } = req.body;

    const result = await query(
      `INSERT INTO data_privacy_requests (user_id, request_type)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, request_type]
    );

    res.status(201).json({
      success: true,
      message: 'Data privacy request submitted successfully',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Create data privacy request error:', error);
    res.status(500).json({ success: false, message: 'Failed to create data privacy request' });
  }
};









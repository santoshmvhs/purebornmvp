import { Request, Response } from 'express';
import { query } from '../config/database';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';

// Customer Profile Management
export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, search, role, status, segment, sort_by = 'created_at', sort_order = 'desc' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.phone ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (role) {
      paramCount++;
      whereClause += ` AND u.role = $${paramCount}`;
      params.push(role);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND u.is_active = $${paramCount}`;
      params.push(status === 'active');
    }

    if (segment) {
      paramCount++;
      whereClause += ` AND u.id IN (SELECT user_id FROM customer_segment_members WHERE segment_id = $${paramCount})`;
      params.push(segment);
    }

    params.push(Number(limit), offset);

    const result = await query(`
      SELECT 
        u.*,
        cp.current_balance as loyalty_points,
        cp.points_earned as total_points_earned,
        cp.points_redeemed as total_points_redeemed,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        MAX(o.created_at) as last_order_date,
        MIN(o.created_at) as first_order_date,
        COUNT(DISTINCT s.id) as total_subscriptions,
        COUNT(DISTINCT w.id) as wishlist_items,
        COUNT(DISTINCT r.id) as total_reviews
      FROM users u
      LEFT JOIN customer_points cp ON u.id = cp.user_id
      LEFT JOIN orders o ON u.id = o.user_id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      LEFT JOIN wishlists w ON u.id = w.user_id
      LEFT JOIN reviews r ON u.id = r.user_id
      ${whereClause}
      GROUP BY u.id, cp.current_balance, cp.points_earned, cp.points_redeemed
      ORDER BY u.${sort_by} ${sort_order}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countResult = await query(`
      SELECT COUNT(*) as total FROM users u ${whereClause}
    `, params.slice(0, -2));

    res.status(200).json({
      success: true,
      customers: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;

    const customerResult = await query(`
      SELECT 
        u.*,
        cp.current_balance as loyalty_points,
        cp.points_earned as total_points_earned,
        cp.points_redeemed as total_points_redeemed,
        cp.last_activity as last_points_activity
      FROM users u
      LEFT JOIN customer_points cp ON u.id = cp.user_id
      WHERE u.id = $1
    `, [customerId]);

    if (customerResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    const customer = customerResult.rows[0];

    // Get customer orders
    const ordersResult = await query(`
      SELECT o.*, COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `, [customerId]);

    // Get customer subscriptions
    const subscriptionsResult = await query(`
      SELECT s.*, p.name as product_name
      FROM subscriptions s
      LEFT JOIN products p ON s.product_id = p.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
    `, [customerId]);

    // Get customer wishlist
    const wishlistResult = await query(`
      SELECT w.*, p.name as product_name, p.price, p.image_url
      FROM wishlists w
      LEFT JOIN products p ON w.product_id = p.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `, [customerId]);

    // Get customer reviews
    const reviewsResult = await query(`
      SELECT r.*, p.name as product_name
      FROM reviews r
      LEFT JOIN products p ON r.product_id = p.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `, [customerId]);

    // Get customer segments
    const segmentsResult = await query(`
      SELECT cs.*, csm.joined_at
      FROM customer_segments cs
      JOIN customer_segment_members csm ON cs.id = csm.segment_id
      WHERE csm.user_id = $1
    `, [customerId]);

    // Get points transactions
    const pointsResult = await query(`
      SELECT pt.*, lp.name as loyalty_program_name
      FROM points_transactions pt
      LEFT JOIN loyalty_programs lp ON pt.loyalty_program_id = lp.id
      WHERE pt.user_id = $1
      ORDER BY pt.created_at DESC
      LIMIT 20
    `, [customerId]);

    res.status(200).json({
      success: true,
      customer: {
        ...customer,
        orders: ordersResult.rows,
        subscriptions: subscriptionsResult.rows,
        wishlist: wishlistResult.rows,
        reviews: reviewsResult.rows,
        segments: segmentsResult.rows,
        pointsTransactions: pointsResult.rows
      }
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer details' });
  }
};

export const updateCustomerProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      date_of_birth, 
      gender, 
      address, 
      city, 
      state, 
      pincode, 
      country,
      preferences,
      is_active 
    } = req.body;

    const result = await query(`
      UPDATE users 
      SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        date_of_birth = COALESCE($5, date_of_birth),
        gender = COALESCE($6, gender),
        address = COALESCE($7, address),
        city = COALESCE($8, city),
        state = COALESCE($9, state),
        pincode = COALESCE($10, pincode),
        country = COALESCE($11, country),
        preferences = COALESCE($12, preferences),
        is_active = COALESCE($13, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [first_name, last_name, email, phone, date_of_birth, gender, address, city, state, pincode, country, preferences, is_active, customerId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Customer profile updated successfully',
      customer: result.rows[0]
    });
  } catch (error) {
    console.error('Update customer profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update customer profile' });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      first_name, 
      last_name, 
      email, 
      password, 
      phone, 
      date_of_birth, 
      gender, 
      address, 
      city, 
      state, 
      pincode, 
      country,
      preferences,
      role = 'customer'
    } = req.body;

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      res.status(400).json({ success: false, message: 'Email already exists' });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await query(`
      INSERT INTO users (
        first_name, last_name, email, password_hash, phone, date_of_birth, 
        gender, address, city, state, pincode, country, preferences, role, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
      RETURNING id, first_name, last_name, email, phone, role, created_at
    `, [
      first_name, last_name, email, passwordHash, phone, date_of_birth,
      gender, address, city, state, pincode, country, preferences, role
    ]);

    // Create customer points record
    await query(
      'INSERT INTO customer_points (user_id) VALUES ($1)',
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer: result.rows[0]
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ success: false, message: 'Failed to create customer' });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;

    // Check if customer has orders
    const ordersResult = await query('SELECT COUNT(*) FROM orders WHERE user_id = $1', [customerId]);
    if (parseInt(ordersResult.rows[0].count) > 0) {
      res.status(400).json({ 
        success: false, 
        message: 'Cannot delete customer with existing orders. Consider deactivating instead.' 
      });
      return;
    }

    // Soft delete by deactivating
    const result = await query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [customerId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Customer deactivated successfully',
      customer: result.rows[0]
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete customer' });
  }
};

// Customer Segmentation Management
export const getCustomerSegments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        cs.*,
        u.first_name,
        u.last_name,
        u.email as creator_email,
        COUNT(csm.user_id) as member_count
      FROM customer_segments cs
      LEFT JOIN users u ON cs.created_by = u.id
      LEFT JOIN customer_segment_members csm ON cs.id = csm.segment_id
      WHERE cs.is_active = true
      GROUP BY cs.id, u.first_name, u.last_name, u.email
      ORDER BY cs.created_at DESC
    `);

    res.status(200).json({
      success: true,
      segments: result.rows
    });
  } catch (error) {
    console.error('Get customer segments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer segments' });
  }
};

export const createCustomerSegment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, description, criteria, auto_update = true } = req.body;

    const result = await query(`
      INSERT INTO customer_segments (name, description, criteria, auto_update, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, description, criteria, auto_update, userId]);

    // If auto_update is enabled, populate the segment
    if (auto_update) {
      await populateCustomerSegment(result.rows[0].id, criteria);
    }

    res.status(201).json({
      success: true,
      message: 'Customer segment created successfully',
      segment: result.rows[0]
    });
  } catch (error) {
    console.error('Create customer segment error:', error);
    res.status(500).json({ success: false, message: 'Failed to create customer segment' });
  }
};

export const populateCustomerSegment = async (segmentId: number, criteria: any): Promise<void> => {
  try {
    // Clear existing members
    await query('DELETE FROM customer_segment_members WHERE segment_id = $1', [segmentId]);

    let whereClause = 'WHERE u.is_active = true';
    const params: any[] = [];
    let paramCount = 0;

    if (criteria.min_orders) {
      paramCount++;
      whereClause += ` AND (SELECT COUNT(*) FROM orders WHERE user_id = u.id) >= $${paramCount}`;
      params.push(criteria.min_orders);
    }

    if (criteria.min_spent) {
      paramCount++;
      whereClause += ` AND (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = u.id) >= $${paramCount}`;
      params.push(criteria.min_spent);
    }

    if (criteria.last_order_days) {
      paramCount++;
      whereClause += ` AND (SELECT MAX(created_at) FROM orders WHERE user_id = u.id) >= CURRENT_DATE - INTERVAL '${criteria.last_order_days} days'`;
    }

    if (criteria.registration_days) {
      paramCount++;
      whereClause += ` AND u.created_at >= CURRENT_DATE - INTERVAL '${criteria.registration_days} days'`;
    }

    if (criteria.has_subscription) {
      whereClause += ` AND u.id IN (SELECT user_id FROM subscriptions WHERE status = 'active')`;
    }

    if (criteria.gender) {
      paramCount++;
      whereClause += ` AND u.gender = $${paramCount}`;
      params.push(criteria.gender);
    }

    if (criteria.city) {
      paramCount++;
      whereClause += ` AND u.city ILIKE $${paramCount}`;
      params.push(`%${criteria.city}%`);
    }

    if (criteria.state) {
      paramCount++;
      whereClause += ` AND u.state ILIKE $${paramCount}`;
      params.push(`%${criteria.state}%`);
    }

    // Get matching customers
    const customersResult = await query(`
      SELECT u.id FROM users u ${whereClause}
    `, params);

    // Add customers to segment
    for (const customer of customersResult.rows) {
      await query(`
        INSERT INTO customer_segment_members (segment_id, user_id, joined_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (segment_id, user_id) DO NOTHING
      `, [segmentId, customer.id]);
    }

    // Update segment member count
    await query(`
      UPDATE customer_segments 
      SET customer_count = (SELECT COUNT(*) FROM customer_segment_members WHERE segment_id = $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [segmentId]);

  } catch (error) {
    console.error('Populate customer segment error:', error);
  }
};

export const addCustomerToSegment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { segmentId, customerId } = req.params;

    const result = await query(`
      INSERT INTO customer_segment_members (segment_id, user_id, joined_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (segment_id, user_id) DO NOTHING
      RETURNING *
    `, [segmentId, customerId]);

    if (result.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Customer already in segment' });
      return;
    }

    // Update segment member count
    await query(`
      UPDATE customer_segments 
      SET customer_count = (SELECT COUNT(*) FROM customer_segment_members WHERE segment_id = $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [segmentId]);

    res.status(200).json({
      success: true,
      message: 'Customer added to segment successfully',
      membership: result.rows[0]
    });
  } catch (error) {
    console.error('Add customer to segment error:', error);
    res.status(500).json({ success: false, message: 'Failed to add customer to segment' });
  }
};

export const removeCustomerFromSegment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { segmentId, customerId } = req.params;

    const result = await query(`
      DELETE FROM customer_segment_members 
      WHERE segment_id = $1 AND user_id = $2
      RETURNING *
    `, [segmentId, customerId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Customer not found in segment' });
      return;
    }

    // Update segment member count
    await query(`
      UPDATE customer_segments 
      SET customer_count = (SELECT COUNT(*) FROM customer_segment_members WHERE segment_id = $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [segmentId]);

    res.status(200).json({
      success: true,
      message: 'Customer removed from segment successfully'
    });
  } catch (error) {
    console.error('Remove customer from segment error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove customer from segment' });
  }
};

// Customer Analytics
export const getCustomerAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;

    // Customer overview
    const overviewResult = await query(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_customers,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '${period} days' THEN 1 END) as new_customers,
        COUNT(CASE WHEN role = 'customer' THEN 1 END) as customer_role_count,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_role_count
      FROM users
    `);

    // Customer acquisition trends
    const acquisitionResult = await query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as new_customers
      FROM users 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `);

    // Customer value analysis
    const valueResult = await query(`
      SELECT 
        CASE 
          WHEN total_spent >= 10000 THEN 'High Value'
          WHEN total_spent >= 5000 THEN 'Medium Value'
          WHEN total_spent >= 1000 THEN 'Low Value'
          ELSE 'No Purchase'
        END as value_segment,
        COUNT(*) as customer_count,
        AVG(total_spent) as avg_spent
      FROM (
        SELECT 
          u.id,
          COALESCE(SUM(o.total_amount), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.is_active = true
        GROUP BY u.id
      ) customer_values
      GROUP BY value_segment
    `);

    // Geographic distribution
    const geoResult = await query(`
      SELECT 
        state,
        COUNT(*) as customer_count,
        AVG(COALESCE(total_spent, 0)) as avg_spent
      FROM (
        SELECT 
          u.state,
          COALESCE(SUM(o.total_amount), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.is_active = true AND u.state IS NOT NULL
        GROUP BY u.id, u.state
      ) geo_data
      GROUP BY state
      ORDER BY customer_count DESC
      LIMIT 10
    `);

    // Customer engagement metrics
    const engagementResult = await query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_customers,
        COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN u.id END) as customers_with_orders,
        COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN u.id END) as customers_with_subscriptions,
        COUNT(DISTINCT CASE WHEN w.id IS NOT NULL THEN u.id END) as customers_with_wishlist,
        COUNT(DISTINCT CASE WHEN r.id IS NOT NULL THEN u.id END) as customers_with_reviews
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      LEFT JOIN wishlists w ON u.id = w.user_id
      LEFT JOIN reviews r ON u.id = r.user_id
      WHERE u.is_active = true
    `);

    res.status(200).json({
      success: true,
      analytics: {
        overview: overviewResult.rows[0],
        acquisition: acquisitionResult.rows,
        valueSegments: valueResult.rows,
        geographic: geoResult.rows,
        engagement: engagementResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Get customer analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer analytics' });
  }
};

// Customer Communication
export const sendCustomerMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const { message_type, subject, content, channel = 'email' } = req.body;

    // Get customer details
    const customerResult = await query('SELECT * FROM users WHERE id = $1', [customerId]);
    if (customerResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    const customer = customerResult.rows[0];

    // Log the communication
    await query(`
      INSERT INTO customer_communications (user_id, message_type, subject, content, channel, sent_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [customerId, message_type, subject, content, channel, req.user?.id]);

    res.status(200).json({
      success: true,
      message: 'Customer message sent successfully',
      communication: {
        customer: customer.email,
        channel,
        message_type,
        subject
      }
    });
  } catch (error) {
    console.error('Send customer message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send customer message' });
  }
};

export const getCustomerCommunications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await query(`
      SELECT 
        cc.*,
        u.first_name,
        u.last_name,
        u.email as sent_by_email
      FROM customer_communications cc
      LEFT JOIN users u ON cc.sent_by = u.id
      WHERE cc.user_id = $1
      ORDER BY cc.created_at DESC
      LIMIT $2 OFFSET $3
    `, [customerId, Number(limit), offset]);

    const countResult = await query(
      'SELECT COUNT(*) FROM customer_communications WHERE user_id = $1',
      [customerId]
    );

    res.status(200).json({
      success: true,
      communications: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get customer communications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer communications' });
  }
};




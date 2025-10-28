import { Request, Response } from 'express';
import { query } from '../config/database';
import nodemailer from 'nodemailer';
import axios from 'axios';

// Email Service Integration
class EmailMarketingService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendBulkEmail(recipients: string[], subject: string, htmlContent: string): Promise<any> {
    try {
      const results = [];
      for (const recipient of recipients) {
        const info = await this.transporter.sendMail({
          from: `"Pureborn" <${process.env.SMTP_USER}>`,
          to: recipient,
          subject,
          html: htmlContent,
        });
        results.push({ recipient, messageId: info.messageId, success: true });
      }
      return { success: true, results };
    } catch (error) {
      console.error('Bulk email error:', error);
      return { success: false, error: (error as Error).message };
    }
  }
}

// SMS Service Integration
class SMSMarketingService {
  private apiUrl = 'https://api.textlocal.in/send/';
  private apiKey = process.env.TEXTLOCAL_API_KEY;

  async sendBulkSMS(recipients: string[], message: string): Promise<any> {
    try {
      const response = await axios.post(this.apiUrl, {
        apikey: this.apiKey,
        numbers: recipients.join(','),
        message,
        sender: 'PUREBN'
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Bulk SMS error:', error);
      return { success: false, error: (error as Error).message };
    }
  }
}

const emailService = new EmailMarketingService();
const smsService = new SMSMarketingService();

// Email Campaigns Controller
export const getEmailCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, status, campaign_type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (campaign_type) {
      paramCount++;
      whereClause += ` AND campaign_type = $${paramCount}`;
      params.push(campaign_type);
    }

    params.push(Number(limit), offset);

    const result = await query(`
      SELECT 
        ec.*,
        u.first_name,
        u.last_name,
        u.email as creator_email
      FROM email_campaigns ec
      LEFT JOIN users u ON ec.created_by = u.id
      ${whereClause}
      ORDER BY ec.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countResult = await query(`
      SELECT COUNT(*) as total FROM email_campaigns ${whereClause}
    `, params.slice(0, -2));

    res.status(200).json({
      success: true,
      campaigns: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get email campaigns error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email campaigns' });
  }
};

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

export const sendEmailCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    // Get campaign details
    const campaignResult = await query(
      'SELECT * FROM email_campaigns WHERE id = $1',
      [campaignId]
    );

    if (campaignResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    const campaign = campaignResult.rows[0];

    // Get target audience based on campaign criteria
    let recipients: string[] = [];
    
    if (campaign.target_audience?.segment) {
      const segmentResult = await query(`
        SELECT DISTINCT u.email 
        FROM users u
        WHERE u.is_active = true
        AND u.email IS NOT NULL
        ${campaign.target_audience.segment === 'all' ? '' : 
          campaign.target_audience.segment === 'subscribers' ? 'AND u.id IN (SELECT user_id FROM subscriptions WHERE status = \'active\')' :
          campaign.target_audience.segment === 'customers' ? 'AND u.id IN (SELECT user_id FROM orders)' :
          ''}
      `);
      recipients = segmentResult.rows.map(row => row.email);
    } else if (campaign.target_audience?.emails) {
      recipients = campaign.target_audience.emails;
    }

    if (recipients.length === 0) {
      res.status(400).json({ success: false, message: 'No recipients found for this campaign' });
      return;
    }

    // Send emails
    const emailResult = await emailService.sendBulkEmail(
      recipients,
      campaign.subject,
      campaign.content
    );

    if (emailResult.success) {
      // Update campaign status
      await query(
        `UPDATE email_campaigns 
         SET status = 'sent', sent_at = CURRENT_TIMESTAMP, total_recipients = $1, delivered_count = $2
         WHERE id = $3`,
        [recipients.length, emailResult.results.filter((r: any) => r.success).length, campaignId]
      );

      res.status(200).json({
        success: true,
        message: 'Email campaign sent successfully',
        recipients: recipients.length,
        delivered: emailResult.results.filter((r: any) => r.success).length
      });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send email campaign' });
    }
  } catch (error) {
    console.error('Send email campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to send email campaign' });
  }
};

// SMS Campaigns Controller
export const getSMSCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, status, campaign_type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (campaign_type) {
      paramCount++;
      whereClause += ` AND campaign_type = $${paramCount}`;
      params.push(campaign_type);
    }

    params.push(Number(limit), offset);

    const result = await query(`
      SELECT 
        sc.*,
        u.first_name,
        u.last_name,
        u.email as creator_email
      FROM sms_campaigns sc
      LEFT JOIN users u ON sc.created_by = u.id
      ${whereClause}
      ORDER BY sc.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countResult = await query(`
      SELECT COUNT(*) as total FROM sms_campaigns ${whereClause}
    `, params.slice(0, -2));

    res.status(200).json({
      success: true,
      campaigns: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get SMS campaigns error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch SMS campaigns' });
  }
};

export const createSMSCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { name, message, campaign_type, target_audience, scheduled_at } = req.body;

    const result = await query(
      `INSERT INTO sms_campaigns (name, message, campaign_type, target_audience, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, message, campaign_type, target_audience, scheduled_at, userId]
    );

    res.status(201).json({
      success: true,
      message: 'SMS campaign created successfully',
      campaign: result.rows[0]
    });
  } catch (error) {
    console.error('Create SMS campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to create SMS campaign' });
  }
};

export const sendSMSCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    // Get campaign details
    const campaignResult = await query(
      'SELECT * FROM sms_campaigns WHERE id = $1',
      [campaignId]
    );

    if (campaignResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    const campaign = campaignResult.rows[0];

    // Get target audience phone numbers
    let recipients: string[] = [];
    
    if (campaign.target_audience?.segment) {
      const segmentResult = await query(`
        SELECT DISTINCT u.phone 
        FROM users u
        WHERE u.is_active = true
        AND u.phone IS NOT NULL
        ${campaign.target_audience.segment === 'all' ? '' : 
          campaign.target_audience.segment === 'subscribers' ? 'AND u.id IN (SELECT user_id FROM subscriptions WHERE status = \'active\')' :
          campaign.target_audience.segment === 'customers' ? 'AND u.id IN (SELECT user_id FROM orders)' :
          ''}
      `);
      recipients = segmentResult.rows.map(row => row.phone).filter(phone => phone);
    } else if (campaign.target_audience?.phones) {
      recipients = campaign.target_audience.phones;
    }

    if (recipients.length === 0) {
      res.status(400).json({ success: false, message: 'No recipients found for this campaign' });
      return;
    }

    // Send SMS
    const smsResult = await smsService.sendBulkSMS(recipients, campaign.message);

    if (smsResult.success) {
      // Update campaign status
      await query(
        `UPDATE sms_campaigns 
         SET status = 'sent', sent_at = CURRENT_TIMESTAMP, total_recipients = $1, delivered_count = $2
         WHERE id = $3`,
        [recipients.length, smsResult.data?.messages_sent || recipients.length, campaignId]
      );

      res.status(200).json({
        success: true,
        message: 'SMS campaign sent successfully',
        recipients: recipients.length,
        delivered: smsResult.data?.messages_sent || recipients.length
      });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send SMS campaign' });
    }
  } catch (error) {
    console.error('Send SMS campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to send SMS campaign' });
  }
};

// Promotional Codes Controller
export const getPromotionalCodes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, is_active, discount_type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (is_active !== undefined) {
      paramCount++;
      whereClause += ` AND is_active = $${paramCount}`;
      params.push(is_active === 'true');
    }

    if (discount_type) {
      paramCount++;
      whereClause += ` AND discount_type = $${paramCount}`;
      params.push(discount_type);
    }

    params.push(Number(limit), offset);

    const result = await query(`
      SELECT 
        pc.*,
        u.first_name,
        u.last_name,
        u.email as creator_email
      FROM promotional_codes pc
      LEFT JOIN users u ON pc.created_by = u.id
      ${whereClause}
      ORDER BY pc.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countResult = await query(`
      SELECT COUNT(*) as total FROM promotional_codes ${whereClause}
    `, params.slice(0, -2));

    res.status(200).json({
      success: true,
      promotionalCodes: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get promotional codes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promotional codes' });
  }
};

export const createPromotionalCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { 
      code, 
      name, 
      description, 
      discount_type, 
      discount_value, 
      min_order_amount, 
      max_discount_amount, 
      usage_limit, 
      valid_from, 
      valid_until, 
      applicable_products, 
      applicable_categories 
    } = req.body;

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

export const usePromotionalCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const { order_id } = req.body;

    // Validate code
    const codeResult = await query(
      `SELECT * FROM promotional_codes 
       WHERE code = $1 AND is_active = true 
       AND valid_from <= CURRENT_TIMESTAMP 
       AND valid_until >= CURRENT_TIMESTAMP
       AND (usage_limit IS NULL OR used_count < usage_limit)`,
      [code]
    );

    if (codeResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Invalid or expired promotional code' });
      return;
    }

    const promotionalCode = codeResult.rows[0];

    // Increment usage count
    await query(
      'UPDATE promotional_codes SET used_count = used_count + 1 WHERE id = $1',
      [promotionalCode.id]
    );

    res.status(200).json({
      success: true,
      message: 'Promotional code used successfully',
      promotionalCode: promotionalCode
    });
  } catch (error) {
    console.error('Use promotional code error:', error);
    res.status(500).json({ success: false, message: 'Failed to use promotional code' });
  }
};

// Customer Segmentation Controller
export const getCustomerSegments = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT 
        cs.*,
        u.first_name,
        u.last_name,
        u.email as creator_email
       FROM customer_segments cs
       LEFT JOIN users u ON cs.created_by = u.id
       WHERE cs.is_active = true
       ORDER BY cs.created_at DESC`
    );

    res.status(200).json({
      success: true,
      segments: result.rows
    });
  } catch (error) {
    console.error('Get customer segments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer segments' });
  }
};

export const createCustomerSegment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { name, description, criteria } = req.body;

    // Calculate customer count based on criteria
    let customerCount = 0;
    try {
      const countResult = await query(`
        SELECT COUNT(*) as count FROM users u
        WHERE u.is_active = true
        ${criteria.min_orders ? 'AND (SELECT COUNT(*) FROM orders WHERE user_id = u.id) >= $1' : ''}
        ${criteria.min_spent ? 'AND (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = u.id) >= $2' : ''}
        ${criteria.last_order_days ? 'AND (SELECT MAX(created_at) FROM orders WHERE user_id = u.id) >= CURRENT_DATE - INTERVAL \'${criteria.last_order_days} days\'' : ''}
      `, [
        criteria.min_orders || null,
        criteria.min_spent || null
      ]);
      customerCount = parseInt(countResult.rows[0].count);
    } catch (countError) {
      console.error('Error calculating customer count:', countError);
    }

    const result = await query(
      `INSERT INTO customer_segments (name, description, criteria, customer_count, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, criteria, customerCount, userId]
    );

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

// Loyalty Program Controller
export const getLoyaltyPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'SELECT * FROM loyalty_programs WHERE is_active = true ORDER BY created_at DESC'
    );

    res.status(200).json({
      success: true,
      loyaltyPrograms: result.rows
    });
  } catch (error) {
    console.error('Get loyalty programs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch loyalty programs' });
  }
};

export const createLoyaltyProgram = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, points_per_rupee, redemption_rate, min_redemption_points, max_redemption_percentage } = req.body;

    const result = await query(
      `INSERT INTO loyalty_programs (name, description, points_per_rupee, redemption_rate, min_redemption_points, max_redemption_percentage)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description, points_per_rupee, redemption_rate, min_redemption_points, max_redemption_percentage]
    );

    res.status(201).json({
      success: true,
      message: 'Loyalty program created successfully',
      loyaltyProgram: result.rows[0]
    });
  } catch (error) {
    console.error('Create loyalty program error:', error);
    res.status(500).json({ success: false, message: 'Failed to create loyalty program' });
  }
};

export const getCustomerPoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id } = req.params;

    const result = await query(
      `SELECT 
        cp.*,
        u.first_name,
        u.last_name,
        u.email
       FROM customer_points cp
       LEFT JOIN users u ON cp.user_id = u.id
       WHERE cp.user_id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      // Create default points record if doesn't exist
      const createResult = await query(
        'INSERT INTO customer_points (user_id) VALUES ($1) RETURNING *',
        [user_id]
      );
      res.status(200).json({
        success: true,
        customerPoints: createResult.rows[0]
      });
      return;
    }

    res.status(200).json({
      success: true,
      customerPoints: result.rows[0]
    });
  } catch (error) {
    console.error('Get customer points error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer points' });
  }
};

export const addCustomerPoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id } = req.params;
    const { points, reason } = req.body;

    // Get or create customer points record
    let pointsResult = await query(
      'SELECT * FROM customer_points WHERE user_id = $1',
      [user_id]
    );

    if (pointsResult.rows.length === 0) {
      pointsResult = await query(
        'INSERT INTO customer_points (user_id) VALUES ($1) RETURNING *',
        [user_id]
      );
    }

    const customerPoints = pointsResult.rows[0];

    // Update points
    await query(
      `UPDATE customer_points 
       SET points_earned = points_earned + $1, 
           current_balance = current_balance + $1,
           last_activity = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [points, user_id]
    );

    res.status(200).json({
      success: true,
      message: 'Points added successfully',
      pointsAdded: points,
      reason: reason
    });
  } catch (error) {
    console.error('Add customer points error:', error);
    res.status(500).json({ success: false, message: 'Failed to add customer points' });
  }
};

// Marketing Analytics Controller
export const getMarketingAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;

    // Email campaign analytics
    const emailAnalytics = await query(`
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_campaigns,
        SUM(total_recipients) as total_recipients,
        SUM(delivered_count) as total_delivered,
        SUM(opened_count) as total_opened,
        SUM(clicked_count) as total_clicked,
        ROUND(AVG(CASE WHEN total_recipients > 0 THEN delivered_count * 100.0 / total_recipients END), 2) as avg_delivery_rate,
        ROUND(AVG(CASE WHEN delivered_count > 0 THEN opened_count * 100.0 / delivered_count END), 2) as avg_open_rate,
        ROUND(AVG(CASE WHEN opened_count > 0 THEN clicked_count * 100.0 / opened_count END), 2) as avg_click_rate
      FROM email_campaigns 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
    `);

    // SMS campaign analytics
    const smsAnalytics = await query(`
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_campaigns,
        SUM(total_recipients) as total_recipients,
        SUM(delivered_count) as total_delivered,
        ROUND(AVG(CASE WHEN total_recipients > 0 THEN delivered_count * 100.0 / total_recipients END), 2) as avg_delivery_rate
      FROM sms_campaigns 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
    `);

    // Promotional code analytics
    const promoAnalytics = await query(`
      SELECT 
        COUNT(*) as total_codes,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_codes,
        SUM(used_count) as total_usage,
        SUM(CASE WHEN discount_type = 'percentage' THEN used_count * discount_value ELSE used_count * discount_value END) as total_discount_given
      FROM promotional_codes 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
    `);

    // Customer segmentation analytics
    const segmentAnalytics = await query(`
      SELECT 
        COUNT(*) as total_segments,
        SUM(customer_count) as total_segmented_customers,
        AVG(customer_count) as avg_segment_size
      FROM customer_segments 
      WHERE is_active = true
    `);

    // Loyalty program analytics
    const loyaltyAnalytics = await query(`
      SELECT 
        COUNT(*) as total_programs,
        SUM(points_earned) as total_points_earned,
        SUM(points_redeemed) as total_points_redeemed,
        SUM(current_balance) as total_points_balance,
        COUNT(DISTINCT user_id) as active_members
      FROM customer_points
    `);

    res.status(200).json({
      success: true,
      analytics: {
        email: emailAnalytics.rows[0],
        sms: smsAnalytics.rows[0],
        promotional: promoAnalytics.rows[0],
        segmentation: segmentAnalytics.rows[0],
        loyalty: loyaltyAnalytics.rows[0]
      }
    });
  } catch (error) {
    console.error('Get marketing analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch marketing analytics' });
  }
};

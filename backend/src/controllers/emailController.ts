import { Request, Response } from 'express';
import { query } from '../config/database';
import EmailService from '../services/emailService';

const emailService = new EmailService();

export const sendSubscriptionReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subscriptionId } = req.params;
    const { email } = req.body;

    // Get subscription details
    const subscriptionResult = await query(
      `SELECT s.*, u.first_name, u.last_name, u.email as user_email, p.name as product_name, pv.name as variant_name, pv.price as variant_price
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN products p ON s.product_id = p.id
       LEFT JOIN product_variants pv ON s.variant_id = pv.id
       WHERE s.id = $1`,
      [subscriptionId]
    );

    if (subscriptionResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    const subscription = subscriptionResult.rows[0];
    const customerEmail = email || subscription.user_email;

    if (!customerEmail) {
      res.status(400).json({ success: false, message: 'Email address required' });
      return;
    }

    const emailData = {
      customerName: `${subscription.first_name} ${subscription.last_name}`,
      productName: subscription.product_name,
      variantName: subscription.variant_name,
      quantity: subscription.quantity,
      frequency: subscription.frequency,
      nextDeliveryDate: subscription.next_delivery_date,
      totalPrice: subscription.quantity * subscription.variant_price,
      deliveryAddress: subscription.delivery_address
    };

    const success = await emailService.sendSubscriptionReminder(emailData);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Subscription reminder sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send subscription reminder'
      });
    }
  } catch (error) {
    console.error('Send subscription reminder error:', error);
    res.status(500).json({ success: false, message: 'Failed to send reminder' });
  }
};

export const sendSubscriptionConfirmation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subscriptionId } = req.params;

    // Get subscription details
    const subscriptionResult = await query(
      `SELECT s.*, u.first_name, u.last_name, u.email as user_email, p.name as product_name, pv.name as variant_name, pv.price as variant_price
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN products p ON s.product_id = p.id
       LEFT JOIN product_variants pv ON s.variant_id = pv.id
       WHERE s.id = $1`,
      [subscriptionId]
    );

    if (subscriptionResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    const subscription = subscriptionResult.rows[0];

    const emailData = {
      customerName: `${subscription.first_name} ${subscription.last_name}`,
      productName: subscription.product_name,
      variantName: subscription.variant_name,
      quantity: subscription.quantity,
      frequency: subscription.frequency,
      nextDeliveryDate: subscription.next_delivery_date,
      totalPrice: subscription.quantity * subscription.variant_price,
      deliveryAddress: subscription.delivery_address
    };

    const success = await emailService.sendSubscriptionConfirmation(emailData);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Subscription confirmation sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send subscription confirmation'
      });
    }
  } catch (error) {
    console.error('Send subscription confirmation error:', error);
    res.status(500).json({ success: false, message: 'Failed to send confirmation' });
  }
};

export const sendSubscriptionStatusUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subscriptionId } = req.params;
    const { status, email } = req.body;

    // Get subscription details
    const subscriptionResult = await query(
      `SELECT s.*, u.first_name, u.last_name, u.email as user_email, p.name as product_name, pv.name as variant_name, pv.price as variant_price
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN products p ON s.product_id = p.id
       LEFT JOIN product_variants pv ON s.variant_id = pv.id
       WHERE s.id = $1`,
      [subscriptionId]
    );

    if (subscriptionResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    const subscription = subscriptionResult.rows[0];
    const customerEmail = email || subscription.user_email;

    if (!customerEmail) {
      res.status(400).json({ success: false, message: 'Email address required' });
      return;
    }

    const emailData = {
      customerName: `${subscription.first_name} ${subscription.last_name}`,
      productName: subscription.product_name,
      variantName: subscription.variant_name,
      quantity: subscription.quantity,
      frequency: subscription.frequency,
      nextDeliveryDate: subscription.next_delivery_date,
      totalPrice: subscription.quantity * subscription.variant_price,
      deliveryAddress: subscription.delivery_address
    };

    let success = false;

    switch (status) {
      case 'paused':
        success = await emailService.sendSubscriptionPaused(emailData);
        break;
      case 'active':
        success = await emailService.sendSubscriptionResumed(emailData);
        break;
      case 'cancelled':
        success = await emailService.sendSubscriptionCancelled(emailData);
        break;
      default:
        res.status(400).json({ success: false, message: 'Invalid status' });
        return;
    }

    if (success) {
      res.status(200).json({
        success: true,
        message: `Subscription ${status} notification sent successfully`
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Failed to send subscription ${status} notification`
      });
    }
  } catch (error) {
    console.error('Send subscription status update error:', error);
    res.status(500).json({ success: false, message: 'Failed to send status update' });
  }
};

export const sendDeliveryConfirmation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subscriptionId } = req.params;
    const { trackingNumber, email } = req.body;

    // Get subscription details
    const subscriptionResult = await query(
      `SELECT s.*, u.first_name, u.last_name, u.email as user_email, p.name as product_name, pv.name as variant_name, pv.price as variant_price
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN products p ON s.product_id = p.id
       LEFT JOIN product_variants pv ON s.variant_id = pv.id
       WHERE s.id = $1`,
      [subscriptionId]
    );

    if (subscriptionResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    const subscription = subscriptionResult.rows[0];
    const customerEmail = email || subscription.user_email;

    if (!customerEmail) {
      res.status(400).json({ success: false, message: 'Email address required' });
      return;
    }

    const emailData = {
      customerName: `${subscription.first_name} ${subscription.last_name}`,
      productName: subscription.product_name,
      variantName: subscription.variant_name,
      quantity: subscription.quantity,
      frequency: subscription.frequency,
      nextDeliveryDate: subscription.next_delivery_date,
      totalPrice: subscription.quantity * subscription.variant_price,
      deliveryAddress: subscription.delivery_address,
      trackingNumber
    };

    const success = await emailService.sendDeliveryConfirmation(emailData);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Delivery confirmation sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send delivery confirmation'
      });
    }
  } catch (error) {
    console.error('Send delivery confirmation error:', error);
    res.status(500).json({ success: false, message: 'Failed to send delivery confirmation' });
  }
};

export const sendBulkSubscriptionReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { daysAhead = 3 } = req.body;

    // Get subscriptions with upcoming deliveries
    const subscriptionsResult = await query(
      `SELECT s.*, u.first_name, u.last_name, u.email as user_email, p.name as product_name, pv.name as variant_name, pv.price as variant_price
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN products p ON s.product_id = p.id
       LEFT JOIN product_variants pv ON s.variant_id = pv.id
       WHERE s.status = 'active'
       AND s.next_delivery_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
       AND s.next_delivery_date >= CURRENT_DATE
       ORDER BY s.next_delivery_date ASC`
    );

    const subscriptions = subscriptionsResult.rows;
    const results = [];

    for (const subscription of subscriptions) {
      const emailData = {
        customerName: `${subscription.first_name} ${subscription.last_name}`,
        productName: subscription.product_name,
        variantName: subscription.variant_name,
        quantity: subscription.quantity,
        frequency: subscription.frequency,
        nextDeliveryDate: subscription.next_delivery_date,
        totalPrice: subscription.quantity * subscription.variant_price,
        deliveryAddress: subscription.delivery_address
      };

      const success = await emailService.sendSubscriptionReminder(emailData);
      results.push({
        subscriptionId: subscription.id,
        customerEmail: subscription.user_email,
        success
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.status(200).json({
      success: true,
      message: `Bulk reminders processed: ${successCount} sent, ${failureCount} failed`,
      results: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        details: results
      }
    });
  } catch (error) {
    console.error('Send bulk subscription reminders error:', error);
    res.status(500).json({ success: false, message: 'Failed to send bulk reminders' });
  }
};

export const getEmailAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;

    // Get email analytics (this would typically come from an email service provider)
    // For now, we'll return mock data
    const analyticsResult = await query(`
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN next_delivery_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as upcoming_deliveries
      FROM subscriptions
      WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
    `);

    res.status(200).json({
      success: true,
      analytics: {
        subscriptions: analyticsResult.rows[0],
        emailMetrics: {
          totalSent: 150,
          deliveryRate: 98.5,
          openRate: 85.2,
          clickRate: 12.8
        }
      }
    });
  } catch (error) {
    console.error('Get email analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email analytics' });
  }
};









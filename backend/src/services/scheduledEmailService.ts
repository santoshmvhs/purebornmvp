import cron from 'node-cron';
import { query } from '../config/database';
import EmailService from './emailService';

class ScheduledEmailService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
    this.startScheduledTasks();
  }

  private startScheduledTasks() {
    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', () => {
      console.log('Running daily subscription reminder check...');
      this.sendDailyReminders();
    });

    // Run every Monday at 10:00 AM for weekly reminders
    cron.schedule('0 10 * * 1', () => {
      console.log('Running weekly subscription reminder check...');
      this.sendWeeklyReminders();
    });

    console.log('Scheduled email tasks started');
  }

  private async sendDailyReminders() {
    try {
      // Get subscriptions with deliveries in the next 3 days
      const subscriptionsResult = await query(`
        SELECT s.*, u.first_name, u.last_name, u.email as user_email, p.name as product_name, pv.name as variant_name, pv.price as variant_price
        FROM subscriptions s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN products p ON s.product_id = p.id
        LEFT JOIN product_variants pv ON s.variant_id = pv.id
        WHERE s.status = 'active'
        AND s.next_delivery_date <= CURRENT_DATE + INTERVAL '3 days'
        AND s.next_delivery_date >= CURRENT_DATE
        AND s.last_reminder_sent IS NULL OR s.last_reminder_sent < CURRENT_DATE - INTERVAL '1 day'
        ORDER BY s.next_delivery_date ASC
      `);

      const subscriptions = subscriptionsResult.rows;
      let successCount = 0;
      let failureCount = 0;

      for (const subscription of subscriptions) {
        try {
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

          const success = await this.emailService.sendSubscriptionReminder(emailData);
          
          if (success) {
            // Update last reminder sent timestamp
            await query(
              'UPDATE subscriptions SET last_reminder_sent = CURRENT_TIMESTAMP WHERE id = $1',
              [subscription.id]
            );
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          console.error(`Error sending reminder for subscription ${subscription.id}:`, error);
          failureCount++;
        }
      }

      console.log(`Daily reminders completed: ${successCount} sent, ${failureCount} failed`);
    } catch (error) {
      console.error('Error in daily reminder task:', error);
    }
  }

  private async sendWeeklyReminders() {
    try {
      // Get all active subscriptions for weekly check
      const subscriptionsResult = await query(`
        SELECT s.*, u.first_name, u.last_name, u.email as user_email, p.name as product_name, pv.name as variant_name, pv.price as variant_price
        FROM subscriptions s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN products p ON s.product_id = p.id
        LEFT JOIN product_variants pv ON s.variant_id = pv.id
        WHERE s.status = 'active'
        AND s.frequency IN ('weekly', 'biweekly')
        ORDER BY s.next_delivery_date ASC
      `);

      const subscriptions = subscriptionsResult.rows;
      let successCount = 0;
      let failureCount = 0;

      for (const subscription of subscriptions) {
        try {
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

          const success = await this.emailService.sendSubscriptionReminder(emailData);
          
          if (success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          console.error(`Error sending weekly reminder for subscription ${subscription.id}:`, error);
          failureCount++;
        }
      }

      console.log(`Weekly reminders completed: ${successCount} sent, ${failureCount} failed`);
    } catch (error) {
      console.error('Error in weekly reminder task:', error);
    }
  }

  // Manual trigger methods for testing
  async triggerDailyReminders() {
    console.log('Manually triggering daily reminders...');
    await this.sendDailyReminders();
  }

  async triggerWeeklyReminders() {
    console.log('Manually triggering weekly reminders...');
    await this.sendWeeklyReminders();
  }
}

export default ScheduledEmailService;








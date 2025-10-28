import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  sendSubscriptionReminder,
  sendSubscriptionConfirmation,
  sendSubscriptionStatusUpdate,
  sendDeliveryConfirmation,
  sendBulkSubscriptionReminders,
  getEmailAnalytics
} from '../controllers/emailController';

const router = Router();

// Admin only routes
router.post('/subscription/:subscriptionId/reminder', authenticate, authorize('admin'), sendSubscriptionReminder);
router.post('/subscription/:subscriptionId/confirmation', authenticate, authorize('admin'), sendSubscriptionConfirmation);
router.post('/subscription/:subscriptionId/status-update', authenticate, authorize('admin'), sendSubscriptionStatusUpdate);
router.post('/subscription/:subscriptionId/delivery-confirmation', authenticate, authorize('admin'), sendDeliveryConfirmation);
router.post('/bulk-reminders', authenticate, authorize('admin'), sendBulkSubscriptionReminders);
router.get('/analytics', authenticate, authorize('admin'), getEmailAnalytics);

export default router;








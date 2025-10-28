import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  processSubscriptionDelivery,
  getSubscriptionAnalytics,
  getUpcomingDeliveries
} from '../controllers/subscriptionController';

const router = Router();

// Public routes (for customers to manage their own subscriptions)
router.get('/upcoming', authenticate, getUpcomingDeliveries);

// Admin only routes
router.get('/', authenticate, authorize('admin'), getAllSubscriptions);
router.get('/analytics', authenticate, authorize('admin'), getSubscriptionAnalytics);
router.get('/upcoming-deliveries', authenticate, authorize('admin'), getUpcomingDeliveries);
router.get('/:id', authenticate, getSubscriptionById);
router.post('/', authenticate, createSubscription);
router.put('/:id', authenticate, authorize('admin'), updateSubscription);
router.put('/:id/pause', authenticate, authorize('admin'), pauseSubscription);
router.put('/:id/resume', authenticate, authorize('admin'), resumeSubscription);
router.put('/:id/cancel', authenticate, authorize('admin'), cancelSubscription);
router.post('/:id/delivery', authenticate, authorize('admin'), processSubscriptionDelivery);

export default router;
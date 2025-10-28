import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getCustomerSubscriptions,
  getCustomerSubscriptionById,
  createCustomerSubscription,
  updateCustomerSubscription,
  pauseCustomerSubscription,
  resumeCustomerSubscription,
  cancelCustomerSubscription,
  getCustomerSubscriptionAnalytics,
  getAvailableProducts
} from '../controllers/customerSubscriptionController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Customer subscription management routes
router.get('/', getCustomerSubscriptions);
router.get('/analytics', getCustomerSubscriptionAnalytics);
router.get('/products', getAvailableProducts);
router.get('/:id', getCustomerSubscriptionById);
router.post('/', createCustomerSubscription);
router.put('/:id', updateCustomerSubscription);
router.put('/:id/pause', pauseCustomerSubscription);
router.put('/:id/resume', resumeCustomerSubscription);
router.put('/:id/cancel', cancelCustomerSubscription);

export default router;








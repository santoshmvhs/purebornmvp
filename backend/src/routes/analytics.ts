import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getBusinessAnalytics,
  getSalesForecast,
  getCustomerInsights,
  getOperationalMetrics
} from '../controllers/analyticsController';

const router = Router();

// Admin only routes
router.get('/business', authenticate, authorize('admin'), getBusinessAnalytics);
router.get('/forecast', authenticate, authorize('admin'), getSalesForecast);
router.get('/customers', authenticate, authorize('admin'), getCustomerInsights);
router.get('/operations', authenticate, authorize('admin'), getOperationalMetrics);

export default router;








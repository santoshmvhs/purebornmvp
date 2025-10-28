import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderShipping,
  getOrderAnalytics,
  bulkUpdateOrders
} from '../controllers/orderController';

const router = Router();

// Admin only routes
router.get('/', authenticate, authorize('admin'), getAllOrders);
router.get('/analytics', authenticate, authorize('admin'), getOrderAnalytics);
router.get('/:id', authenticate, authorize('admin'), getOrderById);
router.patch('/:id/status', authenticate, authorize('admin'), updateOrderStatus);
router.patch('/:id/shipping', authenticate, authorize('admin'), updateOrderShipping);
router.patch('/bulk', authenticate, authorize('admin'), bulkUpdateOrders);

export default router;
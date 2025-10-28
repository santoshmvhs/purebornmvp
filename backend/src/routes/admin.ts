import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { 
  getDashboardStats,
  getSalesAnalytics,
  getInventoryAnalytics,
  getCustomerAnalytics,
  getProductionAnalytics,
  updateSystemSettings
} from '../controllers/adminController';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/analytics/sales', getSalesAnalytics);
router.get('/analytics/inventory', getInventoryAnalytics);
router.get('/analytics/customers', getCustomerAnalytics);
router.get('/analytics/production', getProductionAnalytics);
router.put('/settings', updateSystemSettings);

export default router;

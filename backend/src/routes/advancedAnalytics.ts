import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as advancedAnalyticsController from '../controllers/advancedAnalyticsController';

const router = express.Router();

// Business Intelligence Routes
router.get('/business-intelligence', authenticate, authorize('admin'), advancedAnalyticsController.getBusinessIntelligence);

// KPI Dashboard Routes
router.get('/kpi-dashboard', authenticate, authorize('admin'), advancedAnalyticsController.getKPIDashboard);

// Predictive Analytics Routes
router.get('/predictive', authenticate, authorize('admin'), advancedAnalyticsController.getPredictiveAnalytics);

// Custom Analytics Routes
router.post('/custom', authenticate, authorize('admin'), advancedAnalyticsController.getCustomAnalytics);

// Export Analytics Routes
router.get('/export', authenticate, authorize('admin'), advancedAnalyticsController.exportAnalyticsData);

export default router;





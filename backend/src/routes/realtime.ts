import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as realtimeController from '../controllers/realtimeController';

const router = express.Router();

// Notification Routes
router.get('/notifications', authenticate, realtimeController.getNotifications);
router.put('/notifications/:notificationId/read', authenticate, realtimeController.markNotificationAsRead);
router.put('/notifications/read-all', authenticate, realtimeController.markAllNotificationsAsRead);
router.get('/notifications/unread-count', authenticate, realtimeController.getUnreadNotificationCount);

// Live Dashboard Routes
router.get('/dashboard/live', authenticate, authorize('admin'), realtimeController.getLiveDashboardData);

// Order Tracking Routes
router.get('/orders/:orderId/tracking', authenticate, realtimeController.getOrderTracking);

// System Monitoring Routes
router.get('/inventory/alerts', authenticate, authorize('admin'), realtimeController.getInventoryAlerts);
router.get('/system/status', authenticate, authorize('admin'), realtimeController.getSystemStatus);

export default router;





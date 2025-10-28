import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as logisticsController from '../controllers/logisticsController';

const router = express.Router();

// Shipping Providers Routes
router.get('/providers', authenticate, authorize('admin'), logisticsController.getShippingProviders);
router.post('/providers', authenticate, authorize('admin'), logisticsController.createShippingProvider);

// Shipping Zones Routes
router.get('/zones', authenticate, authorize('admin'), logisticsController.getShippingZones);
router.post('/zones', authenticate, authorize('admin'), logisticsController.createShippingZone);

// Shipping Rates Routes
router.get('/rates', logisticsController.getShippingRates);
router.post('/rates/calculate', logisticsController.calculateShippingCost);

// Shipments Routes
router.get('/shipments', authenticate, authorize('admin'), logisticsController.getShipments);
router.post('/shipments', authenticate, authorize('admin'), logisticsController.createShipment);
router.get('/shipments/track/:trackingNumber', logisticsController.trackShipment);
router.put('/shipments/:shipmentId/status', authenticate, authorize('admin'), logisticsController.updateShipmentStatus);

// Analytics Routes
router.get('/analytics', authenticate, authorize('admin'), logisticsController.getLogisticsAnalytics);

export default router;







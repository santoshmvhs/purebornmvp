import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as customerController from '../controllers/customerController';

const router = express.Router();

// Customer Management Routes
router.get('/customers', authenticate, authorize('admin'), customerController.getCustomers);
router.get('/customers/:customerId', authenticate, authorize('admin'), customerController.getCustomerById);
router.post('/customers', authenticate, authorize('admin'), customerController.createCustomer);
router.put('/customers/:customerId', authenticate, authorize('admin'), customerController.updateCustomerProfile);
router.delete('/customers/:customerId', authenticate, authorize('admin'), customerController.deleteCustomer);

// Customer Segmentation Routes
router.get('/segments', authenticate, authorize('admin'), customerController.getCustomerSegments);
router.post('/segments', authenticate, authorize('admin'), customerController.createCustomerSegment);
router.post('/segments/:segmentId/customers/:customerId', authenticate, authorize('admin'), customerController.addCustomerToSegment);
router.delete('/segments/:segmentId/customers/:customerId', authenticate, authorize('admin'), customerController.removeCustomerFromSegment);

// Customer Analytics Routes
router.get('/analytics', authenticate, authorize('admin'), customerController.getCustomerAnalytics);

// Customer Communication Routes
router.post('/customers/:customerId/messages', authenticate, authorize('admin'), customerController.sendCustomerMessage);
router.get('/customers/:customerId/communications', authenticate, authorize('admin'), customerController.getCustomerCommunications);

export default router;




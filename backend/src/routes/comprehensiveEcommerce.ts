import express from 'express';
import { authenticate } from '../middleware/auth';
import * as comprehensiveEcommerceController from '../controllers/comprehensiveEcommerceController';

const router = express.Router();

// Additional E-commerce Features Routes
router.get('/recently-viewed', authenticate, comprehensiveEcommerceController.getRecentlyViewed);
router.post('/recently-viewed/:product_id', authenticate, comprehensiveEcommerceController.addToRecentlyViewed);
router.get('/frequently-bought-together/:productId', comprehensiveEcommerceController.getFrequentlyBoughtTogether);
router.get('/abandoned-carts', authenticate, comprehensiveEcommerceController.getAbandonedCarts);

// Gift Cards Routes
router.post('/gift-cards', authenticate, comprehensiveEcommerceController.createGiftCard);
router.get('/gift-cards/validate/:code', comprehensiveEcommerceController.validateGiftCard);

// Enhanced Payment & Financial Features Routes
router.get('/payment-methods', authenticate, comprehensiveEcommerceController.getPaymentMethods);
router.post('/payment-methods', authenticate, comprehensiveEcommerceController.addPaymentMethod);
router.post('/refunds', authenticate, comprehensiveEcommerceController.createRefund);
router.post('/invoices/:orderId', authenticate, comprehensiveEcommerceController.generateInvoice);

// Logistics & Delivery Management Routes
router.post('/shipments/:orderId', authenticate, comprehensiveEcommerceController.createShipment);
router.get('/shipments/track/:trackingNumber', comprehensiveEcommerceController.trackShipment);

// Marketing & Customer Engagement Routes
router.post('/email-campaigns', authenticate, comprehensiveEcommerceController.createEmailCampaign);
router.post('/promotional-codes', authenticate, comprehensiveEcommerceController.createPromotionalCode);
router.get('/promotional-codes/validate/:code', comprehensiveEcommerceController.validatePromotionalCode);

// Multi-channel Integration Routes
router.get('/marketplace-integrations', authenticate, comprehensiveEcommerceController.getMarketplaceIntegrations);
router.post('/marketplace-integrations/:marketplace/sync', authenticate, comprehensiveEcommerceController.syncMarketplaceProducts);

// Security & Compliance Routes
router.post('/security-logs', authenticate, comprehensiveEcommerceController.logSecurityEvent);
router.get('/audit-logs', authenticate, comprehensiveEcommerceController.getAuditLogs);
router.post('/data-privacy-requests', authenticate, comprehensiveEcommerceController.createDataPrivacyRequest);

export default router;


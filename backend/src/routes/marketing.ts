import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as marketingController from '../controllers/marketingController';

const router = express.Router();

// Email Campaigns Routes
router.get('/email-campaigns', authenticate, authorize('admin'), marketingController.getEmailCampaigns);
router.post('/email-campaigns', authenticate, authorize('admin'), marketingController.createEmailCampaign);
router.post('/email-campaigns/:campaignId/send', authenticate, authorize('admin'), marketingController.sendEmailCampaign);

// SMS Campaigns Routes
router.get('/sms-campaigns', authenticate, authorize('admin'), marketingController.getSMSCampaigns);
router.post('/sms-campaigns', authenticate, authorize('admin'), marketingController.createSMSCampaign);
router.post('/sms-campaigns/:campaignId/send', authenticate, authorize('admin'), marketingController.sendSMSCampaign);

// Promotional Codes Routes
router.get('/promotional-codes', authenticate, authorize('admin'), marketingController.getPromotionalCodes);
router.post('/promotional-codes', authenticate, authorize('admin'), marketingController.createPromotionalCode);
router.get('/promotional-codes/validate/:code', marketingController.validatePromotionalCode);
router.post('/promotional-codes/:code/use', authenticate, marketingController.usePromotionalCode);

// Customer Segmentation Routes
router.get('/customer-segments', authenticate, authorize('admin'), marketingController.getCustomerSegments);
router.post('/customer-segments', authenticate, authorize('admin'), marketingController.createCustomerSegment);

// Loyalty Program Routes
router.get('/loyalty-programs', authenticate, authorize('admin'), marketingController.getLoyaltyPrograms);
router.post('/loyalty-programs', authenticate, authorize('admin'), marketingController.createLoyaltyProgram);
router.get('/customer-points/:user_id', authenticate, marketingController.getCustomerPoints);
router.post('/customer-points/:user_id/add', authenticate, authorize('admin'), marketingController.addCustomerPoints);

// Analytics Routes
router.get('/analytics', authenticate, authorize('admin'), marketingController.getMarketingAnalytics);

export default router;






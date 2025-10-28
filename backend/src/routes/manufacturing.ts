import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  performQualityCheck,
  recordBottling,
  getManufacturingAnalytics,
  getOilTypes
} from '../controllers/manufacturingController';

const router = Router();

// Public routes
router.get('/oil-types', getOilTypes);

// Admin only routes
router.get('/', authenticate, authorize('admin'), getAllBatches);
router.get('/analytics', authenticate, authorize('admin'), getManufacturingAnalytics);
router.get('/:id', authenticate, authorize('admin'), getBatchById);
router.post('/', authenticate, authorize('admin'), createBatch);
router.put('/:id', authenticate, authorize('admin'), updateBatch);
router.post('/:id/quality-check', authenticate, authorize('admin'), performQualityCheck);
router.post('/:id/bottling', authenticate, authorize('admin'), recordBottling);

export default router;
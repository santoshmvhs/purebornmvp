import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { 
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserAnalytics
} from '../controllers/userController';

const router = Router();

// Admin routes only
router.get('/', authenticate, authorize('admin'), getUsers);
router.get('/analytics', authenticate, authorize('admin'), getUserAnalytics);
router.get('/:id', authenticate, authorize('admin'), getUserById);
router.put('/:id', authenticate, authorize('admin'), updateUser);
router.delete('/:id', authenticate, authorize('admin'), deleteUser);

export default router;

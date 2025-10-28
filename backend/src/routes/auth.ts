import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { 
  registerUser, 
  loginUser, 
  getCurrentUser, 
  updateProfile,
  getUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress
} from '../controllers/authController';

const router = Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);
router.get('/addresses', authenticate, getUserAddresses);
router.post('/addresses', authenticate, addAddress);
router.put('/addresses/:id', authenticate, updateAddress);
router.delete('/addresses/:id', authenticate, deleteAddress);

export default router;

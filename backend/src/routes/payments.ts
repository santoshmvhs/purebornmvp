import { Router } from 'express';
import { createRazorpayOrder, getRazorpayStatus, verifyPayment } from '../controllers/paymentController';

const router = Router();

router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyPayment);
router.get('/status', getRazorpayStatus);

export default router;



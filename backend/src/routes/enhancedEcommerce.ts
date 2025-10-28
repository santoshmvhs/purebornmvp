import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  // Wishlist
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  // Reviews
  getProductReviews,
  createProductReview,
  markReviewHelpful,
  // Search
  searchProducts,
  getSearchSuggestions,
  // Views
  trackProductView,
  // Comparison
  addToComparison,
  getComparisonProducts
} from '../controllers/enhancedEcommerceController';

const router = Router();

// Wishlist routes
router.get('/wishlist', authenticate, getWishlist);
router.post('/wishlist', authenticate, addToWishlist);
router.delete('/wishlist/:id', authenticate, removeFromWishlist);
router.delete('/wishlist', authenticate, clearWishlist);

// Product reviews routes
router.get('/products/:productId/reviews', getProductReviews);
router.post('/products/:productId/reviews', authenticate, createProductReview);
router.post('/reviews/:reviewId/helpful', authenticate, markReviewHelpful);

// Search routes
router.get('/search', searchProducts);
router.get('/search/suggestions', getSearchSuggestions);

// Product views tracking
router.post('/products/:productId/view', trackProductView);

// Product comparison routes
router.post('/comparison', authenticate, addToComparison);
router.get('/comparison', getComparisonProducts);

export default router;








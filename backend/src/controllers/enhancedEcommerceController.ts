import { Request, Response } from 'express';
import { query } from '../config/database';

// Wishlist Controller
export const getWishlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const wishlistResult = await query(`
      SELECT 
        w.*,
        p.name as product_name,
        p.description as product_description,
        p.image_url as product_image,
        p.average_rating,
        p.review_count,
        pv.name as variant_name,
        pv.price as variant_price,
        pv.image_url as variant_image,
        pv.inventory_quantity
      FROM wishlists w
      LEFT JOIN products p ON w.product_id = p.id
      LEFT JOIN product_variants pv ON w.variant_id = pv.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `, [userId]);

    res.status(200).json({
      success: true,
      wishlist: wishlistResult.rows
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wishlist' });
  }
};

export const addToWishlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { product_id, variant_id } = req.body;

    // Check if already in wishlist
    const existingResult = await query(
      'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2 AND variant_id = $3',
      [userId, product_id, variant_id]
    );

    if (existingResult.rows.length > 0) {
      res.status(400).json({ success: false, message: 'Item already in wishlist' });
      return;
    }

    const wishlistResult = await query(
      `INSERT INTO wishlists (user_id, product_id, variant_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, product_id, variant_id]
    );

    res.status(201).json({
      success: true,
      message: 'Added to wishlist successfully',
      wishlistItem: wishlistResult.rows[0]
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to add to wishlist' });
  }
};

export const removeFromWishlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM wishlists WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Wishlist item not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Removed from wishlist successfully'
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
  }
};

export const clearWishlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    await query('DELETE FROM wishlists WHERE user_id = $1', [userId]);

    res.status(200).json({
      success: true,
      message: 'Wishlist cleared successfully'
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear wishlist' });
  }
};

// Product Reviews Controller
export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, rating, sort = 'newest' } = req.query;

    let whereClause = 'WHERE pr.product_id = $1 AND pr.status = $2';
    let queryParams: any[] = [productId, 'approved'];
    let orderClause = 'ORDER BY pr.created_at DESC';

    if (rating) {
      queryParams.push(rating);
      whereClause += ` AND pr.rating = $${queryParams.length}`;
    }

    switch (sort) {
      case 'oldest':
        orderClause = 'ORDER BY pr.created_at ASC';
        break;
      case 'highest_rating':
        orderClause = 'ORDER BY pr.rating DESC, pr.created_at DESC';
        break;
      case 'lowest_rating':
        orderClause = 'ORDER BY pr.rating ASC, pr.created_at DESC';
        break;
      case 'most_helpful':
        orderClause = 'ORDER BY pr.helpful_count DESC, pr.created_at DESC';
        break;
    }

    const offset = (Number(page) - 1) * Number(limit);
    queryParams.push(Number(limit), offset);

    const reviewsResult = await query(`
      SELECT 
        pr.*,
        u.first_name,
        u.last_name,
        u.email,
        o.id as order_id,
        o.order_date
      FROM product_reviews pr
      LEFT JOIN users u ON pr.user_id = u.id
      LEFT JOIN orders o ON pr.order_id = o.id
      ${whereClause}
      ${orderClause}
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM product_reviews pr
      ${whereClause.replace(`LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`, '')}
    `, queryParams.slice(0, -2));

    // Get rating distribution
    const ratingDistributionResult = await query(`
      SELECT rating, COUNT(*) as count
      FROM product_reviews
      WHERE product_id = $1 AND status = 'approved'
      GROUP BY rating
      ORDER BY rating DESC
    `, [productId]);

    res.status(200).json({
      success: true,
      reviews: reviewsResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
      },
      ratingDistribution: ratingDistributionResult.rows
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

export const createProductReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { product_id, order_id, rating, title, comment } = req.body;

    // Verify user has purchased the product
    if (order_id) {
      const orderResult = await query(
        `SELECT o.id FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         WHERE o.id = $1 AND o.user_id = $2 AND oi.product_id = $3`,
        [order_id, userId, product_id]
      );

      if (orderResult.rows.length === 0) {
        res.status(400).json({ success: false, message: 'Order not found or product not purchased' });
        return;
      }
    }

    const reviewResult = await query(
      `INSERT INTO product_reviews (user_id, product_id, order_id, rating, title, comment, verified_purchase)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, product_id, order_id, rating, title, comment, !!order_id]
    );

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review: reviewResult.rows[0]
    });
  } catch (error) {
    console.error('Create product review error:', error);
    res.status(500).json({ success: false, message: 'Failed to create review' });
  }
};

export const markReviewHelpful = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { reviewId } = req.params;
    const { helpful } = req.body;

    // Check if user already marked this review
    const existingResult = await query(
      'SELECT id FROM review_helpfulness WHERE review_id = $1 AND user_id = $2',
      [reviewId, userId]
    );

    if (existingResult.rows.length > 0) {
      res.status(400).json({ success: false, message: 'You have already rated this review' });
      return;
    }

    // Add helpfulness rating
    await query(
      'INSERT INTO review_helpfulness (review_id, user_id, helpful) VALUES ($1, $2, $3)',
      [reviewId, userId, helpful]
    );

    // Update helpful count
    const helpfulCountResult = await query(
      'SELECT COUNT(*) as count FROM review_helpfulness WHERE review_id = $1 AND helpful = true',
      [reviewId]
    );

    await query(
      'UPDATE product_reviews SET helpful_count = $1 WHERE id = $2',
      [parseInt(helpfulCountResult.rows[0].count), reviewId]
    );

    res.status(200).json({
      success: true,
      message: 'Review helpfulness updated successfully'
    });
  } catch (error) {
    console.error('Mark review helpful error:', error);
    res.status(500).json({ success: false, message: 'Failed to update review helpfulness' });
  }
};

// Advanced Search Controller
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, category, minPrice, maxPrice, rating, sort, page = 1, limit = 12 } = req.query;
    const userId = (req as any).user?.id;

    // Log search analytics
    if (q) {
      await query(
        'INSERT INTO search_analytics (search_term, user_id, search_timestamp) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [q as string, userId]
      );
    }

    let whereClause = 'WHERE p.is_active = true';
    let queryParams: any[] = [];
    let paramCount = 0;

    if (q) {
      paramCount++;
      whereClause += ` AND (
        p.name ILIKE $${paramCount} OR 
        p.description ILIKE $${paramCount} OR 
        p.seo_keywords ILIKE $${paramCount} OR
        pv.name ILIKE $${paramCount}
      )`;
      queryParams.push(`%${q}%`);
    }

    if (category) {
      paramCount++;
      whereClause += ` AND p.category_id = $${paramCount}`;
      queryParams.push(category);
    }

    if (minPrice) {
      paramCount++;
      whereClause += ` AND pv.price >= $${paramCount}`;
      queryParams.push(minPrice);
    }

    if (maxPrice) {
      paramCount++;
      whereClause += ` AND pv.price <= $${paramCount}`;
      queryParams.push(maxPrice);
    }

    if (rating) {
      paramCount++;
      whereClause += ` AND p.average_rating >= $${paramCount}`;
      queryParams.push(rating);
    }

    let orderClause = 'ORDER BY p.created_at DESC';
    switch (sort) {
      case 'price_low':
        orderClause = 'ORDER BY MIN(pv.price) ASC';
        break;
      case 'price_high':
        orderClause = 'ORDER BY MIN(pv.price) DESC';
        break;
      case 'rating':
        orderClause = 'ORDER BY p.average_rating DESC';
        break;
      case 'popularity':
        orderClause = 'ORDER BY p.view_count DESC';
        break;
      case 'newest':
        orderClause = 'ORDER BY p.created_at DESC';
        break;
      case 'name':
        orderClause = 'ORDER BY p.name ASC';
        break;
    }

    const offset = (Number(page) - 1) * Number(limit);
    queryParams.push(Number(limit), offset);

    const productsResult = await query(`
      SELECT 
        p.*,
        COUNT(pv.id) as variant_count,
        MIN(pv.price) as min_price,
        MAX(pv.price) as max_price,
        AVG(pv.price) as avg_price
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      ${whereClause}
      GROUP BY p.id
      ${orderClause}
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      ${whereClause}
    `, queryParams.slice(0, -2));

    // Get search suggestions
    const suggestionsResult = await query(`
      SELECT DISTINCT p.name
      FROM products p
      WHERE p.is_active = true AND p.name ILIKE $1
      LIMIT 5
    `, [`%${q}%`]);

    res.status(200).json({
      success: true,
      products: productsResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
      },
      suggestions: suggestionsResult.rows.map(row => row.name)
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ success: false, message: 'Failed to search products' });
  }
};

export const getSearchSuggestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q || (q as string).length < 2) {
      res.status(200).json({
        success: true,
        suggestions: []
      });
      return;
    }

    const suggestionsResult = await query(`
      SELECT DISTINCT p.name, p.id, p.image_url
      FROM products p
      WHERE p.is_active = true AND p.name ILIKE $1
      ORDER BY p.view_count DESC, p.name ASC
      LIMIT 8
    `, [`%${q}%`]);

    res.status(200).json({
      success: true,
      suggestions: suggestionsResult.rows
    });
  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get suggestions' });
  }
};

// Product Views Controller
export const trackProductView = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const userId = (req as any).user?.id;
    const sessionId = req.headers['x-session-id'] as string;
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers.referer;

    // Track the view
    await query(
      `INSERT INTO product_views (product_id, user_id, session_id, ip_address, user_agent, referrer)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [productId, userId, sessionId, req.ip, userAgent, referrer]
    );

    // Update product view count
    await query(
      'UPDATE products SET view_count = view_count + 1 WHERE id = $1',
      [productId]
    );

    res.status(200).json({
      success: true,
      message: 'Product view tracked successfully'
    });
  } catch (error) {
    console.error('Track product view error:', error);
    res.status(500).json({ success: false, message: 'Failed to track product view' });
  }
};

// Product Comparison Controller
export const addToComparison = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { productIds } = req.body;
    const sessionId = req.headers['x-session-id'] as string;

    if (!Array.isArray(productIds) || productIds.length < 2 || productIds.length > 4) {
      res.status(400).json({ success: false, message: 'Please select 2-4 products to compare' });
      return;
    }

    // Check if products exist and are active
    const productsResult = await query(
      `SELECT id FROM products WHERE id = ANY($1) AND is_active = true`,
      [productIds]
    );

    if (productsResult.rows.length !== productIds.length) {
      res.status(400).json({ success: false, message: 'Some products are not available' });
      return;
    }

    // Add to comparison
    await query(
      `INSERT INTO product_comparisons (user_id, session_id, compared_products)
       VALUES ($1, $2, $3)`,
      [userId, sessionId, productIds]
    );

    res.status(200).json({
      success: true,
      message: 'Products added to comparison successfully'
    });
  } catch (error) {
    console.error('Add to comparison error:', error);
    res.status(500).json({ success: false, message: 'Failed to add to comparison' });
  }
};

export const getComparisonProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productIds } = req.query;
    
    if (!productIds) {
      res.status(400).json({ success: false, message: 'Product IDs required' });
      return;
    }

    const ids = Array.isArray(productIds) ? productIds : [productIds];

    const productsResult = await query(`
      SELECT 
        p.*,
        COUNT(pv.id) as variant_count,
        MIN(pv.price) as min_price,
        MAX(pv.price) as max_price,
        AVG(pv.price) as avg_price
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE p.id = ANY($1) AND p.is_active = true
      GROUP BY p.id
      ORDER BY p.name ASC
    `, [ids]);

    res.status(200).json({
      success: true,
      products: productsResult.rows
    });
  } catch (error) {
    console.error('Get comparison products error:', error);
    res.status(500).json({ success: false, message: 'Failed to get comparison products' });
  }
};








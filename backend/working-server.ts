import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'pureborn_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '2656',
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(limiter);
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Pureborn Cold Pressed Oil API is running!'
  });
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = true
    `;
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND p.category_id = $${paramCount}`;
      params.push(category);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    // Get product variants
    for (const product of result.rows) {
      const variantsResult = await pool.query(
        'SELECT * FROM product_variants WHERE product_id = $1 AND is_active = true ORDER BY sort_order',
        [product.id]
      );
      product.variants = variantsResult.rows;

      // Get product images
      const imagesResult = await pool.query(
        'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order',
        [product.id]
      );
      product.images = imagesResult.rows;
    }

    res.status(200).json({
      success: true,
      products: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.rows.length
      }
    });
  } catch (error: any) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get product by slug
app.get('/api/products/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.slug = $1 AND p.is_active = true`,
      [slug]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    const product = result.rows[0];

    // Get product variants
    const variantsResult = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = $1 AND is_active = true ORDER BY sort_order',
      [product.id]
    );

    // Get product images
    const imagesResult = await pool.query(
      'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order',
      [product.id]
    );

    res.status(200).json({
      success: true,
      product: {
        ...product,
        variants: variantsResult.rows,
        images: imagesResult.rows
      }
    });
  } catch (error: any) {
    console.error('Get product by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE is_active = true ORDER BY sort_order, name'
    );

    res.status(200).json({
      success: true,
      categories: result.rows
    });
  } catch (error: any) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get dashboard stats (for admin)
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalProductsResult = await pool.query('SELECT COUNT(*) FROM products WHERE is_active = true');
    const totalCategoriesResult = await pool.query('SELECT COUNT(*) FROM categories WHERE is_active = true');
    const totalUsersResult = await pool.query('SELECT COUNT(*) FROM users WHERE is_active = true');

    res.status(200).json({
      success: true,
      stats: {
        totalProducts: parseInt(totalProductsResult.rows[0].count),
        totalCategories: parseInt(totalCategoriesResult.rows[0].count),
        totalUsers: parseInt(totalUsersResult.rows[0].count)
      }
    });
  } catch (error: any) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Pureborn API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`📦 Products API: http://localhost:${PORT}/api/products`);
  console.log(`🏷️ Categories API: http://localhost:${PORT}/api/categories`);
});

export default app;

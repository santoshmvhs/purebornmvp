import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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

// Sample products endpoint
app.get('/api/products', (req, res) => {
  res.status(200).json({
    success: true,
    products: [
      {
        id: '1',
        name: 'Pure Coconut Oil',
        slug: 'pure-coconut-oil',
        price: 299.00,
        description: 'Premium cold pressed coconut oil',
        image: 'https://via.placeholder.com/300x300?text=Coconut+Oil'
      },
      {
        id: '2',
        name: 'Sesame Oil',
        slug: 'sesame-oil',
        price: 249.00,
        description: 'Traditional cold pressed sesame oil',
        image: 'https://via.placeholder.com/300x300?text=Sesame+Oil'
      }
    ]
  });
});

// Sample categories endpoint
app.get('/api/categories', (req, res) => {
  res.status(200).json({
    success: true,
    categories: [
      { id: '1', name: 'Cold Pressed Oils', slug: 'cold-pressed-oils' },
      { id: '2', name: 'Coconut Oil', slug: 'coconut-oil' },
      { id: '3', name: 'Sesame Oil', slug: 'sesame-oil' }
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Pureborn API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`📦 Products API: http://localhost:${PORT}/api/products`);
});

export default app;

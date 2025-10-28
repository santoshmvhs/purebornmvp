import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import WebSocketService from './services/websocketService';

// Import routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import analyticsRoutes from './routes/analytics';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import manufacturingRoutes from './routes/manufacturing';
import subscriptionRoutes from './routes/subscriptions';
import customerSubscriptionRoutes from './routes/customerSubscriptions';
import emailRoutes from './routes/emails';
import enhancedEcommerceRoutes from './routes/enhancedEcommerce';
import paymentRoutes from './routes/payments';
import comprehensiveEcommerceRoutes from './routes/comprehensiveEcommerce';
import logisticsRoutes from './routes/logistics';
import marketingRoutes from './routes/marketing';
import customerRoutes from './routes/customers';
import realtimeRoutes from './routes/realtime';
import advancedAnalyticsRoutes from './routes/advancedAnalytics';

// Import middleware
import { errorHandler, notFound } from './middleware/errorHandler';

// Import database connection
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';

// Import scheduled services
import ScheduledEmailService from './services/scheduledEmailService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Make WebSocket service available globally
(global as any).webSocketService = webSocketService;

const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(limiter);
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3001" // Admin frontend
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Make WebSocket service accessible to routes
app.set('webSocketService', webSocketService);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/manufacturing', manufacturingRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/customer-subscriptions', customerSubscriptionRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/enhanced', enhancedEcommerceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/comprehensive', comprehensiveEcommerceRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/advanced-analytics', advancedAnalyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Database and Redis connection
const startServer = async () => {
  try {
    // Try to connect to database, but don't fail if it's not available
    try {
      await connectDatabase();
    } catch (dbError: any) {
      console.warn('⚠️ Database connection failed:', dbError.message);
      console.warn('⚠️ Server will start without database connection');
    }
    
    // Try to connect to Redis, but don't fail if it's not available
    try {
      await connectRedis();
    } catch (redisError: any) {
      console.warn('⚠️ Redis connection failed:', redisError.message);
      console.warn('⚠️ Server will start without Redis connection');
    }
    
    server.listen(PORT, () => {
      // Initialize scheduled services
  const scheduledEmailService = new ScheduledEmailService();
  console.log('📧 Scheduled email service initialized');
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

startServer();

export { io };

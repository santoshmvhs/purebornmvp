# Pureborn Cold-Pressed Oil E-commerce Platform

A premium e-commerce platform for cold-pressed oil sales with comprehensive backend, frontend, and admin dashboard.

## 🚀 Features

### Backend (Node.js + Express + TypeScript + PostgreSQL)
- ✅ **Authentication & Authorization** - JWT-based auth with role management
- ✅ **Product Management** - CRUD operations, variants, inventory tracking
- ✅ **Order Management** - Order processing, status tracking, analytics
- ✅ **Manufacturing Module** - Production batch tracking, quality control
- ✅ **Subscription System** - Recurring delivery management
- ✅ **Email Notifications** - Automated email system with scheduling
- ✅ **Enhanced E-commerce** - Wishlist, reviews, search, SEO
- ✅ **Comprehensive E-commerce** - Additional features, payment methods, refunds
- ✅ **Logistics & Delivery** - Shiprocket integration, tracking, AWB management
- ✅ **Marketing Dashboard** - Campaigns, promotional codes, customer segmentation
- ✅ **Customer Management** - Profiles, segmentation, loyalty programs
- ✅ **Real-time Features** - WebSocket integration for live updates
- ✅ **Advanced Analytics** - Business intelligence and predictive analytics

### Frontend (React + TypeScript + Tailwind CSS)
- ✅ **Premium UI/UX** - Ultra-premium design with luxury animations
- ✅ **Product Catalog** - Advanced search, filtering, product pages
- ✅ **Shopping Cart** - Luxury cart with animations
- ✅ **Checkout Flow** - Premium checkout with Razorpay integration
- ✅ **User Authentication** - Login/registration with JWT
- ✅ **Subscription Portal** - Customer self-service subscription management
- ✅ **Wishlist & Reviews** - Enhanced e-commerce features
- ✅ **Advanced Search** - SEO-ready search functionality

### Admin Frontend (React + TypeScript + Tailwind CSS)
- ✅ **Premium Dashboard** - Luxury KPIs and analytics
- ✅ **Product Management** - Comprehensive product CRUD
- ✅ **Order Management** - Order processing and tracking
- ✅ **Manufacturing Management** - Production batch management
- ✅ **Analytics Dashboard** - Business insights and KPIs
- ✅ **Subscription Management** - Subscription administration
- ✅ **Email Management** - Email campaign management
- ✅ **Logistics Management** - Shipping and delivery management
- ✅ **Marketing Dashboard** - Campaign and promotional management
- ✅ **Customer Management** - Customer profiles and segmentation
- ✅ **Real-time Dashboard** - Live updates and activity feed
- ✅ **Advanced Analytics** - Business intelligence and predictive analytics

## 📋 Prerequisites

- Node.js (v14+)
- PostgreSQL (v12+)
- Redis (optional, for caching)
- npm or yarn

## 🔧 Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd pureborn
```

### 2. Install dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd ../frontend
npm install
```

#### Admin Frontend
```bash
cd ../admin-frontend
npm install
```

### 3. Database Setup

1. Create PostgreSQL database:
```bash
createdb pureborn_db
```

2. Run the database schema:
```bash
cd backend
psql -U your_username -d pureborn_db -f database_schema.sql
psql -U your_username -d pureborn_db -f marketing_schema.sql
psql -U your_username -d pureborn_db -f customer_management_schema.sql
```

3. Create admin user:
```bash
npm run create-admin
```

### 4. Environment Configuration

Create `.env` files in each directory:

#### Backend `.env`
```env
# Database
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=pureborn_db
DB_PASSWORD=your_db_password
DB_PORT=5432

# JWT
JWT_SECRET=your_jwt_secret_key

# Server
PORT=5000
NODE_ENV=development

# Redis (optional)
REDIS_URL=redis://localhost:6379

# CORS
FRONTEND_URL=http://localhost:3000
ADMIN_FRONTEND_URL=http://localhost:3001

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Shiprocket
SHIPROCKET_EMAIL=your_shiprocket_email@example.com
SHIPROCKET_PASSWORD=your_shiprocket_password
SHIPROCKET_PICKUP_LOCATION=your_pickup_location_id

# TextLocal SMS
TEXTLOCAL_API_KEY=your_textlocal_api_key
```

## 🚀 Running the Application

### Backend
```bash
cd backend
npm run dev
```

### Frontend (Customer)
```bash
cd frontend
npm start
```

### Admin Frontend
```bash
cd admin-frontend
npm start
```

## 🔑 Admin Login

**Email:** admin@pureborn.com  
**Password:** admin123

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order (admin)

### Analytics
- `GET /api/analytics/overview` - Get overview analytics
- `GET /api/analytics/sales` - Get sales analytics
- `GET /api/analytics/customers` - Get customer analytics
- `GET /api/advanced-analytics/business-intelligence` - Business intelligence
- `GET /api/advanced-analytics/kpi-dashboard` - KPI dashboard
- `GET /api/advanced-analytics/predictive` - Predictive analytics

## 🛠️ Technology Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL
- Redis (for caching)
- JWT for authentication
- Socket.io for real-time features
- Nodemailer for emails
- Razorpay for payments
- Shiprocket API integration
- TextLocal for SMS

### Frontend
- React + TypeScript
- Tailwind CSS
- Axios for API calls
- Zustand for state management
- React Router (in admin frontend)

### Admin Dashboard
- React + TypeScript
- Tailwind CSS
- Axios for API calls
- Socket.io for real-time updates
- Custom WebSocket hook

## 📦 Project Structure

```
pureborn/
├── backend/          # Backend API server
│   ├── src/
│   │   ├── config/      # Database and Redis config
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Auth and error handling
│   │   ├── routes/      # API routes
│   │   └── services/    # Business logic
│   └── package.json
├── frontend/         # Customer-facing frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # Context providers
│   │   ├── lib/         # API client
│   │   └── pages/       # Page components
│   └── package.json
└── admin-frontend/   # Admin dashboard
    ├── src/
    │   ├── components/  # React components
    │   ├── contexts/    # Context providers
    │   ├── hooks/       # Custom hooks
    │   └── pages/       # Admin pages
    └── package.json
```

## 🎯 Key Features in Detail

### Real-time Features
- WebSocket integration for live updates
- Real-time notifications
- Live activity feed
- Connection status monitoring

### Advanced Analytics
- Business intelligence dashboard
- KPI tracking and benchmarks
- Predictive analytics
- Sales forecasting
- Customer lifetime value analysis
- Inventory demand prediction

### Marketing Tools
- Email campaigns
- SMS campaigns
- Promotional codes
- Customer segmentation
- Loyalty programs

### Customer Management
- Customer profiles
- Segmentation
- Communication logs
- Support tickets
- Loyalty points management

### Logistics Integration
- Shiprocket API integration
- Shipping zone management
- Tracking management
- AWB code generation

## 📝 License

This project is proprietary software. All rights reserved.

## 👥 Authors

Pureborn Development Team

## 🙏 Acknowledgments

- Built with modern web technologies
- Premium UI/UX design
- Enterprise-grade architecture
- Production-ready features
# Pureborn E-commerce Platform - Git Upload Guide

## 📦 What's Being Uploaded

This repository contains a complete enterprise-grade e-commerce platform for Pureborn Cold-Pressed Oils.

## 🗂️ Directory Structure

```
pureborn/
├── backend/                  # Backend API (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/          # Database and Redis configuration
│   │   ├── controllers/     # API controllers (18 controllers)
│   │   ├── middleware/      # Auth and error handling
│   │   ├── routes/          # API routes (18 route files)
│   │   └── services/        # Business logic services
│   ├── *.sql                # Database schema files
│   └── package.json
│
├── frontend/                # Customer Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/      # React components (Logo, ParticleSystem, etc.)
│   │   ├── contexts/        # AuthContext for state management
│   │   ├── lib/             # API client
│   │   ├── pages/           # Page components (Home, Products, Cart, etc.)
│   │   └── store/           # Zustand store
│   └── package.json
│
├── admin-frontend/          # Admin Dashboard (React + TypeScript)
│   ├── src/
│   │   ├── components/      # Layout and modal components
│   │   ├── contexts/         # AuthContext for admin
│   │   ├── hooks/            # Custom hooks (useWebSocket)
│   │   └── pages/            # Admin pages (Dashboard, Products, Orders, etc.)
│   └── package.json
│
└── README.md                # Comprehensive documentation

```

## 🔑 Admin Credentials

**Email:** admin@pureborn.com  
**Password:** admin123

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend Setup (Customer)
```bash
cd frontend
npm install
npm start
```

### 3. Admin Frontend Setup
```bash
cd admin-frontend
npm install
npm start
```

## 📊 Key Features

### Backend APIs
- ✅ Authentication & Authorization (JWT)
- ✅ Product Management (CRUD)
- ✅ Order Management
- ✅ Manufacturing Tracking
- ✅ Subscription System
- ✅ Email Notifications
- ✅ Enhanced E-commerce (Wishlist, Reviews, Search)
- ✅ Comprehensive E-commerce Features
- ✅ Logistics & Delivery (Shiprocket)
- ✅ Marketing Dashboard
- ✅ Customer Management
- ✅ Real-time Features (WebSocket)
- ✅ Advanced Analytics

### Frontend Features
- ✅ Premium UI/UX Design
- ✅ Product Catalog
- ✅ Shopping Cart
- ✅ Checkout Flow
- ✅ User Authentication
- ✅ Subscription Portal

### Admin Dashboard Features
- ✅ Dashboard with KPIs
- ✅ Product Management
- ✅ Order Management
- ✅ Manufacturing Management
- ✅ Analytics Dashboard
- ✅ Subscription Management
- ✅ Email Management
- ✅ Logistics Management
- ✅ Marketing Dashboard
- ✅ Customer Management
- ✅ Real-time Dashboard
- ✅ Advanced Analytics

## 📝 Important Files

### Database Schemas
- `backend/database_schema.sql` - Main database schema
- `backend/marketing_schema.sql` - Marketing tables
- `backend/customer_management_schema.sql` - Customer management tables

### Configuration
- `backend/env.example` - Environment variables example
- `.gitignore` - Git ignore rules

### Setup Scripts
- `backend/create-admin-user.js` - Create admin user
- `backend/setup_database.sql` - Database setup script

## 🎯 Technology Stack

- **Backend:** Node.js + Express + TypeScript + PostgreSQL + Redis
- **Frontend:** React + TypeScript + Tailwind CSS + Zustand
- **Admin:** React + TypeScript + Tailwind CSS + Socket.io
- **Payment:** Razorpay
- **Logistics:** Shiprocket
- **Email:** Nodemailer
- **Real-time:** Socket.io
- **Authentication:** JWT

## 📦 To Upload to Git

If you have Git installed, run:

```bash
git init
git add .
git commit -m "Initial commit: Pureborn E-commerce Platform"
git remote add origin <your-repo-url>
git push -u origin main
```

Or use GitHub Desktop or any Git GUI tool to upload.

## 🔧 Environment Variables

Each directory needs its own `.env` file:

### Backend
```env
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=pureborn_db
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your_jwt_secret
PORT=5000
# ... (see env.example for complete list)
```

### Frontend
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_BACKEND_URL=http://localhost:5000
```

### Admin Frontend
```env
REACT_APP_BACKEND_URL=http://localhost:5000
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
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
- `GET /api/analytics/overview` - Overview
- `GET /api/analytics/sales` - Sales analytics
- `GET /api/analytics/customers` - Customer analytics

### Advanced Analytics
- `GET /api/advanced-analytics/business-intelligence` - BI
- `GET /api/advanced-analytics/kpi-dashboard` - KPIs
- `GET /api/advanced-analytics/predictive` - Predictive

## 🎉 Features Included

- ✅ Complete e-commerce functionality
- ✅ Admin dashboard with all management features
- ✅ Real-time updates via WebSocket
- ✅ Advanced analytics and business intelligence
- ✅ Subscription management
- ✅ Marketing tools
- ✅ Customer management
- ✅ Logistics integration
- ✅ Payment integration
- ✅ Email notifications

## 📞 Support

For issues or questions, please contact the development team.

---

**Pureborn E-commerce Platform** - Enterprise-grade e-commerce solution

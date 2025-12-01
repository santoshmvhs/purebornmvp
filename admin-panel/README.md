# Augment POS Admin Panel

A modern, responsive web-based admin panel for the Augment POS system built with Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- 🔐 **Authentication** - Secure login with JWT tokens
- 📊 **Dashboard** - Real-time sales statistics and quick actions
- 📦 **Product Management** - Create, edit, and manage products
- 🛒 **Sales Tracking** - View all sales transactions with detailed breakdowns
- 📈 **Reports** - Daily and monthly sales analytics
- 👥 **User Management** - Admin-only user account management
- 🎨 **Modern UI** - Beautiful, responsive design with shadcn/ui components
- ⚡ **Fast & Efficient** - Built with Next.js 15 and React 19

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ installed
- Backend API running (production: `https://purebornmvp.onrender.com` or local: `http://localhost:9000`)
- Admin credentials (default: `admin` / `admin123`)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

4. Login with default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`

## Pages

### Dashboard (`/`)
- Overview of today's sales
- Total products count
- Low stock alerts
- Quick action links

### Products (`/products`)
- View all products with search
- Add new products (Admin only)
- Edit existing products (Admin only)
- Delete products (Admin only)

### Sales (`/sales`)
- View all sales transactions
- Detailed sale information
- Transaction history

### Reports (`/reports`)
- Today's sales summary
- Monthly sales analytics
- Revenue tracking

### Users (`/users`) - Admin Only
- View all users
- Create new users
- Activate/deactivate users
- Role management

## API Configuration

The admin panel connects to the backend API. 

### Production
The admin panel is configured to use the production backend by default:
- **Production Backend**: `https://purebornmvp.onrender.com`

### Local Development
For local development, create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:9000
```

See `.env.example` for production configuration or `.env.local.example` for local development.

## Build for Production

```bash
npm run build
npm start
```

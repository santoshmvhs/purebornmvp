# Augment POS Backend

Production-ready FastAPI backend for the Augment POS system with JWT authentication, PostgreSQL database, and comprehensive testing.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication
- 👥 **Role-Based Access Control** - Admin and Cashier roles
- 📦 **Product Management** - Full CRUD with search and pagination
- 💰 **Sales Processing** - Transaction handling with automatic tax calculation
- 📊 **Reporting** - Daily and monthly sales reports
- 🧪 **Comprehensive Testing** - Unit and integration tests with pytest
- 🐳 **Docker Support** - Easy deployment with Docker Compose
- 📝 **API Documentation** - Auto-generated with Swagger/ReDoc

## Quick Start with Docker (Recommended)

The easiest way to get started is using Docker Compose:

```bash
# Start the application and database
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop the application
docker-compose down
```

The API will be available at `http://localhost:8000`

Default credentials:
- **Username:** admin
- **Password:** admin123

## Manual Setup

### 1. Prerequisites

- Python 3.11+
- PostgreSQL 15+
- pip and virtualenv

### 2. Install Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/posdb
JWT_SECRET_KEY=your-super-secret-key-change-this
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### 4. Set up PostgreSQL Database

Create a PostgreSQL database:

```bash
createdb posdb
```

Or using psql:
```sql
CREATE DATABASE posdb;
```

### 5. Run Database Migrations (Optional)

If using Alembic for migrations:

```bash
# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

Or simply initialize the database with sample data:

```bash
python init_db.py
```

This will:
- Create all database tables
- Create an admin user (username: admin, password: admin123)
- Add sample products

### 6. Run the Application

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- **Swagger UI:** `http://localhost:8000/docs` (Interactive API documentation)
- **ReDoc:** `http://localhost:8000/redoc` (Alternative documentation)

## API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | Login with username/password, returns JWT token | No |
| POST | `/auth/register` | Register a new user (Admin only) | Yes (Admin) |

### Users (`/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/me` | Get current user info | Yes |
| GET | `/users` | List all users | Yes (Admin) |
| GET | `/users/{id}` | Get user by ID | Yes (Admin) |
| PATCH | `/users/{id}` | Update user (activate/deactivate, change role) | Yes (Admin) |

### Products (`/products`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/products` | List products (with search & pagination) | Yes |
| GET | `/products/{id}` | Get product by ID | Yes |
| POST | `/products` | Create a new product | Yes (Admin) |
| PUT | `/products/{id}` | Update a product | Yes (Admin) |
| DELETE | `/products/{id}` | Delete a product (soft delete by default) | Yes (Admin) |

### Sales (`/sales`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/sales` | Create a new sale | Yes |
| GET | `/sales/{id}` | Get sale by ID with items | Yes |
| GET | `/sales` | List sales (with date filtering) | Yes |

### Reports (`/reports`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/reports/daily` | Get daily sales summary | Yes |
| GET | `/reports/monthly` | Get monthly sales summary | Yes |

## Usage Examples

### 1. Login

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 2. Create a Product (Admin)

```bash
curl -X POST "http://localhost:8000/products" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "PROD001",
    "name": "Sample Product",
    "description": "A test product",
    "price": 29.99,
    "tax_rate": 0.10,
    "stock_qty": 100
  }'
```

### 3. List Products

```bash
curl -X GET "http://localhost:8000/products?search=Sample&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Create a Sale

```bash
curl -X POST "http://localhost:8000/sales" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"product_id": 1, "quantity": 2},
      {"product_id": 2, "quantity": 1}
    ]
  }'
```

### 5. Get Daily Sales Report

```bash
curl -X GET "http://localhost:8000/reports/daily?report_date=2024-01-15" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Running Tests

The project includes comprehensive unit and integration tests.

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v

# Run tests in parallel (faster)
pytest -n auto
```

Test coverage includes:
- ✅ Authentication (login, registration, token validation)
- ✅ Product CRUD operations
- ✅ Sales creation with stock management
- ✅ Tax calculations
- ✅ Daily and monthly reports
- ✅ Role-based access control
- ✅ Error handling

## Database Models

### User
- `id`: Integer (Primary Key)
- `username`: String (Unique, Indexed)
- `hashed_password`: String
- `is_active`: Boolean
- `role`: String (admin/cashier)

### Product
- `id`: Integer (Primary Key)
- `sku`: String (Unique, Indexed)
- `name`: String
- `description`: Text (Optional)
- `price`: Float
- `tax_rate`: Float (0.0 to 1.0)
- `stock_qty`: Float
- `is_active`: Boolean

### Customer
- `id`: Integer (Primary Key)
- `name`: String
- `phone`: String (Optional)
- `email`: String (Optional)
- `is_active`: Boolean
- `created_at`: DateTime

### Sale
- `id`: Integer (Primary Key)
- `created_at`: DateTime (Indexed)
- `user_id`: Integer (Foreign Key to User)
- `customer_id`: Integer (Foreign Key to Customer, Optional)
- `total_amount`: Float (Subtotal before tax)
- `total_tax`: Float
- `grand_total`: Float (Total including tax)

### SaleItem
- `id`: Integer (Primary Key)
- `sale_id`: Integer (Foreign Key to Sale)
- `product_id`: Integer (Foreign Key to Product)
- `quantity`: Float
- `unit_price`: Float (Price at time of sale)
- `line_total`: Float (quantity × unit_price)
- `line_tax`: Float

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration management
│   ├── database.py          # Database connection and session
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas for validation
│   ├── auth.py              # Authentication utilities
│   ├── deps.py              # Dependency injection functions
│   └── routers/
│       ├── __init__.py
│       ├── auth.py          # Authentication endpoints
│       ├── products.py      # Product management endpoints
│       ├── sales.py         # Sales transaction endpoints
│       ├── reports.py       # Reporting endpoints
│       └── users.py         # User management endpoints
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Pytest fixtures and configuration
│   ├── test_auth.py         # Authentication tests
│   ├── test_products.py     # Product tests
│   ├── test_sales.py        # Sales tests
│   └── test_reports.py      # Reports tests
├── alembic/                 # Database migrations
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
├── main.py                  # Application entry point
├── init_db.py               # Database initialization script
├── requirements.txt         # Python dependencies
├── Dockerfile               # Docker image definition
├── docker-compose.yml       # Docker Compose configuration
├── alembic.ini              # Alembic configuration
├── .env.example             # Environment variables template
└── README.md                # This file
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/posdb` |
| `JWT_SECRET_KEY` | Secret key for JWT token signing | `supersecretkey` |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration time in minutes | `60` |

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. Ensure PostgreSQL is running:
   ```bash
   # macOS
   brew services start postgresql

   # Linux
   sudo systemctl start postgresql
   ```

2. Verify database exists:
   ```bash
   psql -l | grep posdb
   ```

3. Check connection string in `.env` file

### Import Errors

If you get import errors, ensure you're in the backend directory and the virtual environment is activated:

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
```

### Port Already in Use

If port 8000 is already in use:

```bash
# Use a different port
uvicorn main:app --reload --port 8001

# Or find and kill the process using port 8000
lsof -ti:8000 | xargs kill -9
```

## Production Deployment

For production deployment:

1. **Change the JWT secret key** to a strong random value
2. **Use a production-grade database** (not SQLite)
3. **Enable HTTPS** with a reverse proxy (nginx, Caddy)
4. **Set proper CORS origins** in `main.py`
5. **Use environment variables** for all sensitive configuration
6. **Enable logging** and monitoring
7. **Run with a production ASGI server**:
   ```bash
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues or questions, please open an issue on the GitHub repository.


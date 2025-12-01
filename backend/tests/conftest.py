"""
Pytest configuration and fixtures for testing.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import User, Product
from app.auth import get_password_hash
from main import app

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database override."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db_session):
    """Create an admin user for testing."""
    user = User(
        username="admin",
        hashed_password=get_password_hash("admin123"),
        role="admin",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def cashier_user(db_session):
    """Create a cashier user for testing."""
    user = User(
        username="cashier",
        hashed_password=get_password_hash("cashier123"),
        role="cashier",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_token(client, admin_user):
    """Get JWT token for admin user."""
    response = client.post(
        "/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    return response.json()["access_token"]


@pytest.fixture
def cashier_token(client, cashier_user):
    """Get JWT token for cashier user."""
    response = client.post(
        "/auth/login",
        data={"username": "cashier", "password": "cashier123"}
    )
    return response.json()["access_token"]


@pytest.fixture
def sample_products(db_session):
    """Create sample products for testing."""
    products = [
        Product(
            sku="PROD001",
            name="Product 1",
            description="Test product 1",
            price=10.00,
            tax_rate=0.10,
            stock_qty=100,
            is_active=True
        ),
        Product(
            sku="PROD002",
            name="Product 2",
            description="Test product 2",
            price=20.00,
            tax_rate=0.10,
            stock_qty=50,
            is_active=True
        ),
        Product(
            sku="PROD003",
            name="Product 3",
            description="Test product 3",
            price=30.00,
            tax_rate=0.15,
            stock_qty=25,
            is_active=True
        ),
    ]
    for product in products:
        db_session.add(product)
    db_session.commit()
    for product in products:
        db_session.refresh(product)
    return products


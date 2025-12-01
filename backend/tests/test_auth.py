"""
Tests for authentication endpoints.
"""
import pytest
from fastapi import status


def test_login_success(client, admin_user):
    """Test successful login with valid credentials."""
    response = client.post(
        "/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_username(client, admin_user):
    """Test login with invalid username."""
    response = client.post(
        "/auth/login",
        data={"username": "wronguser", "password": "admin123"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect username or password" in response.json()["detail"]


def test_login_invalid_password(client, admin_user):
    """Test login with invalid password."""
    response = client.post(
        "/auth/login",
        data={"username": "admin", "password": "wrongpassword"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_inactive_user(client, db_session, admin_user):
    """Test login with inactive user account."""
    admin_user.is_active = False
    db_session.commit()
    
    response = client.post(
        "/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Inactive user" in response.json()["detail"]


def test_register_user_as_admin(client, admin_token):
    """Test user registration by admin."""
    response = client.post(
        "/auth/register",
        json={
            "username": "newuser",
            "password": "newpass123",
            "role": "cashier"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["username"] == "newuser"
    assert data["role"] == "cashier"
    assert data["is_active"] is True


def test_register_duplicate_username(client, admin_token, admin_user):
    """Test registration with existing username."""
    response = client.post(
        "/auth/register",
        json={
            "username": "admin",
            "password": "newpass123",
            "role": "cashier"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already registered" in response.json()["detail"]


def test_register_invalid_role(client, admin_token):
    """Test registration with invalid role."""
    response = client.post(
        "/auth/register",
        json={
            "username": "newuser",
            "password": "newpass123",
            "role": "invalid_role"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid role" in response.json()["detail"]


def test_register_as_cashier_forbidden(client, cashier_token):
    """Test that cashier cannot register new users."""
    response = client.post(
        "/auth/register",
        json={
            "username": "newuser",
            "password": "newpass123",
            "role": "cashier"
        },
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_access_protected_route_without_token(client):
    """Test accessing protected route without authentication."""
    response = client.get("/products")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_access_protected_route_with_invalid_token(client):
    """Test accessing protected route with invalid token."""
    response = client.get(
        "/products",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_access_protected_route_with_valid_token(client, cashier_token):
    """Test accessing protected route with valid token."""
    response = client.get(
        "/products",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_200_OK


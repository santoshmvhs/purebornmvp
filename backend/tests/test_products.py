"""
Tests for product endpoints.
"""
import pytest
from fastapi import status


def test_list_products(client, cashier_token, sample_products):
    """Test listing all products."""
    response = client.get(
        "/products",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 3
    assert data[0]["sku"] == "PROD001"


def test_list_products_with_search(client, cashier_token, sample_products):
    """Test product search by name."""
    response = client.get(
        "/products?search=Product 1",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Product 1"


def test_list_products_with_sku_search(client, cashier_token, sample_products):
    """Test product search by SKU."""
    response = client.get(
        "/products?search=PROD002",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["sku"] == "PROD002"


def test_list_products_pagination(client, cashier_token, sample_products):
    """Test product pagination."""
    response = client.get(
        "/products?page=1&limit=2",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2


def test_get_product_by_id(client, cashier_token, sample_products):
    """Test getting a specific product by ID."""
    product_id = sample_products[0].id
    response = client.get(
        f"/products/{product_id}",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == product_id
    assert data["sku"] == "PROD001"


def test_get_nonexistent_product(client, cashier_token):
    """Test getting a product that doesn't exist."""
    response = client.get(
        "/products/99999",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_create_product_as_admin(client, admin_token):
    """Test creating a product as admin."""
    response = client.post(
        "/products",
        json={
            "sku": "NEWPROD",
            "name": "New Product",
            "description": "A new test product",
            "price": 15.99,
            "tax_rate": 0.10,
            "stock_qty": 50
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["sku"] == "NEWPROD"
    assert data["price"] == 15.99


def test_create_product_as_cashier_forbidden(client, cashier_token):
    """Test that cashier cannot create products."""
    response = client.post(
        "/products",
        json={
            "sku": "NEWPROD",
            "name": "New Product",
            "price": 15.99
        },
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_create_product_duplicate_sku(client, admin_token, sample_products):
    """Test creating product with duplicate SKU."""
    response = client.post(
        "/products",
        json={
            "sku": "PROD001",
            "name": "Duplicate Product",
            "price": 15.99
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in response.json()["detail"]


def test_update_product(client, admin_token, sample_products):
    """Test updating a product."""
    product_id = sample_products[0].id
    response = client.put(
        f"/products/{product_id}",
        json={
            "name": "Updated Product Name",
            "price": 12.99
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Updated Product Name"
    assert data["price"] == 12.99


def test_update_nonexistent_product(client, admin_token):
    """Test updating a product that doesn't exist."""
    response = client.put(
        "/products/99999",
        json={"name": "Updated Name"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_soft_delete_product(client, admin_token, sample_products):
    """Test soft deleting a product."""
    product_id = sample_products[0].id
    response = client.delete(
        f"/products/{product_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify product is not in active list
    response = client.get(
        "/products?active_only=true",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    data = response.json()
    assert len(data) == 2  # Only 2 active products remaining


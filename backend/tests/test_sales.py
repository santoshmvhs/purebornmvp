"""
Tests for sales endpoints.
"""
import pytest
from fastapi import status


def test_create_sale_success(client, cashier_token, sample_products, db_session):
    """Test creating a sale with multiple items."""
    # Get initial stock quantities
    initial_stock_1 = sample_products[0].stock_qty
    initial_stock_2 = sample_products[1].stock_qty
    
    response = client.post(
        "/sales",
        json={
            "items": [
                {"product_id": sample_products[0].id, "quantity": 2},
                {"product_id": sample_products[1].id, "quantity": 1}
            ]
        },
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    
    # Verify sale data
    assert "id" in data
    assert len(data["items"]) == 2
    
    # Verify calculations
    # Product 1: 2 * 10.00 = 20.00, tax = 20.00 * 0.10 = 2.00
    # Product 2: 1 * 20.00 = 20.00, tax = 20.00 * 0.10 = 2.00
    # Total: 40.00, Tax: 4.00, Grand Total: 44.00
    assert data["total_amount"] == 40.00
    assert data["total_tax"] == 4.00
    assert data["grand_total"] == 44.00
    
    # Verify stock was decremented
    db_session.refresh(sample_products[0])
    db_session.refresh(sample_products[1])
    assert sample_products[0].stock_qty == initial_stock_1 - 2
    assert sample_products[1].stock_qty == initial_stock_2 - 1


def test_create_sale_with_different_tax_rates(client, cashier_token, sample_products):
    """Test sale calculation with different tax rates."""
    response = client.post(
        "/sales",
        json={
            "items": [
                {"product_id": sample_products[0].id, "quantity": 1},  # 10% tax
                {"product_id": sample_products[2].id, "quantity": 1}   # 15% tax
            ]
        },
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    
    # Product 1: 1 * 10.00 = 10.00, tax = 1.00
    # Product 3: 1 * 30.00 = 30.00, tax = 4.50
    # Total: 40.00, Tax: 5.50, Grand Total: 45.50
    assert data["total_amount"] == 40.00
    assert data["total_tax"] == 5.50
    assert data["grand_total"] == 45.50


def test_create_sale_empty_items(client, cashier_token):
    """Test creating a sale with no items."""
    response = client.post(
        "/sales",
        json={"items": []},
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "at least one item" in response.json()["detail"]


def test_create_sale_nonexistent_product(client, cashier_token):
    """Test creating a sale with non-existent product."""
    response = client.post(
        "/sales",
        json={
            "items": [{"product_id": 99999, "quantity": 1}]
        },
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_create_sale_insufficient_stock(client, cashier_token, sample_products):
    """Test creating a sale with insufficient stock."""
    response = client.post(
        "/sales",
        json={
            "items": [
                {"product_id": sample_products[0].id, "quantity": 1000}  # More than available
            ]
        },
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Insufficient stock" in response.json()["detail"]


def test_create_sale_inactive_product(client, cashier_token, sample_products, db_session):
    """Test creating a sale with inactive product."""
    sample_products[0].is_active = False
    db_session.commit()
    
    response = client.post(
        "/sales",
        json={
            "items": [{"product_id": sample_products[0].id, "quantity": 1}]
        },
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "not active" in response.json()["detail"]


def test_get_sale_by_id(client, cashier_token, sample_products):
    """Test retrieving a sale by ID."""
    # Create a sale first
    create_response = client.post(
        "/sales",
        json={
            "items": [{"product_id": sample_products[0].id, "quantity": 1}]
        },
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    sale_id = create_response.json()["id"]
    
    # Retrieve the sale
    response = client.get(
        f"/sales/{sale_id}",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == sale_id
    assert "items" in data
    assert "user" in data


def test_get_nonexistent_sale(client, cashier_token):
    """Test retrieving a sale that doesn't exist."""
    response = client.get(
        "/sales/99999",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_list_sales(client, cashier_token, sample_products):
    """Test listing all sales."""
    # Create a few sales
    for i in range(3):
        client.post(
            "/sales",
            json={
                "items": [{"product_id": sample_products[0].id, "quantity": 1}]
            },
            headers={"Authorization": f"Bearer {cashier_token}"}
        )
    
    response = client.get(
        "/sales",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 3


def test_list_sales_with_date_filter(client, cashier_token, sample_products):
    """Test listing sales with date filtering."""
    from datetime import date
    
    # Create a sale
    client.post(
        "/sales",
        json={
            "items": [{"product_id": sample_products[0].id, "quantity": 1}]
        },
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    
    today = date.today().isoformat()
    response = client.get(
        f"/sales?start_date={today}&end_date={today}",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1


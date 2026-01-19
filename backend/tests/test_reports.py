"""
Tests for reports endpoints.
"""
import pytest
from fastapi import status
from datetime import date


def test_daily_sales_report_with_sales(client, cashier_token, sample_products):
    """Test daily sales report with actual sales."""
    # Create some sales
    client.post(
        "/sales",
        json={
            "items": [
                {"product_id": sample_products[0].id, "quantity": 2},
                {"product_id": sample_products[1].id, "quantity": 1}
            ]
        },
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    
    client.post(
        "/sales",
        json={
            "items": [{"product_id": sample_products[0].id, "quantity": 1}]
        },
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    
    # Get today's report
    today = date.today().isoformat()
    response = client.get(
        f"/reports/daily?report_date={today}",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["date"] == today
    assert data["total_sales_count"] == 2
    # Sale 1: 2*10 + 1*20 = 40, tax = 4, total = 44
    # Sale 2: 1*10 = 10, tax = 1, total = 11
    # Combined: amount = 50, tax = 5, grand_total = 55
    assert data["total_amount"] == 50.0
    assert data["total_tax"] == 5.0
    assert data["total_grand_total"] == 55.0


def test_daily_sales_report_no_sales(client, cashier_token):
    """Test daily sales report with no sales."""
    today = date.today().isoformat()
    response = client.get(
        f"/reports/daily?report_date={today}",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["date"] == today
    assert data["total_sales_count"] == 0
    assert data["total_amount"] == 0.0
    assert data["total_tax"] == 0.0
    assert data["total_grand_total"] == 0.0


def test_monthly_sales_report_with_sales(client, cashier_token, sample_products):
    """Test monthly sales report with actual sales."""
    # Create some sales
    client.post(
        "/sales",
        json={
            "items": [{"product_id": sample_products[0].id, "quantity": 5}]
        },
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    
    client.post(
        "/sales",
        json={
            "items": [{"product_id": sample_products[1].id, "quantity": 2}]
        },
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    
    # Get this month's report
    today = date.today()
    response = client.get(
        f"/reports/monthly?year={today.year}&month={today.month}",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["year"] == today.year
    assert data["month"] == today.month
    assert data["total_sales_count"] == 2
    # Sale 1: 5*10 = 50, tax = 5, total = 55
    # Sale 2: 2*20 = 40, tax = 4, total = 44
    # Combined: amount = 90, tax = 9, grand_total = 99
    assert data["total_amount"] == 90.0
    assert data["total_tax"] == 9.0
    assert data["total_grand_total"] == 99.0


def test_monthly_sales_report_no_sales(client, cashier_token):
    """Test monthly sales report with no sales."""
    # Use a past month that definitely has no sales
    response = client.get(
        "/reports/monthly?year=2020&month=1",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["year"] == 2020
    assert data["month"] == 1
    assert data["total_sales_count"] == 0
    assert data["total_amount"] == 0.0
    assert data["total_tax"] == 0.0
    assert data["total_grand_total"] == 0.0


def test_monthly_sales_report_invalid_month(client, cashier_token):
    """Test monthly sales report with invalid month."""
    response = client.get(
        "/reports/monthly?year=2024&month=13",
        headers={"Authorization": f"Bearer {cashier_token}"}
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_reports_require_authentication(client):
    """Test that reports endpoints require authentication."""
    today = date.today()
    
    response = client.get(f"/reports/daily?report_date={today.isoformat()}")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    response = client.get(f"/reports/monthly?year={today.year}&month={today.month}")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


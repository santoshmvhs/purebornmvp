from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import date

from app.database import get_db
from app.deps import get_current_active_user
from app.models import OilCakeSale, Customer
from app.schemas import OilCakeSaleCreate, OilCakeSaleRead, OilCakeSaleUpdate, OilCakeSaleWithCustomer
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/oil-cake-sales", tags=["oil-cake-sales"])


@router.post("", response_model=OilCakeSaleWithCustomer, status_code=status.HTTP_201_CREATED)
async def create_oil_cake_sale(
    sale_data: OilCakeSaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Create a new oil cake sale."""
    try:
        # Calculate total
        total = sale_data.quantity * sale_data.price_per_kg
        
        # Create sale
        new_sale = OilCakeSale(
            date=sale_data.date,
            customer_id=sale_data.customer_id,
            cake_category=sale_data.cake_category,
            cake=sale_data.cake,
            quantity=sale_data.quantity,
            price_per_kg=sale_data.price_per_kg,
            total=total,
            is_paid=sale_data.is_paid,
            remarks=sale_data.remarks,
        )
        
        db.add(new_sale)
        await db.commit()
        await db.refresh(new_sale)
        
        # Load customer relationship
        if new_sale.customer_id:
            result = await db.execute(
                select(OilCakeSale)
                .options(selectinload(OilCakeSale.customer))
                .where(OilCakeSale.id == new_sale.id)
            )
            new_sale = result.scalar_one()
        
        logger.info(f"Oil cake sale created: {new_sale.id} by {current_user.username}")
        return new_sale
        
    except Exception as e:
        logger.error(f"Error creating oil cake sale: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create oil cake sale: {str(e)}"
        )


@router.get("", response_model=List[OilCakeSaleWithCustomer])
async def list_oil_cake_sales(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    customer_id: Optional[UUID] = Query(None, description="Filter by customer ID"),
    cake_category: Optional[str] = Query(None, description="Filter by cake category"),
    is_paid: Optional[bool] = Query(None, description="Filter by payment status"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """List all oil cake sales with pagination and filters."""
    try:
        query = select(OilCakeSale).options(selectinload(OilCakeSale.customer))
        
        # Apply filters
        filters = []
        if start_date:
            filters.append(OilCakeSale.date >= start_date)
        if end_date:
            filters.append(OilCakeSale.date <= end_date)
        if customer_id:
            filters.append(OilCakeSale.customer_id == customer_id)
        if cake_category:
            filters.append(OilCakeSale.cake_category.ilike(f"%{cake_category}%"))
        if is_paid is not None:
            filters.append(OilCakeSale.is_paid == is_paid)
        
        if filters:
            query = query.where(and_(*filters))
        
        # Order by date descending
        query = query.order_by(OilCakeSale.date.desc(), OilCakeSale.created_at.desc())
        
        # Pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        result = await db.execute(query)
        sales = result.scalars().unique().all()
        
        return sales
        
    except Exception as e:
        logger.error(f"Error listing oil cake sales: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list oil cake sales: {str(e)}"
        )


@router.get("/{sale_id}", response_model=OilCakeSaleWithCustomer)
async def get_oil_cake_sale(
    sale_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get a specific oil cake sale by ID."""
    try:
        result = await db.execute(
            select(OilCakeSale)
            .options(selectinload(OilCakeSale.customer))
            .where(OilCakeSale.id == sale_id)
        )
        sale = result.scalar_one_or_none()
        
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Oil cake sale not found"
            )
        
        return sale
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting oil cake sale: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get oil cake sale: {str(e)}"
        )


@router.put("/{sale_id}", response_model=OilCakeSaleWithCustomer)
async def update_oil_cake_sale(
    sale_id: UUID,
    sale_data: OilCakeSaleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Update an existing oil cake sale."""
    try:
        result = await db.execute(
            select(OilCakeSale).where(OilCakeSale.id == sale_id)
        )
        sale = result.scalar_one_or_none()
        
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Oil cake sale not found"
            )
        
        # Update fields
        update_data = sale_data.model_dump(exclude_unset=True)
        
        # Recalculate total if quantity or price_per_kg changed
        if 'quantity' in update_data or 'price_per_kg' in update_data:
            quantity = update_data.get('quantity', sale.quantity)
            price_per_kg = update_data.get('price_per_kg', sale.price_per_kg)
            update_data['total'] = float(quantity) * float(price_per_kg)
        
        for key, value in update_data.items():
            setattr(sale, key, value)
        
        await db.commit()
        await db.refresh(sale)
        
        # Load customer relationship
        result = await db.execute(
            select(OilCakeSale)
            .options(selectinload(OilCakeSale.customer))
            .where(OilCakeSale.id == sale.id)
        )
        sale = result.scalar_one()
        
        logger.info(f"Oil cake sale updated: {sale.id} by {current_user.username}")
        return sale
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating oil cake sale: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update oil cake sale: {str(e)}"
        )


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_oil_cake_sale(
    sale_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Delete an oil cake sale."""
    try:
        result = await db.execute(
            select(OilCakeSale).where(OilCakeSale.id == sale_id)
        )
        sale = result.scalar_one_or_none()
        
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Oil cake sale not found"
            )
        
        await db.delete(sale)
        await db.commit()
        
        logger.info(f"Oil cake sale deleted: {sale_id} by {current_user.username}")
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting oil cake sale: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete oil cake sale: {str(e)}"
        )


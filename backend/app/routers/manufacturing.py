"""
Manufacturing router for managing manufacturing batches (async).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal

from app.database import get_db
from app.models import (
    User, ManufacturingBatch, ManufacturingInput, ManufacturingOutput,
    RawMaterial, Product, ProductVariant, InventoryMovement
)
from app.schemas import (
    ManufacturingBatchCreate, ManufacturingBatchRead, ManufacturingBatchWithDetails,
    ManufacturingInputCreate, ManufacturingInputRead,
    ManufacturingOutputCreate, ManufacturingOutputRead
)
from app.deps import get_current_active_user

router = APIRouter(prefix="/manufacturing", tags=["Manufacturing"])


@router.post("", response_model=ManufacturingBatchWithDetails, status_code=status.HTTP_201_CREATED)
async def create_manufacturing_batch(
    batch_data: ManufacturingBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new manufacturing batch.
    
    - Creates batch with inputs (raw materials consumed) and outputs (products produced)
    - Updates inventory movements for raw materials (stock OUT) and products (stock IN)
    """
    try:
        # Validate inputs
        if batch_data.inputs:
            raw_material_ids = [inp.raw_material_id for inp in batch_data.inputs]
            result = await db.execute(
                select(RawMaterial).where(RawMaterial.id.in_(raw_material_ids))
            )
            raw_materials = result.scalars().all()
            raw_material_map = {rm.id: rm for rm in raw_materials}
            
            if len(raw_materials) != len(raw_material_ids):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="One or more raw materials not found"
                )
        
        # Validate outputs
        if batch_data.outputs:
            product_ids = [out.product_id for out in batch_data.outputs]
            result = await db.execute(
                select(Product).where(Product.id.in_(product_ids))
            )
            products = result.scalars().all()
            product_map = {p.id: p for p in products}
            
            if len(products) != len(product_ids):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="One or more products not found"
                )
            
            # Validate product variants if provided
            variant_ids = [out.product_variant_id for out in batch_data.outputs if out.product_variant_id]
            if variant_ids:
                result = await db.execute(
                    select(ProductVariant).where(ProductVariant.id.in_(variant_ids))
                )
                variants = result.scalars().all()
                variant_map = {v.id: v for v in variants}
                
                if len(variants) != len(variant_ids):
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="One or more product variants not found"
                    )
        
        # Create batch
        batch = ManufacturingBatch(
            batch_code=batch_data.batch_code,
            batch_date=batch_data.batch_date,
            notes=batch_data.notes,
        )
        db.add(batch)
        await db.flush()  # Get batch.id without committing
        
        # Create inputs
        input_records = []
        for inp_data in batch_data.inputs:
            raw_material = raw_material_map[inp_data.raw_material_id]
            quantity = Decimal(str(inp_data.quantity))
            rate = Decimal(str(inp_data.rate))
            amount = quantity * rate
            
            manufacturing_input = ManufacturingInput(
                batch_id=batch.id,
                raw_material_id=inp_data.raw_material_id,
                quantity=quantity,
                unit=inp_data.unit,
                rate=rate,
                amount=amount,
                purchase_item_id=inp_data.purchase_item_id,
            )
            db.add(manufacturing_input)
            input_records.append(manufacturing_input)
            
            # Create inventory movement (stock OUT for raw materials)
            movement = InventoryMovement(
                item_type="raw_material",
                item_id=raw_material.id,
                quantity_change=-quantity,  # Negative for stock out
                unit=inp_data.unit,
                cost_per_unit=rate,
                total_cost=amount,
                reference_type="manufacturing_input",
                reference_id=str(batch.id),
            )
            db.add(movement)
        
        # Create outputs
        output_records = []
        for out_data in batch_data.outputs:
            product = product_map[out_data.product_id]
            
            manufacturing_output = ManufacturingOutput(
                batch_id=batch.id,
                product_id=out_data.product_id,
                product_variant_id=out_data.product_variant_id,
                quantity_kg=Decimal(str(out_data.quantity_kg)) if out_data.quantity_kg else None,
                quantity_ltr=Decimal(str(out_data.quantity_ltr)) if out_data.quantity_ltr else None,
                unit=out_data.unit,
                total_output_quantity=Decimal(str(out_data.total_output_quantity)) if out_data.total_output_quantity else None,
                yield_percentage=Decimal(str(out_data.yield_percentage)) if out_data.yield_percentage else None,
            )
            db.add(manufacturing_output)
            output_records.append(manufacturing_output)
            
            # Create inventory movement (stock IN for product variants)
            if out_data.product_variant_id and out_data.total_output_quantity:
                movement = InventoryMovement(
                    item_type="product_variant",
                    item_id=out_data.product_variant_id,
                    quantity_change=Decimal(str(out_data.total_output_quantity)),  # Positive for stock in
                    unit=out_data.unit or "unit",
                    reference_type="manufacturing_output",
                    reference_id=str(batch.id),
                )
                db.add(movement)
        
        await db.commit()
        await db.refresh(batch)
        
        # Load relationships for response
        await db.refresh(batch, ["inputs", "outputs"])
        for inp in batch.inputs:
            await db.refresh(inp, ["raw_material"])
        for out in batch.outputs:
            await db.refresh(out, ["product", "product_variant"])
        
        return batch
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating manufacturing batch: {str(e)}"
        )


@router.get("", response_model=List[ManufacturingBatchRead])
async def list_manufacturing_batches(
    start_date: Optional[date] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List manufacturing batches with optional date filtering and pagination.
    """
    query = select(ManufacturingBatch)
    
    # Date range filtering
    if start_date:
        query = query.where(ManufacturingBatch.batch_date >= start_date)
    if end_date:
        query = query.where(ManufacturingBatch.batch_date <= end_date)
    
    # Order by most recent first
    query = query.order_by(ManufacturingBatch.created_at.desc())
    
    # Pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    batches = result.scalars().all()
    
    return batches


@router.get("/{batch_id}", response_model=ManufacturingBatchWithDetails)
async def get_manufacturing_batch(
    batch_id: UUID = Path(..., description="Manufacturing batch ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific manufacturing batch by ID with all inputs and outputs.
    """
    result = await db.execute(
        select(ManufacturingBatch)
        .options(
            selectinload(ManufacturingBatch.inputs).selectinload(ManufacturingInput.raw_material),
            selectinload(ManufacturingBatch.outputs).selectinload(ManufacturingOutput.product),
            selectinload(ManufacturingBatch.outputs).selectinload(ManufacturingOutput.product_variant),
        )
        .where(ManufacturingBatch.id == batch_id)
    )
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manufacturing batch not found"
        )
    return batch


@router.put("/{batch_id}", response_model=ManufacturingBatchWithDetails)
async def update_manufacturing_batch(
    batch_id: UUID = Path(..., description="Manufacturing batch ID"),
    batch_data: ManufacturingBatchCreate = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an existing manufacturing batch.
    Note: This is a simplified update - in production, you might want to handle
    inventory adjustments when inputs/outputs change.
    """
    result = await db.execute(
        select(ManufacturingBatch).where(ManufacturingBatch.id == batch_id)
    )
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manufacturing batch not found"
        )
    
    try:
        # Update batch fields
        batch.batch_code = batch_data.batch_code
        batch.batch_date = batch_data.batch_date
        batch.notes = batch_data.notes
        
        # Note: For a full implementation, you'd need to handle updating inputs/outputs
        # and adjusting inventory movements. This is a simplified version.
        
        await db.commit()
        await db.refresh(batch)
        
        # Load relationships
        await db.refresh(batch, ["inputs", "outputs"])
        
        return batch
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating manufacturing batch: {str(e)}"
        )


@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manufacturing_batch(
    batch_id: UUID = Path(..., description="Manufacturing batch ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a manufacturing batch.
    Note: This will cascade delete inputs and outputs, but you might want to
    reverse inventory movements in production.
    """
    result = await db.execute(
        select(ManufacturingBatch).where(ManufacturingBatch.id == batch_id)
    )
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manufacturing batch not found"
        )
    
    await db.delete(batch)
    await db.commit()
    
    return None


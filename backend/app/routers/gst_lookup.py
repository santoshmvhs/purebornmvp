"""
GST Lookup router for HSN code-based GST rate lookup.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from typing import Optional
from decimal import Decimal

from app.database import get_db
from app.models import User, Product, ProductVariant
from app.deps import get_current_active_user
from app.utils.gst_lookup import get_gst_rate_from_hsn, get_gst_details

router = APIRouter(prefix="/gst", tags=["GST Lookup"])


@router.get("/lookup")
async def lookup_gst_rate(
    hsn_code: str = Query(..., description="HSN code to lookup"),
    taxable_value: Optional[float] = Query(None, description="Taxable value for GST calculation"),
    is_interstate: bool = Query(False, description="Whether transaction is interstate"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Lookup GST rate from HSN code.
    Optionally calculate GST amounts if taxable_value is provided.
    """
    try:
        gst_rate = get_gst_rate_from_hsn(hsn_code)
        
        result = {
            "hsn_code": hsn_code,
            "gst_rate": gst_rate,
        }
        
        if taxable_value is not None:
            gst_details = get_gst_details(hsn_code, taxable_value, is_interstate)
            result.update(gst_details)
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error looking up GST: {str(e)}"
        )


@router.get("/product/{product_id}")
async def get_product_gst_rate(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get GST rate for a product by product ID.
    """
    from uuid import UUID
    
    try:
        product_uuid = UUID(product_id)
        product = await db.get(Product, product_uuid)
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        gst_rate = get_gst_rate_from_hsn(product.hsn_code)
        
        return {
            "product_id": product_id,
            "product_name": product.name,
            "hsn_code": product.hsn_code,
            "gst_rate": gst_rate,
        }
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID format"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting product GST rate: {str(e)}"
        )


@router.get("/variant/{variant_id}")
async def get_variant_gst_rate(
    variant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get GST rate for a product variant by variant ID.
    """
    from uuid import UUID
    from sqlalchemy import select
    
    try:
        variant_uuid = UUID(variant_id)
        result = await db.execute(
            select(ProductVariant)
            .options(selectinload(ProductVariant.product))
            .where(ProductVariant.id == variant_uuid)
        )
        variant = result.scalar_one_or_none()
        
        if not variant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product variant not found"
            )
        
        gst_rate = get_gst_rate_from_hsn(variant.product.hsn_code)
        
        return {
            "variant_id": variant_id,
            "variant_name": variant.variant_name,
            "product_name": variant.product.name,
            "hsn_code": variant.product.hsn_code,
            "gst_rate": gst_rate,
        }
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid variant ID format"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting variant GST rate: {str(e)}"
        )


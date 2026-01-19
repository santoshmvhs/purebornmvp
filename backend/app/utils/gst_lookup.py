"""
GST Lookup utility for HSN codes.
Provides GST rate lookup based on HSN codes.
"""
from typing import Optional, Dict

# Common HSN codes and their GST rates
# This is a simplified lookup table. For production, consider using an external API
# or maintaining a comprehensive database of HSN codes and GST rates.

HSN_GST_MAPPING: Dict[str, float] = {
    # Edible Oils and Fats (15%)
    "1507": 5.0,  # Edible oils
    "1508": 5.0,  # Groundnut oil
    "1509": 5.0,  # Olive oil
    "1510": 5.0,  # Other oils
    "1511": 5.0,  # Palm oil
    "1512": 5.0,  # Sunflower oil
    "1513": 5.0,  # Coconut oil
    "1514": 5.0,  # Rapeseed oil
    "1515": 5.0,  # Other fixed vegetable oils
    "1516": 5.0,  # Animal or vegetable fats and oils
    
    # Food Products (5% or 12%)
    "1001": 0.0,  # Wheat
    "1002": 0.0,  # Rye
    "1003": 0.0,  # Barley
    "1004": 0.0,  # Oats
    "1005": 0.0,  # Corn
    "1006": 0.0,  # Rice
    "1007": 0.0,  # Grain sorghum
    "1008": 0.0,  # Buckwheat, millet
    "1901": 5.0,  # Preparations of cereals
    "1902": 5.0,  # Pasta
    "1904": 5.0,  # Prepared foods
    "1905": 5.0,  # Bread, pastry, cakes
    
    # Beverages (12% or 18%)
    "2201": 18.0,  # Waters
    "2202": 18.0,  # Waters, including mineral waters
    "2203": 18.0,  # Beer
    "2204": 18.0,  # Wine
    "2205": 18.0,  # Vermouth
    "2206": 18.0,  # Other fermented beverages
    "2207": 18.0,  # Ethyl alcohol
    "2208": 18.0,  # Spirits
    "2209": 18.0,  # Vinegar
    
    # General items
    "8471": 18.0,  # Automatic data processing machines
    "8517": 18.0,  # Telephone sets
    "8528": 18.0,  # Monitors and projectors
    "8703": 28.0,  # Motor cars
    "8704": 28.0,  # Motor vehicles
    
    # Default rates for common categories
    "0": 18.0,  # Default GST rate
}

# Category-based GST rates (fallback)
CATEGORY_GST_MAPPING: Dict[str, float] = {
    "edible_oils": 5.0,
    "food_products": 5.0,
    "beverages": 18.0,
    "electronics": 18.0,
    "clothing": 5.0,
    "furniture": 18.0,
    "automobiles": 28.0,
    "services": 18.0,
    "default": 18.0,
}


def get_gst_rate_from_hsn(hsn_code: str) -> float:
    """
    Get GST rate from HSN code.
    
    Args:
        hsn_code: HSN code (can be 4, 6, or 8 digits)
    
    Returns:
        GST rate as percentage (e.g., 5.0 for 5%, 18.0 for 18%)
    """
    if not hsn_code:
        return CATEGORY_GST_MAPPING.get("default", 18.0)
    
    # Normalize HSN code (remove spaces, convert to string)
    hsn = str(hsn_code).strip().replace(" ", "")
    
    # Try exact match first
    if hsn in HSN_GST_MAPPING:
        return HSN_GST_MAPPING[hsn]
    
    # Try 4-digit match (first 4 digits)
    if len(hsn) >= 4:
        hsn_4 = hsn[:4]
        if hsn_4 in HSN_GST_MAPPING:
            return HSN_GST_MAPPING[hsn_4]
    
    # Try 2-digit match (first 2 digits) for category-level lookup
    if len(hsn) >= 2:
        hsn_2 = hsn[:2]
        # Map 2-digit codes to general categories
        category_map = {
            "15": 5.0,   # Animal or vegetable fats and oils
            "10": 0.0,   # Cereals
            "19": 5.0,   # Preparations of cereals, flour, starch
            "22": 18.0,  # Beverages
            "84": 18.0,  # Machinery
            "85": 18.0,  # Electrical machinery
            "87": 28.0,  # Vehicles
        }
        if hsn_2 in category_map:
            return category_map[hsn_2]
    
    # Default GST rate
    return CATEGORY_GST_MAPPING.get("default", 18.0)


def get_gst_details(hsn_code: str, taxable_value: float, is_interstate: bool = False) -> Dict[str, float]:
    """
    Calculate GST details (CGST, SGST, IGST) based on HSN code and taxable value.
    
    Args:
        hsn_code: HSN code
        taxable_value: Taxable value (amount before GST)
        is_interstate: Whether transaction is interstate (True) or intrastate (False)
    
    Returns:
        Dictionary with gst_rate, cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount, total_gst
    """
    gst_rate = get_gst_rate_from_hsn(hsn_code)
    
    if is_interstate:
        # Interstate: IGST only
        igst_rate = gst_rate
        cgst_rate = 0.0
        sgst_rate = 0.0
        igst_amount = (taxable_value * igst_rate) / 100
        cgst_amount = 0.0
        sgst_amount = 0.0
    else:
        # Intrastate: CGST + SGST (split equally)
        cgst_rate = gst_rate / 2
        sgst_rate = gst_rate / 2
        igst_rate = 0.0
        cgst_amount = (taxable_value * cgst_rate) / 100
        sgst_amount = (taxable_value * sgst_rate) / 100
        igst_amount = 0.0
    
    total_gst = cgst_amount + sgst_amount + igst_amount
    
    return {
        "gst_rate": gst_rate,
        "cgst_rate": cgst_rate,
        "sgst_rate": sgst_rate,
        "igst_rate": igst_rate,
        "cgst_amount": round(cgst_amount, 2),
        "sgst_amount": round(sgst_amount, 2),
        "igst_amount": round(igst_amount, 2),
        "total_gst": round(total_gst, 2),
    }


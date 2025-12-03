# Import Scripts

## Import Products from Excel

Import products and variants directly from the command line.

### Usage

```bash
cd backend
python scripts/import_products.py <path_to_excel_file>
```

### Example

```bash
# From the backend directory
python scripts/import_products.py ../Item-MOOSAPET-03_12_2025_09_34_55.xlsx

# Or with full path
python scripts/import_products.py /path/to/your/file.xlsx
```

### Requirements

1. **Database URL**: Make sure `DATABASE_URL` is set in your `.env` file:
   ```
   DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/database_name
   ```

2. **Dependencies**: The script uses `openpyxl` (already in requirements.txt) or `pandas` if available.

### Excel File Format

The script expects an Excel file with the following columns (case-insensitive):
- **Category** - Product category (will be created if doesn't exist)
- **Item-name** - Product name (required)
- **Variant-name** - Variant name (required)
- **Product-code** - Product code (optional)
- **SKU-code** - SKU code (optional)
- **Metric** - Unit (ml, Litre, kg, etc.)
- **Selling Price** - Selling price
- **Channel** - Sales channel (optional)

### What It Does

1. Reads the Excel file
2. Creates categories if they don't exist
3. Creates or updates products based on product_code
4. Creates or updates variants based on SKU code
5. Handles unit conversion (ml → L, gram → kg, etc.)
6. Extracts multiplier from variant names

### Output

The script will show:
- Progress as it processes each product/variant
- Summary at the end:
  - Number of products/variants created
  - Number of products/variants updated
  - Skipped items (with reasons)
  - Errors (if any)


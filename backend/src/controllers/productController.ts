import { Request, Response } from 'express';
import { query } from '../config/database';

export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    let queryParams: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += `WHERE (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (category) {
      paramCount++;
      const categoryCondition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${categoryCondition} category = $${paramCount}`;
      queryParams.push(category);
    }

    const productsQuery = `
      SELECT 
        p.*,
        COALESCE(SUM(pv.inventory_quantity), 0) as total_stock,
        COUNT(pv.id) as variant_count
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(Number(limit), offset);

    const result = await query(productsQuery, queryParams);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM products p ${whereClause}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      products: result.rows,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get product details
    const productResult = await query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );

    if (productResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    // Get product variants
    const variantsResult = await query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY size',
      [id]
    );

    // Get product images
    const imagesResult = await query(
      'SELECT * FROM product_images WHERE product_id = $1 ORDER BY display_order',
      [id]
    );

    const product = productResult.rows[0];
    product.variants = variantsResult.rows;
    product.images = imagesResult.rows;

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      short_description,
      category_id,
      sku,
      price,
      compare_price,
      cost_price,
      weight,
      weight_unit,
      volume,
      volume_unit,
      oil_type,
      extraction_method,
      shelf_life_months,
      storage_instructions,
      nutritional_info,
      ingredients,
      allergens,
      certifications,
      variants,
      images
    } = req.body;

    // Start transaction
    await query('BEGIN');

    // Create product
    const productResult = await query(
      `INSERT INTO products (name, description, short_description, category_id, sku, price, compare_price, cost_price, weight, weight_unit, volume, volume_unit, oil_type, extraction_method, shelf_life_months, storage_instructions, nutritional_info, ingredients, allergens, certifications)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [name, description, short_description, category_id, sku, price, compare_price, cost_price, weight, weight_unit, volume, volume_unit, oil_type, extraction_method, shelf_life_months, storage_instructions, nutritional_info, ingredients, allergens, certifications]
    );

    const product = productResult.rows[0];

    // Create variants
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        await query(
          `INSERT INTO product_variants (product_id, name, sku, price, compare_price, cost_price, weight, volume, volume_unit, inventory_quantity, low_stock_threshold, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [product.id, variant.name, variant.sku, variant.price, variant.compare_price, variant.cost_price, variant.weight, variant.volume, variant.volume_unit, variant.inventory_quantity || 0, variant.low_stock_threshold || 10, variant.sort_order || 0]
        );
      }
    }

    // Create images
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await query(
          `INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
           VALUES ($1, $2, $3, $4, $5)`,
          [product.id, images[i].url, images[i].alt_text, i + 1, i === 0]
        );
      }
    }

    await query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      base_price,
      variants,
      images,
      specifications,
      benefits,
      ingredients,
      certifications
    } = req.body;

    // Start transaction
    await query('BEGIN');

    // Update product
    const productResult = await query(
      `UPDATE products 
       SET name = $1, description = $2, category = $3, base_price = $4, 
           specifications = $5, benefits = $6, ingredients = $7, 
           certifications = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, description, category, base_price, specifications, benefits, ingredients, certifications, id]
    );

    if (productResult.rows.length === 0) {
      await query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    // Update variants (delete existing and create new)
    await query('DELETE FROM product_variants WHERE product_id = $1', [id]);
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        await query(
          `INSERT INTO product_variants (product_id, size, price, stock_quantity, sku)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, variant.size, variant.price, variant.stock_quantity, variant.sku]
        );
      }
    }

    // Update images (delete existing and create new)
    await query('DELETE FROM product_images WHERE product_id = $1', [id]);
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await query(
          `INSERT INTO product_images (product_id, image_url, alt_text, display_order)
           VALUES ($1, $2, $3, $4)`,
          [id, images[i].url, images[i].alt_text, i + 1]
        );
      }
    }

    await query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: productResult.rows[0]
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if product exists
    const productResult = await query('SELECT id FROM products WHERE id = $1', [id]);
    if (productResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    // Start transaction
    await query('BEGIN');

    // Delete related records
    await query('DELETE FROM product_images WHERE product_id = $1', [id]);
    await query('DELETE FROM product_variants WHERE product_id = $1', [id]);
    await query('DELETE FROM products WHERE id = $1', [id]);

    await query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};

export const updateStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { variant_id, quantity, operation } = req.body; // operation: 'add', 'subtract', 'set'

    let updateQuery = '';
    let queryParams: any[] = [];

    switch (operation) {
      case 'add':
        updateQuery = 'UPDATE product_variants SET stock_quantity = stock_quantity + $1 WHERE id = $2 AND product_id = $3';
        queryParams = [quantity, variant_id, id];
        break;
      case 'subtract':
        updateQuery = 'UPDATE product_variants SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2 AND product_id = $3';
        queryParams = [quantity, variant_id, id];
        break;
      case 'set':
        updateQuery = 'UPDATE product_variants SET stock_quantity = $1 WHERE id = $2 AND product_id = $3';
        queryParams = [quantity, variant_id, id];
        break;
      default:
        res.status(400).json({ success: false, message: 'Invalid operation' });
        return;
    }

    const result = await query(updateQuery, queryParams);

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Product variant not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully'
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ success: false, message: 'Failed to update stock' });
  }
};

export const getProductCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category'
    );

    res.status(200).json({
      success: true,
      categories: result.rows.map(row => row.category)
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};
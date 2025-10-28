import { Request, Response } from 'express';
import { query } from '../config/database';

export const getAllBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, oil_type, date_from, date_to } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    let queryParams: any[] = [];
    let paramCount = 0;

    if (oil_type) {
      paramCount++;
      whereClause += `WHERE oil_type = $${paramCount}`;
      queryParams.push(oil_type);
    }

    if (status) {
      paramCount++;
      const statusCondition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${statusCondition} status = $${paramCount}`;
      queryParams.push(status);
    }

    if (date_from) {
      paramCount++;
      const dateCondition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${dateCondition} extraction_date >= $${paramCount}`;
      queryParams.push(date_from);
    }

    if (date_to) {
      paramCount++;
      const dateCondition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${dateCondition} extraction_date <= $${paramCount}`;
      queryParams.push(date_to);
    }

    const batchesQuery = `
      SELECT 
        mb.*,
        p.name as product_name,
        pv.name as variant_name,
        CASE 
          WHEN mb.quantity_bottled >= mb.quantity_produced THEN 'completed'
          WHEN mb.quantity_bottled > 0 THEN 'partial'
          WHEN mb.quality_check_passed THEN 'ready'
          ELSE 'pending'
        END as status
      FROM manufacturing_batches mb
      LEFT JOIN products p ON mb.product_id = p.id
      LEFT JOIN product_variants pv ON mb.variant_id = pv.id
      ${whereClause}
      ORDER BY mb.extraction_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(Number(limit), offset);

    const result = await query(batchesQuery, queryParams);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM manufacturing_batches mb ${whereClause}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      batches: result.rows,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch batches' });
  }
};

export const getBatchById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get batch details
    const batchResult = await query(
      `SELECT mb.*, p.name as product_name, pv.name as variant_name
       FROM manufacturing_batches mb
       LEFT JOIN products p ON mb.product_id = p.id
       LEFT JOIN product_variants pv ON mb.variant_id = pv.id
       WHERE mb.id = $1`,
      [id]
    );

    if (batchResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Batch not found' });
      return;
    }

    // Get quality check history
    const qualityHistoryResult = await query(
      `SELECT * FROM quality_checks
       WHERE batch_id = $1
       ORDER BY check_date DESC`,
      [id]
    );

    // Get bottling records
    const bottlingResult = await query(
      `SELECT * FROM bottling_records
       WHERE batch_id = $1
       ORDER BY bottling_date DESC`,
      [id]
    );

    const batch = batchResult.rows[0];
    batch.quality_history = qualityHistoryResult.rows;
    batch.bottling_records = bottlingResult.rows;

    res.status(200).json({
      success: true,
      batch
    });
  } catch (error) {
    console.error('Get batch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch batch' });
  }
};

export const createBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      batch_number,
      product_id,
      variant_id,
      oil_type,
      extraction_date,
      expiry_date,
      quantity_produced,
      extraction_method,
      source_location,
      temperature_controlled,
      notes
    } = req.body;

    // Start transaction
    await query('BEGIN');

    // Create batch
    const batchResult = await query(
      `INSERT INTO manufacturing_batches (batch_number, product_id, variant_id, oil_type, extraction_date, expiry_date, quantity_produced, extraction_method, source_location, temperature_controlled, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [batch_number, product_id, variant_id, oil_type, extraction_date, expiry_date, quantity_produced, extraction_method, source_location, temperature_controlled, notes]
    );

    const batch = batchResult.rows[0];

    await query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      batch
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Create batch error:', error);
    res.status(500).json({ success: false, message: 'Failed to create batch' });
  }
};

export const updateBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      oil_type,
      extraction_date,
      expiry_date,
      quantity_produced,
      extraction_method,
      source_location,
      temperature_controlled,
      notes
    } = req.body;

    const batchResult = await query(
      `UPDATE manufacturing_batches 
       SET oil_type = $1, extraction_date = $2, expiry_date = $3, quantity_produced = $4, 
           extraction_method = $5, source_location = $6, temperature_controlled = $7, 
           notes = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [oil_type, extraction_date, expiry_date, quantity_produced, extraction_method, source_location, temperature_controlled, notes, id]
    );

    if (batchResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Batch not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      batch: batchResult.rows[0]
    });
  } catch (error) {
    console.error('Update batch error:', error);
    res.status(500).json({ success: false, message: 'Failed to update batch' });
  }
};

export const performQualityCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      check_type,
      ph_level,
      acidity_level,
      color_grade,
      aroma_notes,
      taste_notes,
      viscosity,
      moisture_content,
      impurities_detected,
      overall_grade,
      passed,
      notes,
      checked_by
    } = req.body;

    // Start transaction
    await query('BEGIN');

    // Create quality check record
    const qualityResult = await query(
      `INSERT INTO quality_checks (batch_id, check_type, ph_level, acidity_level, color_grade, aroma_notes, taste_notes, viscosity, moisture_content, impurities_detected, overall_grade, passed, notes, checked_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [id, check_type, ph_level, acidity_level, color_grade, aroma_notes, taste_notes, viscosity, moisture_content, impurities_detected, overall_grade, passed, notes, checked_by]
    );

    // Update batch quality status
    await query(
      `UPDATE manufacturing_batches 
       SET quality_check_passed = $1, quality_check_date = CURRENT_DATE
       WHERE id = $2`,
      [passed, id]
    );

    await query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Quality check recorded successfully',
      quality_check: qualityResult.rows[0]
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Quality check error:', error);
    res.status(500).json({ success: false, message: 'Failed to record quality check' });
  }
};

export const recordBottling = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      bottling_date,
      quantity_bottled,
      bottle_size,
      batch_number_used,
      bottling_line,
      operator_name,
      quality_check_passed,
      notes
    } = req.body;

    // Start transaction
    await query('BEGIN');

    // Create bottling record
    const bottlingResult = await query(
      `INSERT INTO bottling_records (batch_id, bottling_date, quantity_bottled, bottle_size, batch_number_used, bottling_line, operator_name, quality_check_passed, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, bottling_date, quantity_bottled, bottle_size, batch_number_used, bottling_line, operator_name, quality_check_passed, notes]
    );

    // Update batch bottling quantity
    await query(
      `UPDATE manufacturing_batches 
       SET quantity_bottled = quantity_bottled + $1, bottling_date = $2
       WHERE id = $3`,
      [quantity_bottled, bottling_date, id]
    );

    // Update inventory
    await query(
      `UPDATE product_variants 
       SET inventory_quantity = inventory_quantity + $1
       WHERE id = (SELECT variant_id FROM manufacturing_batches WHERE id = $2)`,
      [quantity_bottled, id]
    );

    await query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Bottling recorded successfully',
      bottling_record: bottlingResult.rows[0]
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Bottling error:', error);
    res.status(500).json({ success: false, message: 'Failed to record bottling' });
  }
};

export const getManufacturingAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query; // days

    // Production summary
    const productionResult = await query(
      `SELECT 
        COUNT(*) as total_batches,
        SUM(quantity_produced) as total_oil_produced,
        SUM(quantity_bottled) as total_oil_bottled,
        AVG(quantity_produced) as avg_batch_size
       FROM manufacturing_batches 
       WHERE extraction_date >= CURRENT_DATE - INTERVAL '${period} days'`
    );

    // Quality metrics
    const qualityResult = await query(
      `SELECT 
        COUNT(*) as total_checks,
        SUM(CASE WHEN passed THEN 1 ELSE 0 END) as passed_checks,
        AVG(CASE WHEN passed THEN 1.0 ELSE 0.0 END) * 100 as pass_rate
       FROM quality_checks qc
       JOIN manufacturing_batches mb ON qc.batch_id = mb.id
       WHERE mb.extraction_date >= CURRENT_DATE - INTERVAL '${period} days'`
    );

    // Production by oil type
    const oilTypeResult = await query(
      `SELECT 
        oil_type,
        COUNT(*) as batch_count,
        SUM(quantity_produced) as total_produced,
        SUM(quantity_bottled) as total_bottled
       FROM manufacturing_batches 
       WHERE extraction_date >= CURRENT_DATE - INTERVAL '${period} days'
       GROUP BY oil_type
       ORDER BY total_produced DESC`
    );

    // Daily production trend
    const trendResult = await query(
      `SELECT 
        DATE(extraction_date) as date,
        COUNT(*) as batches,
        SUM(quantity_produced) as oil_produced,
        SUM(quantity_bottled) as oil_bottled
       FROM manufacturing_batches 
       WHERE extraction_date >= CURRENT_DATE - INTERVAL '${period} days'
       GROUP BY DATE(extraction_date)
       ORDER BY date ASC`
    );

    res.status(200).json({
      success: true,
      analytics: {
        production: productionResult.rows[0],
        quality: qualityResult.rows[0],
        oilTypes: oilTypeResult.rows,
        dailyTrend: trendResult.rows
      }
    });
  } catch (error) {
    console.error('Get manufacturing analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

export const getOilTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'SELECT DISTINCT oil_type FROM manufacturing_batches WHERE oil_type IS NOT NULL ORDER BY oil_type'
    );

    res.status(200).json({
      success: true,
      oil_types: result.rows.map(row => row.oil_type)
    });
  } catch (error) {
    console.error('Get oil types error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch oil types' });
  }
};
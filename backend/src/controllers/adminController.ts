import { Request, Response } from 'express';
import { query } from '../config/database';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get various statistics
    const totalOrdersResult = await query('SELECT COUNT(*) FROM orders');
    const totalRevenueResult = await query('SELECT SUM(total_amount) FROM orders WHERE payment_status = $1', ['paid']);
    const totalProductsResult = await query('SELECT COUNT(*) FROM products WHERE is_active = true');
    const totalUsersResult = await query('SELECT COUNT(*) FROM users WHERE is_active = true');

    res.status(200).json({
      success: true,
      stats: {
        totalOrders: parseInt(totalOrdersResult.rows[0].count),
        totalRevenue: parseFloat(totalRevenueResult.rows[0].sum || 0),
        totalProducts: parseInt(totalProductsResult.rows[0].count),
        totalUsers: parseInt(totalUsersResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getSalesAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;
    
    const result = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total_amount) as revenue 
       FROM orders 
       WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days' 
       GROUP BY DATE(created_at) 
       ORDER BY date`
    );

    res.status(200).json({
      success: true,
      analytics: result.rows
    });
  } catch (error) {
    console.error('Get sales analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getInventoryAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const lowStockResult = await query(
      'SELECT COUNT(*) FROM product_variants WHERE inventory_quantity <= low_stock_threshold'
    );
    
    const totalInventoryResult = await query(
      'SELECT SUM(inventory_quantity) FROM product_variants'
    );

    res.status(200).json({
      success: true,
      analytics: {
        lowStockItems: parseInt(lowStockResult.rows[0].count),
        totalInventory: parseInt(totalInventoryResult.rows[0].sum || 0)
      }
    });
  } catch (error) {
    console.error('Get inventory analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getCustomerAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const newCustomersResult = await query(
      'SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\''
    );
    
    const activeCustomersResult = await query(
      'SELECT COUNT(DISTINCT user_id) FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\''
    );

    res.status(200).json({
      success: true,
      analytics: {
        newCustomers: parseInt(newCustomersResult.rows[0].count),
        activeCustomers: parseInt(activeCustomersResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get customer analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getProductionAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalBatchesResult = await query('SELECT COUNT(*) FROM manufacturing_batches');
    const qualityPassedResult = await query('SELECT COUNT(*) FROM manufacturing_batches WHERE quality_check_passed = true');

    res.status(200).json({
      success: true,
      analytics: {
        totalBatches: parseInt(totalBatchesResult.rows[0].count),
        qualityPassed: parseInt(qualityPassedResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get production analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateSystemSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    // This would typically update settings in a settings table
    // For now, just return success
    res.status(200).json({
      success: true,
      message: 'System settings updated successfully'
    });
  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

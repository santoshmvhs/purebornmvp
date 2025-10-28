import { Request, Response } from 'express';
import { query } from '../config/database';

export const getBusinessAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30', start_date, end_date } = req.query;
    
    // Determine date range
    let dateCondition = '';
    if (start_date && end_date) {
      dateCondition = `WHERE created_at >= '${start_date}' AND created_at <= '${end_date}'`;
    } else {
      dateCondition = `WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'`;
    }

    // Sales Analytics
    const salesResult = await query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as delivered_revenue,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders
      FROM orders 
      ${dateCondition}
      AND status != 'cancelled'
    `);

    // Customer Analytics
    const customerResult = await query(`
      SELECT 
        COUNT(DISTINCT user_id) as total_customers,
        COUNT(DISTINCT CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN user_id END) as new_customers_week,
        COUNT(DISTINCT CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN user_id END) as new_customers_month
      FROM orders 
      ${dateCondition}
    `);

    // Product Analytics
    const productResult = await query(`
      SELECT 
        p.name as product_name,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.total_price) as total_revenue,
        AVG(oi.unit_price) as average_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      ${dateCondition.replace('created_at', 'o.created_at')}
      AND o.status != 'cancelled'
      GROUP BY p.id, p.name
      ORDER BY total_revenue DESC
      LIMIT 10
    `);

    // Manufacturing Analytics
    const manufacturingResult = await query(`
      SELECT 
        COUNT(*) as total_batches,
        SUM(quantity_produced) as total_oil_produced,
        SUM(quantity_bottled) as total_oil_bottled,
        AVG(quantity_produced) as avg_batch_size,
        COUNT(CASE WHEN quality_check_passed THEN 1 END) as quality_passed_batches,
        COUNT(CASE WHEN quality_check_passed THEN 1 END)::float / COUNT(*) * 100 as quality_pass_rate
      FROM manufacturing_batches 
      ${dateCondition.replace('created_at', 'extraction_date')}
    `);

    // Daily Sales Trend
    const dailyTrendResult = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders 
      ${dateCondition}
      AND status != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Order Status Breakdown
    const statusBreakdownResult = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM orders 
      ${dateCondition}
      GROUP BY status
      ORDER BY count DESC
    `);

    // Manufacturing by Oil Type
    const oilTypeResult = await query(`
      SELECT 
        oil_type,
        COUNT(*) as batch_count,
        SUM(quantity_produced) as total_produced,
        SUM(quantity_bottled) as total_bottled,
        AVG(quantity_produced) as avg_production
      FROM manufacturing_batches 
      ${dateCondition.replace('created_at', 'extraction_date')}
      GROUP BY oil_type
      ORDER BY total_produced DESC
    `);

    // Customer Retention (repeat customers)
    const retentionResult = await query(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN order_count > 1 THEN 1 END) as repeat_customers,
        COUNT(CASE WHEN order_count > 1 THEN 1 END)::float / COUNT(*) * 100 as retention_rate
      FROM (
        SELECT user_id, COUNT(*) as order_count
        FROM orders 
        ${dateCondition}
        GROUP BY user_id
      ) customer_stats
    `);

    // Inventory Analytics
    const inventoryResult = await query(`
      SELECT 
        p.name as product_name,
        SUM(pv.inventory_quantity) as total_stock,
        COUNT(CASE WHEN pv.inventory_quantity < pv.low_stock_threshold THEN 1 END) as low_stock_variants,
        SUM(pv.inventory_quantity * pv.price) as inventory_value
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      GROUP BY p.id, p.name
      ORDER BY inventory_value DESC
    `);

    // Growth Metrics
    const growthResult = await query(`
      SELECT 
        'orders' as metric,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as current_period,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as previous_period
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
      UNION ALL
      SELECT 
        'revenue' as metric,
        SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN total_amount ELSE 0 END) as current_period,
        SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days' THEN total_amount ELSE 0 END) as previous_period
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
      AND status != 'cancelled'
    `);

    res.status(200).json({
      success: true,
      analytics: {
        sales: salesResult.rows[0],
        customers: customerResult.rows[0],
        products: productResult.rows,
        manufacturing: manufacturingResult.rows[0],
        dailyTrend: dailyTrendResult.rows,
        statusBreakdown: statusBreakdownResult.rows,
        oilTypes: oilTypeResult.rows,
        retention: retentionResult.rows[0],
        inventory: inventoryResult.rows,
        growth: growthResult.rows
      }
    });
  } catch (error) {
    console.error('Get business analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

export const getSalesForecast = async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = 30 } = req.query;

    // Get historical sales data for forecasting
    const historicalResult = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
      AND status != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Simple linear regression for forecasting
    const data = historicalResult.rows;
    const n = data.length;
    
    if (n < 2) {
      res.status(200).json({
        success: true,
        forecast: []
      });
      return;
    }

    // Calculate trend
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    data.forEach((row, index) => {
      const x = index;
      const y = parseFloat(row.revenue) || 0;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast
    const forecast = [];
    for (let i = 0; i < parseInt(days as string); i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i + 1);
      
      const predictedRevenue = Math.max(0, slope * (n + i) + intercept);
      const predictedOrders = Math.max(0, Math.round(predictedRevenue / (sumY / n)));

      forecast.push({
        date: futureDate.toISOString().split('T')[0],
        predicted_revenue: Math.round(predictedRevenue),
        predicted_orders: predictedOrders,
        confidence: Math.max(0.1, Math.min(0.9, 1 - (i / parseInt(days as string))))
      });
    }

    res.status(200).json({
      success: true,
      forecast,
      trend: {
        slope: slope,
        direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable'
      }
    });
  } catch (error) {
    console.error('Get sales forecast error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate forecast' });
  }
};

export const getCustomerInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;

    // Customer segmentation
    const segmentationResult = await query(`
      SELECT 
        CASE 
          WHEN total_spent >= 5000 THEN 'VIP'
          WHEN total_spent >= 2000 THEN 'Premium'
          WHEN total_spent >= 1000 THEN 'Regular'
          ELSE 'New'
        END as segment,
        COUNT(*) as customer_count,
        AVG(total_spent) as avg_spent,
        AVG(order_count) as avg_orders
      FROM (
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          COUNT(o.id) as order_count,
          SUM(o.total_amount) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE o.created_at >= CURRENT_DATE - INTERVAL '${period} days'
        OR o.created_at IS NULL
        GROUP BY u.id, u.first_name, u.last_name, u.email
      ) customer_stats
      GROUP BY segment
      ORDER BY avg_spent DESC
    `);

    // Customer lifetime value
    const ltvResult = await query(`
      SELECT 
        AVG(total_spent) as avg_ltv,
        MAX(total_spent) as max_ltv,
        MIN(total_spent) as min_ltv,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_spent) as median_ltv
      FROM (
        SELECT 
          user_id,
          SUM(total_amount) as total_spent
        FROM orders 
        WHERE status != 'cancelled'
        GROUP BY user_id
      ) customer_ltv
    `);

    // Customer acquisition cost (simplified)
    const acquisitionResult = await query(`
      SELECT 
        COUNT(DISTINCT user_id) as new_customers,
        SUM(total_amount) as revenue_from_new_customers
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
      AND user_id IN (
        SELECT user_id 
        FROM orders 
        GROUP BY user_id 
        HAVING COUNT(*) = 1
      )
    `);

    res.status(200).json({
      success: true,
      insights: {
        segmentation: segmentationResult.rows,
        lifetimeValue: ltvResult.rows[0],
        acquisition: acquisitionResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Get customer insights error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer insights' });
  }
};

export const getOperationalMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;

    // Order fulfillment metrics
    const fulfillmentResult = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        AVG(CASE WHEN delivered_at IS NOT NULL THEN EXTRACT(EPOCH FROM (delivered_at - created_at))/86400 ELSE NULL END) as avg_delivery_days
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
    `);

    // Manufacturing efficiency
    const efficiencyResult = await query(`
      SELECT 
        COUNT(*) as total_batches,
        SUM(quantity_produced) as total_produced,
        SUM(quantity_bottled) as total_bottled,
        AVG(quantity_produced) as avg_production_per_batch,
        COUNT(CASE WHEN quality_check_passed THEN 1 END) as quality_passed,
        COUNT(CASE WHEN quality_check_passed THEN 1 END)::float / COUNT(*) * 100 as quality_pass_rate
      FROM manufacturing_batches 
      WHERE extraction_date >= CURRENT_DATE - INTERVAL '${period} days'
    `);

    // Inventory turnover
    const turnoverResult = await query(`
      SELECT 
        p.name as product_name,
        SUM(pv.inventory_quantity) as current_stock,
        SUM(oi.quantity) as units_sold,
        CASE 
          WHEN SUM(pv.inventory_quantity) > 0 
          THEN SUM(oi.quantity)::float / SUM(pv.inventory_quantity) * 100 
          ELSE 0 
        END as turnover_rate
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      LEFT JOIN order_items oi ON pv.id = oi.variant_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${period} days'
      OR o.created_at IS NULL
      GROUP BY p.id, p.name
      ORDER BY turnover_rate DESC
    `);

    res.status(200).json({
      success: true,
      metrics: {
        fulfillment: fulfillmentResult.rows[0],
        efficiency: efficiencyResult.rows[0],
        turnover: turnoverResult.rows
      }
    });
  } catch (error) {
    console.error('Get operational metrics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch operational metrics' });
  }
};



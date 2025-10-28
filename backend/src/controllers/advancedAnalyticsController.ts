import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Business Intelligence Analytics
export const getBusinessIntelligence = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = '30', compare_period = '30' } = req.query;

    // Revenue Analytics
    const revenueAnalytics = await query(`
      WITH current_period AS (
        SELECT 
          SUM(total_amount) as revenue,
          COUNT(*) as orders,
          AVG(total_amount) as avg_order_value,
          COUNT(DISTINCT user_id) as unique_customers
        FROM orders 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
      ),
      previous_period AS (
        SELECT 
          SUM(total_amount) as revenue,
          COUNT(*) as orders,
          AVG(total_amount) as avg_order_value,
          COUNT(DISTINCT user_id) as unique_customers
        FROM orders 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${compare_period} days' 
        AND created_at < CURRENT_DATE - INTERVAL '${period} days'
      )
      SELECT 
        cp.*,
        pp.revenue as prev_revenue,
        pp.orders as prev_orders,
        pp.avg_order_value as prev_avg_order_value,
        pp.unique_customers as prev_unique_customers,
        CASE 
          WHEN pp.revenue > 0 THEN ROUND(((cp.revenue - pp.revenue) / pp.revenue) * 100, 2)
          ELSE 0 
        END as revenue_growth_percentage,
        CASE 
          WHEN pp.orders > 0 THEN ROUND(((cp.orders - pp.orders) / pp.orders) * 100, 2)
          ELSE 0 
        END as orders_growth_percentage
      FROM current_period cp, previous_period pp
    `);

    // Customer Analytics
    const customerAnalytics = await query(`
      WITH customer_metrics AS (
        SELECT 
          COUNT(*) as total_customers,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '${period} days' THEN 1 END) as new_customers,
          COUNT(CASE WHEN last_login >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_customers,
          COUNT(CASE WHEN id IN (SELECT user_id FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days') THEN 1 END) as purchasing_customers
        FROM users 
        WHERE role = 'customer' AND is_active = true
      ),
      customer_value AS (
        SELECT 
          AVG(total_spent) as avg_customer_value,
          MAX(total_spent) as max_customer_value,
          COUNT(CASE WHEN total_spent >= 10000 THEN 1 END) as high_value_customers,
          COUNT(CASE WHEN total_spent >= 5000 AND total_spent < 10000 THEN 1 END) as medium_value_customers,
          COUNT(CASE WHEN total_spent < 5000 THEN 1 END) as low_value_customers
        FROM (
          SELECT 
            u.id,
            COALESCE(SUM(o.total_amount), 0) as total_spent
          FROM users u
          LEFT JOIN orders o ON u.id = o.user_id
          WHERE u.role = 'customer' AND u.is_active = true
          GROUP BY u.id
        ) customer_spending
      )
      SELECT * FROM customer_metrics, customer_value
    `);

    // Product Performance Analytics
    const productAnalytics = await query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        COUNT(oi.id) as total_orders,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.quantity * oi.price) as total_revenue,
        AVG(oi.price) as avg_price,
        COUNT(DISTINCT o.user_id) as unique_customers,
        ROUND(AVG(r.rating), 2) as avg_rating,
        COUNT(r.id) as review_count
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      LEFT JOIN order_items oi ON pv.id = oi.variant_id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${period} days' OR o.created_at IS NULL
      GROUP BY p.id, p.name, p.sku
      ORDER BY total_revenue DESC
      LIMIT 20
    `);

    // Geographic Analytics
    const geographicAnalytics = await query(`
      SELECT 
        u.state,
        u.city,
        COUNT(DISTINCT u.id) as customer_count,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT o.id) as unique_orders
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.role = 'customer' AND u.is_active = true
      AND (o.created_at >= CURRENT_DATE - INTERVAL '${period} days' OR o.created_at IS NULL)
      GROUP BY u.state, u.city
      HAVING COUNT(o.id) > 0
      ORDER BY total_revenue DESC
      LIMIT 15
    `);

    // Time-based Analytics
    const timeAnalytics = await query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value,
        COUNT(DISTINCT user_id) as unique_customers
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `);

    // Manufacturing Analytics
    const manufacturingAnalytics = await query(`
      SELECT 
        COUNT(*) as total_batches,
        SUM(quantity_produced) as total_produced,
        AVG(quality_score) as avg_quality_score,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_batches,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_batches,
        COUNT(CASE WHEN quality_score >= 8 THEN 1 END) as high_quality_batches,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600) as avg_production_hours
      FROM manufacturing_batches 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
    `);

    // Subscription Analytics
    const subscriptionAnalytics = await query(`
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_subscriptions,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
        AVG(quantity) as avg_subscription_quantity,
        COUNT(CASE WHEN frequency = 'weekly' THEN 1 END) as weekly_subscriptions,
        COUNT(CASE WHEN frequency = 'monthly' THEN 1 END) as monthly_subscriptions,
        SUM(CASE WHEN status = 'active' THEN quantity * (SELECT price FROM product_variants WHERE id = product_variant_id) ELSE 0 END) as monthly_recurring_revenue
      FROM subscriptions 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
    `);

    res.status(200).json({
      success: true,
      analytics: {
        revenue: revenueAnalytics.rows[0],
        customers: customerAnalytics.rows[0],
        products: productAnalytics.rows,
        geographic: geographicAnalytics.rows,
        timeSeries: timeAnalytics.rows,
        manufacturing: manufacturingAnalytics.rows[0],
        subscriptions: subscriptionAnalytics.rows[0]
      }
    });
  } catch (error) {
    console.error('Get business intelligence error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch business intelligence' });
  }
};

// KPI Dashboard
export const getKPIDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;

    // Key Performance Indicators
    const kpis = await query(`
      WITH revenue_metrics AS (
        SELECT 
          SUM(total_amount) as total_revenue,
          COUNT(*) as total_orders,
          AVG(total_amount) as avg_order_value,
          COUNT(DISTINCT user_id) as unique_customers
        FROM orders 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
      ),
      customer_metrics AS (
        SELECT 
          COUNT(*) as total_customers,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '${period} days' THEN 1 END) as new_customers,
          COUNT(CASE WHEN last_login >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_customers
        FROM users 
        WHERE role = 'customer' AND is_active = true
      ),
      manufacturing_metrics AS (
        SELECT 
          COUNT(*) as batches_produced,
          SUM(quantity_produced) as total_production,
          AVG(quality_score) as avg_quality,
          COUNT(CASE WHEN quality_score >= 8 THEN 1 END) as high_quality_batches
        FROM manufacturing_batches 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
      ),
      subscription_metrics AS (
        SELECT 
          COUNT(*) as total_subscriptions,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
          SUM(CASE WHEN status = 'active' THEN quantity ELSE 0 END) as total_subscription_quantity
        FROM subscriptions 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
      )
      SELECT 
        rm.*,
        cm.*,
        mm.*,
        sm.*,
        ROUND((rm.total_revenue / NULLIF(cm.total_customers, 0)), 2) as revenue_per_customer,
        ROUND((rm.total_orders / NULLIF(cm.total_customers, 0)), 2) as orders_per_customer,
        ROUND((cm.new_customers::DECIMAL / NULLIF(cm.total_customers, 0)) * 100, 2) as customer_growth_rate,
        ROUND((mm.high_quality_batches::DECIMAL / NULLIF(mm.batches_produced, 0)) * 100, 2) as quality_performance_rate
      FROM revenue_metrics rm, customer_metrics cm, manufacturing_metrics mm, subscription_metrics sm
    `);

    // Trend Analysis
    const trends = await query(`
      WITH daily_metrics AS (
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as orders,
          SUM(total_amount) as revenue,
          COUNT(DISTINCT user_id) as customers
        FROM orders 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
        GROUP BY DATE_TRUNC('day', created_at)
      ),
      weekly_metrics AS (
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) as orders,
          SUM(total_amount) as revenue,
          COUNT(DISTINCT user_id) as customers
        FROM orders 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
        GROUP BY DATE_TRUNC('week', created_at)
      )
      SELECT 
        'daily' as period_type,
        json_agg(json_build_object('date', date, 'orders', orders, 'revenue', revenue, 'customers', customers)) as data
      FROM daily_metrics
      UNION ALL
      SELECT 
        'weekly' as period_type,
        json_agg(json_build_object('week', week, 'orders', orders, 'revenue', revenue, 'customers', customers)) as data
      FROM weekly_metrics
    `);

    // Performance Benchmarks
    const benchmarks = await query(`
      SELECT 
        'Revenue Target' as metric,
        100000 as target,
        (SELECT SUM(total_amount) FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days') as actual,
        ROUND(((SELECT SUM(total_amount) FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days') / 100000.0) * 100, 2) as achievement_percentage
      UNION ALL
      SELECT 
        'Order Target' as metric,
        500 as target,
        (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days') as actual,
        ROUND(((SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days') / 500.0) * 100, 2) as achievement_percentage
      UNION ALL
      SELECT 
        'Customer Target' as metric,
        200 as target,
        (SELECT COUNT(*) FROM users WHERE role = 'customer' AND created_at >= CURRENT_DATE - INTERVAL '${period} days') as actual,
        ROUND(((SELECT COUNT(*) FROM users WHERE role = 'customer' AND created_at >= CURRENT_DATE - INTERVAL '${period} days') / 200.0) * 100, 2) as achievement_percentage
      UNION ALL
      SELECT 
        'Quality Target' as metric,
        8.5 as target,
        (SELECT AVG(quality_score) FROM manufacturing_batches WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days') as actual,
        ROUND(((SELECT AVG(quality_score) FROM manufacturing_batches WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days') / 8.5) * 100, 2) as achievement_percentage
    `);

    res.status(200).json({
      success: true,
      kpis: kpis.rows[0],
      trends: trends.rows,
      benchmarks: benchmarks.rows
    });
  } catch (error) {
    console.error('Get KPI dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch KPI dashboard' });
  }
};

// Predictive Analytics
export const getPredictiveAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = '90' } = req.query;

    // Sales Forecasting
    const salesForecast = await query(`
      WITH monthly_sales AS (
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          SUM(total_amount) as revenue,
          COUNT(*) as orders,
          COUNT(DISTINCT user_id) as customers
        FROM orders 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
      ),
      growth_rates AS (
        SELECT 
          AVG(revenue) as avg_revenue,
          AVG(orders) as avg_orders,
          AVG(customers) as avg_customers,
          STDDEV(revenue) as revenue_stddev,
          STDDEV(orders) as orders_stddev,
          STDDEV(customers) as customers_stddev
        FROM monthly_sales
      )
      SELECT 
        ms.*,
        gr.avg_revenue,
        gr.avg_orders,
        gr.avg_customers,
        gr.revenue_stddev,
        gr.orders_stddev,
        gr.customers_stddev,
        CASE 
          WHEN gr.revenue_stddev > 0 THEN ROUND((ms.revenue - gr.avg_revenue) / gr.revenue_stddev, 2)
          ELSE 0 
        END as revenue_z_score
      FROM monthly_sales ms, growth_rates gr
      ORDER BY ms.month
    `);

    // Customer Lifetime Value Prediction
    const customerLTV = await query(`
      WITH customer_metrics AS (
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          COUNT(o.id) as total_orders,
          SUM(o.total_amount) as total_spent,
          AVG(o.total_amount) as avg_order_value,
          MIN(o.created_at) as first_order_date,
          MAX(o.created_at) as last_order_date,
          EXTRACT(DAYS FROM (MAX(o.created_at) - MIN(o.created_at))) as customer_lifespan_days,
          COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscriptions
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE u.role = 'customer' AND u.is_active = true
        GROUP BY u.id, u.first_name, u.last_name, u.email
        HAVING COUNT(o.id) > 0
      )
      SELECT 
        *,
        CASE 
          WHEN customer_lifespan_days > 0 THEN ROUND(total_spent / (customer_lifespan_days / 30.0), 2)
          ELSE 0 
        END as monthly_value,
        CASE 
          WHEN customer_lifespan_days > 0 THEN ROUND((total_spent / (customer_lifespan_days / 30.0)) * 12, 2)
          ELSE 0 
        END as predicted_annual_value,
        CASE 
          WHEN total_orders >= 10 THEN 'High Value'
          WHEN total_orders >= 5 THEN 'Medium Value'
          WHEN total_orders >= 2 THEN 'Low Value'
          ELSE 'New Customer'
        END as customer_segment
      FROM customer_metrics
      ORDER BY total_spent DESC
      LIMIT 50
    `);

    // Inventory Demand Prediction
    const inventoryDemand = await query(`
      WITH product_demand AS (
        SELECT 
          p.id,
          p.name,
          p.sku,
          SUM(oi.quantity) as total_demand,
          COUNT(oi.id) as demand_frequency,
          AVG(oi.quantity) as avg_order_quantity,
          STDDEV(oi.quantity) as quantity_stddev,
          COUNT(DISTINCT DATE_TRUNC('month', o.created_at)) as active_months
        FROM products p
        JOIN product_variants pv ON p.id = pv.product_id
        JOIN order_items oi ON pv.id = oi.variant_id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at >= CURRENT_DATE - INTERVAL '${period} days'
        GROUP BY p.id, p.name, p.sku
      ),
      inventory_levels AS (
        SELECT 
          pv.product_id,
          SUM(iv.current_stock) as total_stock,
          SUM(iv.min_stock_level) as total_min_stock
        FROM product_variants pv
        JOIN inventory_movements iv ON pv.id = iv.variant_id
        GROUP BY pv.product_id
      )
      SELECT 
        pd.*,
        il.total_stock,
        il.total_min_stock,
        CASE 
          WHEN il.total_stock > 0 THEN ROUND((pd.total_demand / il.total_stock) * 100, 2)
          ELSE 0 
        END as stock_turnover_rate,
        CASE 
          WHEN pd.demand_frequency > 0 AND il.total_stock > 0 THEN ROUND(il.total_stock / (pd.demand_frequency / 30.0), 0)
          ELSE 0 
        END as days_of_inventory,
        CASE 
          WHEN il.total_stock <= il.total_min_stock THEN 'Reorder Required'
          WHEN il.total_stock <= il.total_min_stock * 1.5 THEN 'Low Stock'
          WHEN pd.stock_turnover_rate > 200 THEN 'High Demand'
          ELSE 'Normal'
        END as inventory_status
      FROM product_demand pd
      LEFT JOIN inventory_levels il ON pd.id = il.product_id
      ORDER BY pd.total_demand DESC
    `);

    // Seasonal Analysis
    const seasonalAnalysis = await query(`
      SELECT 
        EXTRACT(MONTH FROM created_at) as month,
        EXTRACT(QUARTER FROM created_at) as quarter,
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value,
        COUNT(DISTINCT user_id) as unique_customers,
        ROUND(AVG(total_amount), 2) as monthly_avg_order_value
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '365 days'
      GROUP BY EXTRACT(MONTH FROM created_at), EXTRACT(QUARTER FROM created_at)
      ORDER BY month
    `);

    res.status(200).json({
      success: true,
      analytics: {
        salesForecast: salesForecast.rows,
        customerLTV: customerLTV.rows,
        inventoryDemand: inventoryDemand.rows,
        seasonalAnalysis: seasonalAnalysis.rows
      }
    });
  } catch (error) {
    console.error('Get predictive analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch predictive analytics' });
  }
};

// Custom Analytics Queries
export const getCustomAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { query_type, parameters } = req.body;

    let result;
    switch (query_type) {
      case 'customer_cohort_analysis':
        result = await query(`
          WITH customer_cohorts AS (
            SELECT 
              DATE_TRUNC('month', u.created_at) as cohort_month,
              u.id as customer_id,
              MIN(o.created_at) as first_order_date,
              COUNT(o.id) as total_orders,
              SUM(o.total_amount) as total_spent
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            WHERE u.role = 'customer' AND u.is_active = true
            GROUP BY DATE_TRUNC('month', u.created_at), u.id
          )
          SELECT 
            cohort_month,
            COUNT(*) as cohort_size,
            COUNT(CASE WHEN total_orders > 0 THEN 1 END) as customers_with_orders,
            ROUND(AVG(total_orders), 2) as avg_orders_per_customer,
            ROUND(AVG(total_spent), 2) as avg_spent_per_customer,
            ROUND((COUNT(CASE WHEN total_orders > 0 THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2) as conversion_rate
          FROM customer_cohorts
          GROUP BY cohort_month
          ORDER BY cohort_month
        `);
        break;

      case 'product_correlation':
        result = await query(`
          WITH product_pairs AS (
            SELECT 
              oi1.variant_id as product1,
              oi2.variant_id as product2,
              COUNT(*) as co_occurrence
            FROM order_items oi1
            JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.variant_id < oi2.variant_id
            JOIN orders o ON oi1.order_id = o.id
            WHERE o.created_at >= CURRENT_DATE - INTERVAL '${parameters?.period || '90'} days'
            GROUP BY oi1.variant_id, oi2.variant_id
            HAVING COUNT(*) >= ${parameters?.min_co_occurrence || '5'}
          )
          SELECT 
            p1.name as product1_name,
            p2.name as product2_name,
            pp.co_occurrence,
            ROUND((pp.co_occurrence::DECIMAL / (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '${parameters?.period || '90'} days')) * 100, 2) as correlation_percentage
          FROM product_pairs pp
          JOIN product_variants pv1 ON pp.product1 = pv1.id
          JOIN product_variants pv2 ON pp.product2 = pv2.id
          JOIN products p1 ON pv1.product_id = p1.id
          JOIN products p2 ON pv2.product_id = p2.id
          ORDER BY pp.co_occurrence DESC
          LIMIT 20
        `);
        break;

      case 'customer_retention':
        result = await query(`
          WITH customer_periods AS (
            SELECT 
              user_id,
              DATE_TRUNC('month', created_at) as order_month,
              COUNT(*) as orders_in_month,
              SUM(total_amount) as spent_in_month
            FROM orders
            WHERE created_at >= CURRENT_DATE - INTERVAL '${parameters?.period || '12'} months'
            GROUP BY user_id, DATE_TRUNC('month', created_at)
          ),
          retention_analysis AS (
            SELECT 
              order_month,
              COUNT(DISTINCT user_id) as active_customers,
              COUNT(DISTINCT CASE WHEN orders_in_month > 1 THEN user_id END) as repeat_customers,
              ROUND(AVG(orders_in_month), 2) as avg_orders_per_customer,
              ROUND(AVG(spent_in_month), 2) as avg_spent_per_customer
            FROM customer_periods
            GROUP BY order_month
          )
          SELECT 
            *,
            ROUND((repeat_customers::DECIMAL / active_customers) * 100, 2) as retention_rate
          FROM retention_analysis
          ORDER BY order_month
        `);
        break;

      default:
        res.status(400).json({ success: false, message: 'Invalid query type' });
        return;
    }

    res.status(200).json({
      success: true,
      data: result.rows,
      queryType: query_type,
      parameters: parameters
    });
  } catch (error) {
    console.error('Get custom analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch custom analytics' });
  }
};

// Export Analytics Data
export const exportAnalyticsData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data_type, format = 'json', period = '30' } = req.query;

    let result;
    let filename;

    switch (data_type) {
      case 'orders':
        result = await query(`
          SELECT 
            o.*,
            u.first_name,
            u.last_name,
            u.email,
            u.phone,
            COUNT(oi.id) as item_count,
            STRING_AGG(p.name, ', ') as products
          FROM orders o
          JOIN users u ON o.user_id = u.id
          LEFT JOIN order_items oi ON o.id = oi.order_id
          LEFT JOIN product_variants pv ON oi.variant_id = pv.id
          LEFT JOIN products p ON pv.product_id = p.id
          WHERE o.created_at >= CURRENT_DATE - INTERVAL '${period} days'
          GROUP BY o.id, u.first_name, u.last_name, u.email, u.phone
          ORDER BY o.created_at DESC
        `);
        filename = `orders_export_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'customers':
        result = await query(`
          SELECT 
            u.*,
            COUNT(o.id) as total_orders,
            SUM(o.total_amount) as total_spent,
            AVG(o.total_amount) as avg_order_value,
            MAX(o.created_at) as last_order_date,
            COUNT(s.id) as total_subscriptions,
            COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscriptions
          FROM users u
          LEFT JOIN orders o ON u.id = o.user_id
          LEFT JOIN subscriptions s ON u.id = s.user_id
          WHERE u.role = 'customer' AND u.is_active = true
          GROUP BY u.id
          ORDER BY total_spent DESC
        `);
        filename = `customers_export_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'products':
        result = await query(`
          SELECT 
            p.*,
            COUNT(oi.id) as total_orders,
            SUM(oi.quantity) as total_quantity_sold,
            SUM(oi.quantity * oi.price) as total_revenue,
            AVG(oi.price) as avg_selling_price,
            COUNT(DISTINCT o.user_id) as unique_customers,
            ROUND(AVG(r.rating), 2) as avg_rating,
            COUNT(r.id) as review_count
          FROM products p
          LEFT JOIN product_variants pv ON p.id = pv.product_id
          LEFT JOIN order_items oi ON pv.id = oi.variant_id
          LEFT JOIN orders o ON oi.order_id = o.id
          LEFT JOIN reviews r ON p.id = r.product_id
          GROUP BY p.id
          ORDER BY total_revenue DESC
        `);
        filename = `products_export_${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        res.status(400).json({ success: false, message: 'Invalid data type' });
        return;
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(result.rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvData);
    } else {
      res.status(200).json({
        success: true,
        data: result.rows,
        filename: filename,
        recordCount: result.rows.length
      });
    }
  } catch (error) {
    console.error('Export analytics data error:', error);
    res.status(500).json({ success: false, message: 'Failed to export analytics data' });
  }
};

// Helper function to convert data to CSV
const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
};





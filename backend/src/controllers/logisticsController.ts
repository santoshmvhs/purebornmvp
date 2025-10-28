import { Request, Response } from 'express';
import { query } from '../config/database';
import axios from 'axios';

// Shiprocket Integration Service
class ShiprocketService {
  private apiUrl = 'https://apiv2.shiprocket.in/v1/external';
  private token: string | null = null;

  async authenticate(): Promise<string> {
    try {
      const response = await axios.post(`${this.apiUrl}/auth/login`, {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD
      });
      
      this.token = response.data.token;
      return this.token || '';
    } catch (error) {
      console.error('Shiprocket authentication failed:', error);
      throw new Error('Failed to authenticate with Shiprocket');
    }
  }

  async createShipment(shipmentData: any): Promise<any> {
    if (!this.token) {
      await this.authenticate();
    }

    try {
      const response = await axios.post(`${this.apiUrl}/orders/create/adhoc`, shipmentData, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Shiprocket shipment creation failed:', error);
      throw new Error('Failed to create shipment');
    }
  }

  async trackShipment(awb: string): Promise<any> {
    if (!this.token) {
      await this.authenticate();
    }

    try {
      const response = await axios.get(`${this.apiUrl}/courier/track/awb/${awb}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Shiprocket tracking failed:', error);
      throw new Error('Failed to track shipment');
    }
  }

  async getShippingRates(pickupPincode: string, deliveryPincode: string, weight: number): Promise<any> {
    if (!this.token) {
      await this.authenticate();
    }

    try {
      const response = await axios.get(`${this.apiUrl}/courier/serviceability/rates`, {
        params: {
          pickup_pincode: pickupPincode,
          delivery_pincode: deliveryPincode,
          weight: weight
        },
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Shiprocket rates failed:', error);
      throw new Error('Failed to get shipping rates');
    }
  }
}

const shiprocketService = new ShiprocketService();

// Shipping Providers Controller
export const getShippingProviders = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'SELECT * FROM shipping_providers WHERE is_active = true ORDER BY priority ASC'
    );

    res.status(200).json({
      success: true,
      providers: result.rows
    });
  } catch (error) {
    console.error('Get shipping providers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shipping providers' });
  }
};

export const createShippingProvider = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code, api_endpoint, api_key, priority } = req.body;

    const result = await query(
      `INSERT INTO shipping_providers (name, code, api_endpoint, api_key, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, code, api_endpoint, api_key, priority]
    );

    res.status(201).json({
      success: true,
      message: 'Shipping provider created successfully',
      provider: result.rows[0]
    });
  } catch (error) {
    console.error('Create shipping provider error:', error);
    res.status(500).json({ success: false, message: 'Failed to create shipping provider' });
  }
};

// Shipping Zones Controller
export const getShippingZones = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'SELECT * FROM shipping_zones WHERE is_active = true ORDER BY name ASC'
    );

    res.status(200).json({
      success: true,
      zones: result.rows
    });
  } catch (error) {
    console.error('Get shipping zones error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shipping zones' });
  }
};

export const createShippingZone = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, countries, states, cities, pincodes } = req.body;

    const result = await query(
      `INSERT INTO shipping_zones (name, countries, states, cities, pincodes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, countries, states, cities, pincodes]
    );

    res.status(201).json({
      success: true,
      message: 'Shipping zone created successfully',
      zone: result.rows[0]
    });
  } catch (error) {
    console.error('Create shipping zone error:', error);
    res.status(500).json({ success: false, message: 'Failed to create shipping zone' });
  }
};

// Shipping Rates Controller
export const getShippingRates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { zone_id, weight, amount } = req.query;

    let queryStr = `
      SELECT 
        sr.*,
        sp.name as provider_name,
        sp.code as provider_code,
        sz.name as zone_name
      FROM shipping_rates sr
      LEFT JOIN shipping_providers sp ON sr.shipping_provider_id = sp.id
      LEFT JOIN shipping_zones sz ON sr.shipping_zone_id = sz.id
      WHERE sr.is_active = true
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (zone_id) {
      paramCount++;
      queryStr += ` AND sr.shipping_zone_id = $${paramCount}`;
      params.push(zone_id);
    }

    if (weight) {
      paramCount++;
      queryStr += ` AND sr.min_weight <= $${paramCount} AND sr.max_weight >= $${paramCount}`;
      params.push(weight);
    }

    if (amount) {
      paramCount++;
      queryStr += ` AND sr.min_amount <= $${paramCount} AND sr.max_amount >= $${paramCount}`;
      params.push(amount);
    }

    queryStr += ' ORDER BY sr.rate ASC';

    const result = await query(queryStr, params);

    res.status(200).json({
      success: true,
      rates: result.rows
    });
  } catch (error) {
    console.error('Get shipping rates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shipping rates' });
  }
};

export const calculateShippingCost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pickup_pincode, delivery_pincode, weight, amount } = req.body;

    // First try to get rates from our database
    const dbRates = await query(`
      SELECT 
        sr.*,
        sp.name as provider_name,
        sp.code as provider_code
      FROM shipping_rates sr
      LEFT JOIN shipping_providers sp ON sr.shipping_provider_id = sp.id
      LEFT JOIN shipping_zones sz ON sr.shipping_zone_id = sz.id
      WHERE sr.is_active = true
      AND ($1 = ANY(sz.pincodes) OR $2 = ANY(sz.pincodes))
      AND sr.min_weight <= $3 AND sr.max_weight >= $3
      AND sr.min_amount <= $4 AND sr.max_amount >= $4
      ORDER BY sr.rate ASC
    `, [pickup_pincode, delivery_pincode, weight, amount]);

    if (dbRates.rows.length > 0) {
      res.status(200).json({
        success: true,
        rates: dbRates.rows,
        source: 'database'
      });
      return;
    }

    // If no rates in database, try Shiprocket
    try {
      const shiprocketRates = await shiprocketService.getShippingRates(
        pickup_pincode,
        delivery_pincode,
        weight
      );

      res.status(200).json({
        success: true,
        rates: shiprocketRates.data,
        source: 'shiprocket'
      });
    } catch (shiprocketError) {
      res.status(200).json({
        success: true,
        rates: [],
        message: 'No shipping rates available',
        source: 'none'
      });
    }
  } catch (error) {
    console.error('Calculate shipping cost error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate shipping cost' });
  }
};

// Shipments Controller
export const createShipment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { order_id, shipping_provider_id, weight, dimensions, special_instructions } = req.body;

    // Get order details
    const orderResult = await query(`
      SELECT 
        o.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [order_id]);

    if (orderResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const order = orderResult.rows[0];

    // Get shipping provider details
    const providerResult = await query(
      'SELECT * FROM shipping_providers WHERE id = $1',
      [shipping_provider_id]
    );

    if (providerResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Shipping provider not found' });
      return;
    }

    const provider = providerResult.rows[0];

    // Generate tracking number
    const trackingNumber = 'SR' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

    // Create shipment in database
    const shipmentResult = await query(
      `INSERT INTO shipments (order_id, shipping_provider_id, tracking_number, weight, dimensions, shipping_address, special_instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [order_id, shipping_provider_id, trackingNumber, weight, dimensions, order.shipping_address, special_instructions]
    );

    const shipment = shipmentResult.rows[0];

    // If Shiprocket provider, create shipment there too
    if (provider.code === 'SHIPROCKET') {
      try {
        const shiprocketData = {
          order_id: order.order_number,
          pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION,
          delivery_name: `${order.first_name} ${order.last_name}`,
          delivery_address: order.shipping_address.address_line_1,
          delivery_address_2: order.shipping_address.address_line_2 || '',
          delivery_city: order.shipping_address.city,
          delivery_state: order.shipping_address.state,
          delivery_pincode: order.shipping_address.pincode,
          delivery_country: order.shipping_address.country || 'India',
          delivery_phone: order.phone,
          delivery_email: order.email,
          weight: weight,
          length: dimensions?.length || 10,
          width: dimensions?.width || 10,
          height: dimensions?.height || 10,
          cod_amount: order.payment_method === 'cod' ? order.total_amount : 0,
          order_date: order.created_at
        };

        const shiprocketResponse = await shiprocketService.createShipment(shiprocketData);
        
        // Update shipment with Shiprocket details
        await query(
          'UPDATE shipments SET awb_number = $1, status = $2 WHERE id = $3',
          [shiprocketResponse.awb_code, 'picked_up', shipment.id]
        );

        // Add tracking entry
        await query(
          `INSERT INTO shipment_tracking (shipment_id, status, location, description, timestamp)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [shipment.id, 'picked_up', 'Origin', 'Shipment picked up from origin', new Date()]
        );
      } catch (shiprocketError) {
        console.error('Shiprocket shipment creation failed:', shiprocketError);
        // Continue with local shipment creation even if Shiprocket fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      shipment: shipment
    });
  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({ success: false, message: 'Failed to create shipment' });
  }
};

export const getShipments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, provider_id, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND s.status = $${paramCount}`;
      params.push(status);
    }

    if (provider_id) {
      paramCount++;
      whereClause += ` AND s.shipping_provider_id = $${paramCount}`;
      params.push(provider_id);
    }

    params.push(Number(limit), offset);

    const result = await query(`
      SELECT 
        s.*,
        o.order_number,
        o.total_amount,
        u.first_name,
        u.last_name,
        u.email,
        sp.name as provider_name,
        sp.code as provider_code
      FROM shipments s
      LEFT JOIN orders o ON s.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN shipping_providers sp ON s.shipping_provider_id = sp.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countResult = await query(`
      SELECT COUNT(*) as total FROM shipments s ${whereClause}
    `, params.slice(0, -2));

    res.status(200).json({
      success: true,
      shipments: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shipments' });
  }
};

export const trackShipment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trackingNumber } = req.params;

    const shipmentResult = await query(`
      SELECT 
        s.*,
        o.order_number,
        u.first_name,
        u.last_name,
        sp.name as provider_name,
        sp.code as provider_code
      FROM shipments s
      LEFT JOIN orders o ON s.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN shipping_providers sp ON s.shipping_provider_id = sp.id
      WHERE s.tracking_number = $1 OR s.awb_number = $1
    `, [trackingNumber]);

    if (shipmentResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Shipment not found' });
      return;
    }

    const shipment = shipmentResult.rows[0];

    // Get tracking history from database
    const trackingResult = await query(
      `SELECT * FROM shipment_tracking 
       WHERE shipment_id = $1 
       ORDER BY timestamp DESC`,
      [shipment.id]
    );

    // If Shiprocket shipment, get real-time tracking
    let realtimeTracking = null;
    if (shipment.provider_code === 'SHIPROCKET' && shipment.awb_number) {
      try {
        realtimeTracking = await shiprocketService.trackShipment(shipment.awb_number);
      } catch (error) {
        console.error('Real-time tracking failed:', error);
      }
    }

    res.status(200).json({
      success: true,
      shipment: shipment,
      tracking: trackingResult.rows,
      realtimeTracking: realtimeTracking
    });
  } catch (error) {
    console.error('Track shipment error:', error);
    res.status(500).json({ success: false, message: 'Failed to track shipment' });
  }
};

export const updateShipmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shipmentId } = req.params;
    const { status, location, description } = req.body;

    // Update shipment status
    await query(
      'UPDATE shipments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, shipmentId]
    );

    // Add tracking entry
    await query(
      `INSERT INTO shipment_tracking (shipment_id, status, location, description, timestamp)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [shipmentId, status, location, description]
    );

    res.status(200).json({
      success: true,
      message: 'Shipment status updated successfully'
    });
  } catch (error) {
    console.error('Update shipment status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update shipment status' });
  }
};

// Logistics Analytics Controller
export const getLogisticsAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;

    // Shipment statistics
    const shipmentStats = await query(`
      SELECT 
        COUNT(*) as total_shipments,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_shipments,
        COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit_shipments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_shipments,
        AVG(CASE WHEN delivery_date IS NOT NULL AND pickup_date IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (delivery_date - pickup_date))/86400 END) as avg_delivery_days
      FROM shipments 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
    `);

    // Provider performance
    const providerPerformance = await query(`
      SELECT 
        sp.name as provider_name,
        COUNT(s.id) as total_shipments,
        COUNT(CASE WHEN s.status = 'delivered' THEN 1 END) as delivered_count,
        ROUND(COUNT(CASE WHEN s.status = 'delivered' THEN 1 END) * 100.0 / COUNT(s.id), 2) as success_rate,
        AVG(s.shipping_cost) as avg_cost
      FROM shipments s
      LEFT JOIN shipping_providers sp ON s.shipping_provider_id = sp.id
      WHERE s.created_at >= CURRENT_DATE - INTERVAL '${period} days'
      GROUP BY sp.id, sp.name
      ORDER BY total_shipments DESC
    `);

    // Daily shipment trends
    const dailyTrends = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as shipments_count,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count
      FROM shipments 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.status(200).json({
      success: true,
      analytics: {
        shipmentStats: shipmentStats.rows[0],
        providerPerformance: providerPerformance.rows,
        dailyTrends: dailyTrends.rows
      }
    });
  } catch (error) {
    console.error('Get logistics analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logistics analytics' });
  }
};

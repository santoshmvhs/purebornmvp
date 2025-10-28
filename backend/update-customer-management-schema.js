const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pureborn',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function updateCustomerManagementSchema() {
  try {
    console.log('🚀 Starting Customer Management Schema Update...');
    
    // Read the customer management schema file
    const schemaPath = path.join(__dirname, 'customer_management_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schemaSQL);
    
    console.log('✅ Customer management schema updated successfully!');
    console.log('👥 Created tables:');
    console.log('   - customer_segment_members');
    console.log('   - customer_communications');
    console.log('   - customer_notes');
    console.log('   - customer_tags');
    console.log('   - customer_tag_assignments');
    console.log('   - customer_activity_log');
    console.log('   - customer_preferences');
    console.log('   - customer_support_tickets');
    console.log('   - customer_support_messages');
    console.log('   - customer_feedback');
    console.log('   - customer_loyalty_tiers');
    console.log('   - customer_tier_assignments');
    console.log('📊 Created analytics views');
    console.log('🔍 Created performance indexes');
    console.log('🏷️ Inserted sample tags and tiers');
    
  } catch (error) {
    console.error('❌ Error updating customer management schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the update
updateCustomerManagementSchema();





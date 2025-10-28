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

async function updateMarketingSchema() {
  try {
    console.log('🚀 Starting Marketing Schema Update...');
    
    // Read the marketing schema file
    const schemaPath = path.join(__dirname, 'marketing_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schemaSQL);
    
    console.log('✅ Marketing schema updated successfully!');
    console.log('📊 Created tables:');
    console.log('   - email_campaigns');
    console.log('   - sms_campaigns');
    console.log('   - promotional_codes');
    console.log('   - customer_segments');
    console.log('   - loyalty_programs');
    console.log('   - customer_points');
    console.log('   - points_transactions');
    console.log('   - email_campaign_recipients');
    console.log('   - sms_campaign_recipients');
    console.log('   - promotional_code_usage');
    console.log('📈 Created analytics views');
    console.log('🔍 Created performance indexes');
    console.log('🎯 Inserted sample data');
    
  } catch (error) {
    console.error('❌ Error updating marketing schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the update
updateMarketingSchema();






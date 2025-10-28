const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function createAdminUser() {
  console.log('🔐 Creating admin user...');
  
  try {
    // Check if admin user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@pureborn.com']
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ Admin user already exists');
      
      // Update the password to make sure it's correct
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'UPDATE users SET password_hash = $1, role = $2, is_active = $3 WHERE email = $4',
        [hashedPassword, 'admin', true, 'admin@pureborn.com']
      );
      console.log('✅ Admin password updated');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, email, first_name, last_name, role`,
        ['admin@pureborn.com', hashedPassword, 'Admin', 'User', 'admin', true, true]
      );
      console.log('✅ Admin user created:', result.rows[0]);
    }

    // Verify the user was created/updated correctly
    const verifyUser = await pool.query(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE email = $1',
      ['admin@pureborn.com']
    );
    
    if (verifyUser.rows.length > 0) {
      console.log('✅ Admin user verified:', verifyUser.rows[0]);
      console.log('\n🔑 Admin Login Credentials:');
      console.log('Email: admin@pureborn.com');
      console.log('Password: admin123');
    } else {
      console.log('❌ Failed to create admin user');
    }

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser();





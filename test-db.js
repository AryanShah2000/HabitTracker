const { neon } = require('@neondatabase/serverless');

async function testConnection() {
  try {
    // Use the same connection string from .env
    const sql = neon('postgresql://neondb_owner:npg_QfWsO8GqM0cR@ep-sweet-bar-adzw9jvj-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');
    
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful:', result);
    
    // Test table exists
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'activities'
    `;
    console.log('✅ Activities table exists:', tableCheck.length > 0);
    
    // Test inserting a sample record
    const insertTest = await sql`
      INSERT INTO activities (date, water, protein, exercise)
      VALUES ('2024-09-14', 1, 0, 0)
      ON CONFLICT (date) DO UPDATE SET water = activities.water + 1
      RETURNING *
    `;
    console.log('✅ Insert test successful:', insertTest);
    
    // Test reading records
    const selectTest = await sql`
      SELECT * FROM activities ORDER BY date DESC LIMIT 5
    `;
    console.log('✅ Select test successful:', selectTest);
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testConnection();
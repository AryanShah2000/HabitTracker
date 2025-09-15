const { neon } = require('@neondatabase/serverless');

// Database migration script to add description columns
async function migrateDatabase() {
  // Use the DATABASE_URL from your .env.local or environment
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_QfWsO8GqM0cR@ep-sweet-bar-adzw9jvj-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
  const sql = neon(databaseUrl);
  
  try {
    console.log('Adding description columns to activities table...');
    
    // Add description columns if they don't exist
    await sql`
      ALTER TABLE activities 
      ADD COLUMN IF NOT EXISTS water_desc TEXT,
      ADD COLUMN IF NOT EXISTS protein_desc TEXT,
      ADD COLUMN IF NOT EXISTS exercise_desc TEXT
    `;
    
    console.log('✅ Database migration completed successfully!');
    console.log('Added columns:');
    console.log('- water_desc: Text description for water activities');
    console.log('- protein_desc: Text description for protein activities');
    console.log('- exercise_desc: Text description for exercise activities');
    
  } catch (error) {
    console.error('❌ Error migrating database:', error);
  }
}

migrateDatabase();
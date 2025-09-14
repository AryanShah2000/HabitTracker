const { neon } = require('@neondatabase/serverless');

// Database setup script
async function setupDatabase() {
  // Use the DATABASE_URL from your .env.local
  const sql = neon('postgresql://neondb_owner:npg_QfWsO8GqM0cR@ep-sweet-bar-adzw9jvj-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');
  
  try {
    console.log('Creating activities table...');
    
    // Create the activities table
    await sql`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        water INTEGER DEFAULT 0,
        protein INTEGER DEFAULT 0,
        exercise INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create an index for faster date lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date)
    `;
    
    console.log('✅ Database table created successfully!');
    console.log('Table structure:');
    console.log('- id: Auto-incrementing primary key');
    console.log('- date: Date for the activity record');
    console.log('- water: Water intake count (0-8)');
    console.log('- protein: Protein intake count (0-3)');
    console.log('- exercise: Exercise count (0-1)');
    console.log('- created_at: Timestamp when record was created');
    console.log('- updated_at: Timestamp when record was last updated');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
  }
}

setupDatabase();
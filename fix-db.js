const { neon } = require('@neondatabase/serverless');

async function fixDatabase() {
  try {
    const sql = neon('postgresql://neondb_owner:npg_QfWsO8GqM0cR@ep-sweet-bar-adzw9jvj-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');
    
    console.log('Adding unique constraint to date column...');
    
    // Add unique constraint to date column
    await sql`
      ALTER TABLE activities 
      ADD CONSTRAINT activities_date_unique UNIQUE (date)
    `;
    
    console.log('✅ Unique constraint added successfully!');
    
    // Test the constraint
    const testInsert = await sql`
      INSERT INTO activities (date, water, protein, exercise)
      VALUES ('2024-09-14', 2, 1, 0)
      ON CONFLICT (date) DO UPDATE SET 
        water = EXCLUDED.water,
        protein = EXCLUDED.protein,
        exercise = EXCLUDED.exercise,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    console.log('✅ Insert with conflict resolution works:', testInsert);
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
  }
}

fixDatabase();
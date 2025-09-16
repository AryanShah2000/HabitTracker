const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key] = value;
    }
  });
}

const sql = neon(process.env.DATABASE_URL);

async function setupMultiUserDatabase() {
  try {
    console.log('Setting up multi-user database schema...');

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Users table created');

    // Create activity_logs table for individual activity entries with descriptions
    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        goal VARCHAR(20) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Activity logs table created');

    // Check if user_id column exists in activities table
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activities' AND column_name = 'user_id'
    `;

    if (columnExists.length === 0) {
      // Add user_id column to activities table
      await sql`
        ALTER TABLE activities 
        ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      `;
      console.log('✅ Added user_id column to activities table');

      // Update the unique constraint to include user_id
      await sql`
        DROP INDEX IF EXISTS activities_date_key
      `;
      
      await sql`
        CREATE UNIQUE INDEX activities_user_date_unique 
        ON activities(user_id, date)
      `;
      console.log('✅ Updated unique constraint for user-specific activities');
    } else {
      console.log('✅ Activities table already has user_id column');
    }

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_activities_user_date 
      ON activities(user_id, date)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date 
      ON activity_logs(user_id, date)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_username 
      ON users(username)
    `;
    
    console.log('✅ Database indexes created');
    console.log('🎉 Multi-user database setup complete!');

  } catch (error) {
    console.error('❌ Database setup error:', error);
    throw error;
  }
}

// Run the setup
setupMultiUserDatabase()
  .then(() => {
    console.log('Database setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });
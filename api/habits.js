const { neon } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');

// Initialize database connection
const sql = neon(process.env.DATABASE_URL);
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Helper function to verify JWT token
function verifyToken(authHeader) {
  if (!authHeader) {
    throw new Error('No token provided');
  }

  const token = authHeader.split(' ')[1]; // Remove 'Bearer ' prefix
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify authentication for all requests
    const decoded = verifyToken(req.headers.authorization);
    const userId = decoded.userId;
    
    console.log(`API ${req.method} request for user ${userId}:`, req.body);

    if (req.method === 'GET') {
      // Get all activities for the authenticated user and transform to frontend format
      const dbActivities = await sql`
        SELECT id, date, water, protein, exercise, 
               created_at as timestamp
        FROM activities 
        WHERE user_id = ${userId}
        ORDER BY date DESC
      `;
      
      // Transform database format to frontend format (consolidated entries)
      const activities = [];
      dbActivities.forEach(row => {
        const dateStr = row.date.toISOString().split('T')[0];
        
        // Add water activity (if any)
        if (row.water > 0) {
          activities.push({
            id: `${row.id}-water`,
            goal: 'water',
            date: dateStr,
            amount: row.water,
            timestamp: row.timestamp
          });
        }
        
        // Add protein activity (if any) 
        if (row.protein > 0) {
          activities.push({
            id: `${row.id}-protein`,
            goal: 'protein',
            date: dateStr,
            amount: row.protein,
            timestamp: row.timestamp
          });
        }
        
        // Add exercise activity (if any)
        if (row.exercise > 0) {
          activities.push({
            id: `${row.id}-exercise`,
            goal: 'exercise',
            date: dateStr,
            amount: row.exercise,
            timestamp: row.timestamp
          });
        }
      });
      
      console.log('Returning activities from database:', activities.length);
      res.status(200).json({ success: true, activities });
      
    } else if (req.method === 'POST') {
      // Add new activity from frontend format
      const { activity } = req.body;
      
      if (!activity) {
        return res.status(400).json({ success: false, error: 'Activity data required' });
      }
      
      const { date, goal, amount = 1, description = null } = activity;
      
      if (!date || !goal) {
        return res.status(400).json({ success: false, error: 'Date and goal are required' });
      }
      
      // Get current values for this date and user
      const current = await sql`
        SELECT water, protein, exercise FROM activities 
        WHERE date = ${date} AND user_id = ${userId}
      `;
      
      let water = 0, protein = 0, exercise = 0;
      
      if (current.length > 0) {
        water = current[0].water;
        protein = current[0].protein;
        exercise = current[0].exercise;
      }
      
      // Update the appropriate goal
      if (goal === 'water') water += amount;
      else if (goal === 'protein') protein += amount;
      else if (goal === 'exercise') exercise += amount;
      
      // Use UPSERT to save to database
      const result = await sql`
        INSERT INTO activities (user_id, date, water, protein, exercise)
        VALUES (${userId}, ${date}, ${water}, ${protein}, ${exercise})
        ON CONFLICT (user_id, date) DO UPDATE SET 
          water = EXCLUDED.water,
          protein = EXCLUDED.protein,
          exercise = EXCLUDED.exercise,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, date, water, protein, exercise, created_at as timestamp
      `;
      
      // If there's a description, save it as an individual activity log
      if (description) {
        await sql`
          INSERT INTO activity_logs (user_id, date, goal, amount, description, created_at)
          VALUES (${userId}, ${date}, ${goal}, ${amount}, ${description}, CURRENT_TIMESTAMP)
        `;
      }
      
      // Return the activity in frontend format
      const savedActivity = {
        id: `${result[0].id}-${goal}`,
        goal,
        date,
        amount,
        timestamp: result[0].timestamp
      };
      
      console.log('Saved activity:', savedActivity);
      res.status(200).json({ success: true, activity: savedActivity });
      
    } else if (req.method === 'PUT') {
      // Update existing activity
      const { id, activity } = req.body;
      
      if (!id || !activity) {
        return res.status(400).json({ success: false, error: 'Activity ID and data required' });
      }
      
      const { water = 0, protein = 0, exercise = 0 } = activity;
      
      const result = await sql`
        UPDATE activities 
        SET water = ${water}, protein = ${protein}, exercise = ${exercise},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id, date, water, protein, exercise, created_at as timestamp
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ success: false, error: 'Activity not found' });
      }
      
      res.status(200).json({ success: true, activity: result[0] });
      
    } else if (req.method === 'DELETE') {
      // Delete activity (decrement goal counter)
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Activity ID required' });
      }
      
      // Parse the frontend ID format: "dbId-goal"
      const parts = id.split('-');
      if (parts.length < 2) {
        return res.status(400).json({ success: false, error: 'Invalid activity ID format' });
      }
      
      const dbId = parts[0];
      const goal = parts[1];
      
      // Get current values for this record
      const current = await sql`
        SELECT date, water, protein, exercise FROM activities WHERE id = ${dbId}
      `;
      
      if (current.length === 0) {
        return res.status(404).json({ success: false, error: 'Activity not found' });
      }
      
      let { water, protein, exercise } = current[0];
      
      // Reset the appropriate goal to 0 (since we're deleting the entire entry)
      if (goal === 'water') water = 0;
      else if (goal === 'protein') protein = 0;
      else if (goal === 'exercise') exercise = 0;
      else {
        return res.status(400).json({ success: false, error: 'Invalid goal type' });
      }
      
      // Update the database
      const result = await sql`
        UPDATE activities 
        SET water = ${water}, protein = ${protein}, exercise = ${exercise},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${dbId}
        RETURNING id
      `;
      
      res.status(200).json({ success: true });
      
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('API Error:', error);
    
    // Handle authentication errors
    if (error.message.includes('token') || error.message.includes('No token provided')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
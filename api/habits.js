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
      // Get all activities for the authenticated user from activity_logs table
      const dbActivities = await sql`
        SELECT id, date, goal, amount, description, created_at as timestamp
        FROM activity_logs 
        WHERE user_id = ${userId}
        ORDER BY date DESC, created_at DESC
      `;
      
      // Transform database format to frontend format
      const activities = dbActivities.map(row => ({
        id: row.id.toString(),
        goal: row.goal,
        date: row.date.toISOString().split('T')[0],
        amount: parseFloat(row.amount),
        description: row.description || '',
        timestamp: row.timestamp
      }));
      
      console.log(`Returning ${activities.length} activities from database for user ${userId}`);
      res.status(200).json({ success: true, activities });
      
    } else if (req.method === 'POST') {
      // Add new activity to activity_logs table
      const { activity } = req.body;
      
      if (!activity) {
        return res.status(400).json({ success: false, error: 'Activity data required' });
      }
      
      const { date, goal, amount = 1, description = null } = activity;
      
      if (!date || !goal) {
        return res.status(400).json({ success: false, error: 'Date and goal are required' });
      }
      
      // Insert into activity_logs table
      const result = await sql`
        INSERT INTO activity_logs (user_id, date, goal, amount, description, created_at)
        VALUES (${userId}, ${date}, ${goal}, ${amount}, ${description}, CURRENT_TIMESTAMP)
        RETURNING id, date, goal, amount, description, created_at as timestamp
      `;
      
      // Return the activity in frontend format
      const savedActivity = {
        id: result[0].id.toString(),
        goal: result[0].goal,
        date: result[0].date.toISOString().split('T')[0],
        amount: parseFloat(result[0].amount),
        description: result[0].description || '',
        timestamp: result[0].timestamp
      };
      
      console.log('Saved activity to activity_logs:', savedActivity);
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
      // Delete activity from activity_logs table
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Activity ID required' });
      }
      
      // Delete the specific activity log entry
      const result = await sql`
        DELETE FROM activity_logs 
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ success: false, error: 'Activity not found' });
      }
      
      console.log(`Deleted activity ${id} for user ${userId}`);
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
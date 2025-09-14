const { neon } = require('@neondatabase/serverless');

// Initialize database connection
const sql = neon(process.env.DATABASE_URL);

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log(`API ${req.method} request:`, req.body);

    if (req.method === 'GET') {
      // Get all activities
      const activities = await sql`
        SELECT id, date, water, protein, exercise, 
               created_at as timestamp
        FROM activities 
        ORDER BY date DESC
      `;
      
      console.log('Returning activities from database:', activities.length);
      res.status(200).json({ success: true, activities });
      
    } else if (req.method === 'POST') {
      // Add new activity
      const { activity } = req.body;
      
      if (!activity) {
        return res.status(400).json({ success: false, error: 'Activity data required' });
      }
      
      const { date, water = 0, protein = 0, exercise = 0 } = activity;
      
      if (!date) {
        return res.status(400).json({ success: false, error: 'Date is required' });
      }
      
      // Use UPSERT (INSERT ... ON CONFLICT) to handle existing records
      const result = await sql`
        INSERT INTO activities (date, water, protein, exercise)
        VALUES (${date}, ${water}, ${protein}, ${exercise})
        ON CONFLICT (date) DO UPDATE SET 
          water = EXCLUDED.water,
          protein = EXCLUDED.protein,
          exercise = EXCLUDED.exercise,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, date, water, protein, exercise, created_at as timestamp
      `;
      
      console.log('Saved activity:', result[0]);
      res.status(200).json({ success: true, activity: result[0] });
      
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
      // Delete activity
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Activity ID required' });
      }
      
      const result = await sql`
        DELETE FROM activities WHERE id = ${id}
        RETURNING id
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ success: false, error: 'Activity not found' });
      }
      
      res.status(200).json({ success: true });
      
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
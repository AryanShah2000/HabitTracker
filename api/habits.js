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
      // Get all activities and transform to frontend format
      const dbActivities = await sql`
        SELECT id, date, water, protein, exercise, 
               water_desc, protein_desc, exercise_desc,
               created_at as timestamp
        FROM activities 
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
            description: row.water_desc || '',
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
            description: row.protein_desc || '',
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
            description: row.exercise_desc || '',
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
      
      const { date, goal, amount = 1, description = '' } = activity;
      
      if (!date || !goal) {
        return res.status(400).json({ success: false, error: 'Date and goal are required' });
      }
      
      // Get current values for this date
      const current = await sql`
        SELECT water, protein, exercise, water_desc, protein_desc, exercise_desc 
        FROM activities WHERE date = ${date}
      `;
      
      let water = 0, protein = 0, exercise = 0;
      let waterDesc = '', proteinDesc = '', exerciseDesc = '';
      
      if (current.length > 0) {
        water = current[0].water;
        protein = current[0].protein;
        exercise = current[0].exercise;
        waterDesc = current[0].water_desc || '';
        proteinDesc = current[0].protein_desc || '';
        exerciseDesc = current[0].exercise_desc || '';
      }
      
      // Update the appropriate goal and description
      if (goal === 'water') {
        water += amount;
        waterDesc = description; // Replace with new description
      } else if (goal === 'protein') {
        protein += amount;
        proteinDesc = description; // Replace with new description
      } else if (goal === 'exercise') {
        exercise += amount;
        exerciseDesc = description; // Replace with new description
      }
      
      // Use UPSERT to save to database
      const result = await sql`
        INSERT INTO activities (date, water, protein, exercise, water_desc, protein_desc, exercise_desc)
        VALUES (${date}, ${water}, ${protein}, ${exercise}, ${waterDesc}, ${proteinDesc}, ${exerciseDesc})
        ON CONFLICT (date) DO UPDATE SET 
          water = EXCLUDED.water,
          protein = EXCLUDED.protein,
          exercise = EXCLUDED.exercise,
          water_desc = EXCLUDED.water_desc,
          protein_desc = EXCLUDED.protein_desc,
          exercise_desc = EXCLUDED.exercise_desc,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, date, water, protein, exercise, water_desc, protein_desc, exercise_desc, created_at as timestamp
      `;
      
      // Return the activity in frontend format
      const savedActivity = {
        id: `${result[0].id}-${goal}`,
        goal,
        date,
        amount,
        description: goal === 'water' ? result[0].water_desc : 
                    goal === 'protein' ? result[0].protein_desc : 
                    result[0].exercise_desc,
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
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
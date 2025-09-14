// Simple in-memory storage for demo (in production, use a database)
let activities = [];

export default function handler(req, res) {
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
      console.log('Returning activities:', activities);
      res.status(200).json({ success: true, activities });
      
    } else if (req.method === 'POST') {
      // Add new activity
      const { activity } = req.body;
      
      if (!activity) {
        return res.status(400).json({ success: false, error: 'Activity data required' });
      }
      
      const newActivity = {
        ...activity,
        id: Date.now(),
        timestamp: new Date().toISOString()
      };
      
      activities.push(newActivity);
      console.log('Added activity:', newActivity);
      console.log('Total activities:', activities.length);
      
      res.status(200).json({ success: true, activity: newActivity });
      
    } else if (req.method === 'PUT') {
      // Update existing activity
      const { id, activity } = req.body;
      
      if (!id || !activity) {
        return res.status(400).json({ success: false, error: 'Activity ID and data required' });
      }
      
      const index = activities.findIndex(a => a.id === id);
      
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Activity not found' });
      }
      
      activities[index] = { ...activity, id, timestamp: activities[index].timestamp };
      
      res.status(200).json({ success: true, activity: activities[index] });
      
    } else if (req.method === 'DELETE') {
      // Delete activity
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Activity ID required' });
      }
      
      const originalLength = activities.length;
      activities = activities.filter(a => a.id !== id);
      
      if (activities.length === originalLength) {
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
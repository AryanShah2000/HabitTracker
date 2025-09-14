import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), 'data', 'habits.json');

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    const fs = require('fs');
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Read activities from JSON file
function readActivities() {
  ensureDataDirectory();
  if (!existsSync(DATA_FILE)) {
    return [];
  }
  try {
    const data = readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading activities:', error);
    return [];
  }
}

// Write activities to JSON file
function writeActivities(activities) {
  ensureDataDirectory();
  try {
    writeFileSync(DATA_FILE, JSON.stringify(activities, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing activities:', error);
    return false;
  }
}

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
    if (req.method === 'GET') {
      // Get all activities
      const activities = readActivities();
      res.status(200).json({ success: true, activities });
      
    } else if (req.method === 'POST') {
      // Add new activity
      const { activity } = req.body;
      
      if (!activity) {
        return res.status(400).json({ success: false, error: 'Activity data required' });
      }
      
      const activities = readActivities();
      activities.push({
        ...activity,
        id: Date.now(),
        timestamp: new Date().toISOString()
      });
      
      const success = writeActivities(activities);
      if (success) {
        res.status(200).json({ success: true, activity: activities[activities.length - 1] });
      } else {
        res.status(500).json({ success: false, error: 'Failed to save activity' });
      }
      
    } else if (req.method === 'PUT') {
      // Update existing activity
      const { id, activity } = req.body;
      
      if (!id || !activity) {
        return res.status(400).json({ success: false, error: 'Activity ID and data required' });
      }
      
      const activities = readActivities();
      const index = activities.findIndex(a => a.id === id);
      
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Activity not found' });
      }
      
      activities[index] = { ...activity, id, timestamp: activities[index].timestamp };
      
      const success = writeActivities(activities);
      if (success) {
        res.status(200).json({ success: true, activity: activities[index] });
      } else {
        res.status(500).json({ success: false, error: 'Failed to update activity' });
      }
      
    } else if (req.method === 'DELETE') {
      // Delete activity
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Activity ID required' });
      }
      
      const activities = readActivities();
      const filteredActivities = activities.filter(a => a.id !== id);
      
      if (filteredActivities.length === activities.length) {
        return res.status(404).json({ success: false, error: 'Activity not found' });
      }
      
      const success = writeActivities(filteredActivities);
      if (success) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ success: false, error: 'Failed to delete activity' });
      }
      
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
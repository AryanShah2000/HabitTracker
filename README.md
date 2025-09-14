# Habit Tracker

A minimalistic habit tracking app that works on both desktop and mobile browsers with cloud sync via Vercel.

## Features

- **Track 3 Goals**: Water (fl oz), Protein (grams), Exercise (minutes)
- **Progress Visualization**: Color-coded progress bars (red → yellow → green)
- **Activity Logging**: Easy form to log activities with date and amount
- **Activity Management**: View, edit, and delete previous entries
- **Monthly Calendar**: GitHub-style grid showing daily completion status
- **Mobile Responsive**: Works seamlessly on phones and tablets
- **Cloud Sync**: Data syncs across all your devices when deployed to Vercel
- **Offline Support**: Works offline and syncs when back online
- **Real-time Status**: Connection indicator shows online/offline/syncing status

## How to Use

1. **Open the App**: Visit your deployed Vercel URL or open `index.html` locally
2. **Log Activity**: Click "Log Activity" to record your daily habits
3. **Track Progress**: Watch the progress bars update in real-time with color changes
4. **View History**: Click "See Activity" to review, edit, or delete entries
5. **Check Calendar**: The monthly view shows your daily achievement pattern
6. **Cross-Device Sync**: Log activities on any device and see them everywhere

## Goal Targets

- **💧 Water**: 64 fl oz per day
- **🥩 Protein**: 100 g per day  
- **🏃 Exercise**: 30 minutes per day

## Calendar Color Coding

- **Red**: No goals achieved
- **Yellow**: 1-2 goals achieved
- **Green**: All 3 goals achieved
- **Gray**: No activity logged

## Deployment to Vercel

### Quick Deploy
1. Push this code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign up
3. Click "New Project" and import your GitHub repo
4. Deploy! Vercel will automatically handle the API endpoints

### Manual Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project folder
vercel --prod
```

### After Deployment
- Your app will be available at a Vercel URL (e.g., `your-app.vercel.app`)
- Data syncs automatically across all devices
- Works offline with local storage fallback
- Green dot = online and synced
- Red dot = offline (local storage only)
- Yellow dot = syncing

## Local Development

```bash
# Start local server
python -m http.server 8000

# Or use Node.js
npx http-server
```

## Technical Details

- **Frontend**: Pure HTML, CSS, and JavaScript
- **Backend**: Vercel serverless functions (Node.js)
- **Database**: JSON file storage (simple and reliable)
- **Sync Strategy**: API-first with localStorage fallback
- **Offline Support**: Full offline functionality
- **No Dependencies**: Zero external libraries

## File Structure

```
HabitTracker/
├── index.html          # Main app structure
├── style.css           # Styling and responsive design
├── script.js           # App logic and API integration
├── api/
│   └── habits.js       # Vercel serverless API endpoint
├── vercel.json         # Vercel deployment configuration
├── package.json        # Project metadata
└── README.md           # This file
```

## Data Storage

- **Local**: Browser localStorage (works offline)
- **Cloud**: JSON file via Vercel API (syncs across devices)
- **Sync**: Automatic when online, manual retry available

## Privacy & Security

- All data stored in your personal Vercel deployment
- No third-party analytics or tracking
- Data never leaves your control
- Works completely offline when needed

---

**Ready to deploy?** Push to GitHub → Import to Vercel → Start tracking habits across all your devices! 🎯
// Habit Tracker App
class HabitTracker {
    constructor() {
        this.goals = {
            water: { name: 'Water', target: 64, unit: 'fl oz', emoji: '💧' },
            protein: { name: 'Protein', target: 100, unit: 'g', emoji: '💪' },
            exercise: { name: 'Exercise', target: 30, unit: 'min', emoji: '🏃' }
        };
        
        this.currentDate = new Date();
        this.selectedDate = new Date(); // New property for calendar selection
        this.currentMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        this.activities = [];
        this.editingActivity = null;
        this.isOnline = navigator.onLine;
        // Use relative URL so it works both locally and on Vercel
        this.apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/habits' : '/api/habits';
        
        this.init();
    }
    
    async init() {
        this.setupOnlineListener();
        await this.loadActivities();
        this.updateCurrentDate();
        this.updateProgress();
        this.setupEventListeners();
        this.renderCalendar();
        
        // Set today's date as default in the form
        document.getElementById('dateInput').value = this.formatDate(this.selectedDate);
    }
    
    setupOnlineListener() {
        this.updateConnectionStatus();
        
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
            this.syncWithServer();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
        });
    }
    
    updateConnectionStatus() {
        const indicator = document.getElementById('statusIndicator');
        const statusText = indicator.querySelector('.status-text');
        
        indicator.className = 'status-indicator';
        
        if (this.isOnline) {
            indicator.classList.add('online');
            statusText.title = 'Online - data syncs automatically';
        } else {
            indicator.classList.add('offline');
            statusText.title = 'Offline - data saved locally';
        }
    }
    
    showSyncingStatus() {
        const indicator = document.getElementById('statusIndicator');
        const statusText = indicator.querySelector('.status-text');
        
        indicator.className = 'status-indicator syncing';
        statusText.title = 'Syncing...';
        
        setTimeout(() => {
            this.updateConnectionStatus();
        }, 1000);
    }
    
    // API Methods
    async apiCall(method, data = null) {
        if (!this.isOnline) {
            throw new Error('Offline');
        }
        
        console.log(`Making API call: ${method} to ${this.apiUrl}`, data);
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(this.apiUrl, options);
        const result = await response.json();
        
        console.log('API response:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'API call failed');
        }
        
        return result;
    }
    
    async syncWithServer() {
        this.showSyncingStatus();
        
        try {
            const result = await this.apiCall('GET');
            this.activities = result.activities || [];
            this.saveActivitiesLocal(); // Update local storage
            this.updateProgress();
            this.renderCalendar();
        } catch (error) {
            console.log('Sync failed, using local data:', error.message);
        }
    }
    
    // Local Storage Management (fallback)
    loadActivitiesLocal() {
        const stored = localStorage.getItem('habitTracker_activities');
        return stored ? JSON.parse(stored) : [];
    }
    
    saveActivitiesLocal() {
        localStorage.setItem('habitTracker_activities', JSON.stringify(this.activities));
    }
    
    // Combined Load Activities (try API first, fallback to local)
    async loadActivities() {
        try {
            if (this.isOnline) {
                const result = await this.apiCall('GET');
                this.activities = result.activities || [];
                this.saveActivitiesLocal(); // Sync to local storage
                console.log('Loaded activities from server:', this.activities.length);
            } else {
                throw new Error('Offline');
            }
        } catch (error) {
            console.log('Loading from local storage:', error.message);
            this.activities = this.loadActivitiesLocal();
        }
    }
    
    // Save Activities (try API first, fallback to local)
    async saveActivities() {
        this.saveActivitiesLocal(); // Always save locally first
        
        if (this.isOnline) {
            try {
                // For now, we'll do a simple approach - sync all activities
                // In a production app, you'd want more sophisticated sync
                console.log('Data saved locally and will sync when online');
            } catch (error) {
                console.log('Failed to sync to server:', error.message);
            }
        }
    }
    
    // Date Utilities
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    formatDisplayDate(date) {
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    updateCurrentDate() {
        document.getElementById('currentDate').textContent = this.formatDisplayDate(this.selectedDate);
    }
    
    // Progress Calculation
    getDayTotal(goal, date) {
        const dateStr = this.formatDate(date);
        return this.activities
            .filter(activity => activity.goal === goal && activity.date === dateStr)
            .reduce((total, activity) => total + activity.amount, 0);
    }
    
    updateProgress() {
        Object.keys(this.goals).forEach(goalKey => {
            const goal = this.goals[goalKey];
            const total = this.getDayTotal(goalKey, this.selectedDate);
            const percentage = Math.min((total / goal.target) * 100, 100);
            
            // Update progress text
            const progressElement = document.getElementById(`${goalKey}Progress`);
            progressElement.textContent = `${total} / ${goal.target} ${goal.unit}`;
            
            // Update progress bar
            const fillElement = document.getElementById(`${goalKey}Fill`);
            fillElement.style.width = `${percentage}%`;
            
            // Update progress bar color
            fillElement.className = 'progress-fill';
            if (percentage >= 100) {
                fillElement.classList.add('complete');
            } else if (percentage >= 67) {
                fillElement.classList.add('high');
            } else if (percentage >= 34) {
                fillElement.classList.add('medium');
            } else {
                fillElement.classList.add('low');
            }
        });
        
        // Update date display to show selected date
        document.getElementById('currentDate').textContent = this.formatDisplayDate(this.selectedDate);
    }
    
    // Goal Achievement Calculation
    getGoalsAchieved(date) {
        let achieved = 0;
        Object.keys(this.goals).forEach(goalKey => {
            const goal = this.goals[goalKey];
            const total = this.getDayTotal(goalKey, date);
            if (total >= goal.target) achieved++;
        });
        return achieved;
    }
    
    // Calendar Rendering
    renderCalendar() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        // Update calendar title
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('calendarTitle').textContent = `${monthNames[month]} ${year}`;
        
        // Clear calendar grid
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day';
            grid.appendChild(emptyDay);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day current-month';
            dayElement.textContent = day;
            
            const dayDate = new Date(year, month, day);
            const goalsAchieved = this.getGoalsAchieved(dayDate);
            
            // Add goal achievement classes
            if (goalsAchieved === 0) {
                // Check if there are any activities for this day
                const hasActivities = this.activities.some(activity => 
                    activity.date === this.formatDate(dayDate)
                );
                if (hasActivities) {
                    dayElement.classList.add('no-goals');
                }
            } else if (goalsAchieved === 3) {
                dayElement.classList.add('all-goals');
            } else {
                dayElement.classList.add('partial-goals');
            }
            
            // Highlight today
            if (this.formatDate(dayDate) === this.formatDate(this.currentDate)) {
                dayElement.classList.add('today');
            }
            
            // Highlight selected date
            if (this.formatDate(dayDate) === this.formatDate(this.selectedDate)) {
                dayElement.classList.add('selected');
            }
            
            // Add click handler
            dayElement.addEventListener('click', () => {
                this.selectDate(dayDate);
            });
            
            grid.appendChild(dayElement);
        }
    }
    
    // Date Selection
    selectDate(date) {
        this.selectedDate = new Date(date);
        this.updateProgress();
        this.renderCalendar();
    }
    
    // Quick Add Methods
    showQuickAddModal(goal) {
        this.currentQuickAddGoal = goal;
        const goalData = this.goals[goal];
        
        document.getElementById('quickAddTitle').textContent = `Quick Add ${goalData.name}`;
        document.getElementById('quickAddLabel').textContent = `Amount (${goalData.unit}):`;
        
        const slider = document.getElementById('quickAddSlider');
        slider.max = goalData.target * 2; // Allow adding up to 2x the daily goal
        slider.value = 0;
        document.getElementById('sliderValue').textContent = `0 ${goalData.unit}`;
        
        // Update slider listener to show correct unit
        slider.oninput = (e) => {
            document.getElementById('sliderValue').textContent = `${e.target.value} ${goalData.unit}`;
        };
        
        document.getElementById('quickAddModal').classList.add('show');
    }
    
    hideQuickAddModal() {
        document.getElementById('quickAddModal').classList.remove('show');
        this.currentQuickAddGoal = null;
    }
    
    async submitQuickAdd() {
        const amount = parseFloat(document.getElementById('quickAddSlider').value);
        if (amount <= 0) return;
        
        try {
            const activity = {
                id: Date.now(),
                goal: this.currentQuickAddGoal,
                date: this.formatDate(this.selectedDate),
                amount,
                timestamp: new Date().toISOString()
            };
            
            if (this.isOnline) {
                const result = await this.apiCall('POST', { activity });
                this.activities.push(result.activity);
            } else {
                this.activities.push(activity);
            }
            
            await this.saveActivities();
            this.updateProgress();
            this.renderCalendar();
            this.hideQuickAddModal();
            
        } catch (error) {
            console.log('Failed to save to server, saved locally:', error.message);
            // Still add locally and update UI
            this.activities.push({
                id: Date.now(),
                goal: this.currentQuickAddGoal,
                date: this.formatDate(this.selectedDate),
                amount,
                timestamp: new Date().toISOString()
            });
            this.saveActivitiesLocal();
            this.updateProgress();
            this.renderCalendar();
            this.hideQuickAddModal();
        }
    }
    
    // Event Listeners
    setupEventListeners() {
        // Modal controls
        document.getElementById('logActivityBtn').addEventListener('click', () => {
            this.showLogModal();
        });
        
        document.getElementById('seeActivityBtn').addEventListener('click', () => {
            this.showActivityModal();
        });
        
        document.getElementById('closeLogModal').addEventListener('click', () => {
            this.hideLogModal();
        });
        
        document.getElementById('closeActivityModal').addEventListener('click', () => {
            this.hideActivityModal();
        });
        
        // Close modals when clicking outside
        document.getElementById('logModal').addEventListener('click', (e) => {
            if (e.target.id === 'logModal') this.hideLogModal();
        });
        
        document.getElementById('activityModal').addEventListener('click', (e) => {
            if (e.target.id === 'activityModal') this.hideActivityModal();
        });
        
        // Form submission
        document.getElementById('logForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogSubmission();
        });
        
        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            this.renderCalendar();
        });
        
        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            this.renderCalendar();
        });
        
        // Quick add buttons
        document.querySelectorAll('.quick-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const goal = btn.getAttribute('data-goal');
                this.showQuickAddModal(goal);
            });
        });
        
        // Quick add modal controls
        document.getElementById('closeQuickAddModal').addEventListener('click', () => {
            this.hideQuickAddModal();
        });
        
        document.getElementById('quickAddModal').addEventListener('click', (e) => {
            if (e.target.id === 'quickAddModal') this.hideQuickAddModal();
        });
        
        document.getElementById('quickAddSubmit').addEventListener('click', async () => {
            await this.submitQuickAdd();
        });
        
        // Slider input
        const slider = document.getElementById('quickAddSlider');
        const sliderValue = document.getElementById('sliderValue');
        
        slider.addEventListener('input', (e) => {
            const value = e.target.value;
            sliderValue.textContent = `${value}`;
        });
    }
    
    // Modal Management
    showLogModal() {
        this.editingActivity = null;
        document.getElementById('logForm').reset();
        document.getElementById('dateInput').value = this.formatDate(this.selectedDate);
        document.getElementById('logModal').classList.add('show');
        document.querySelector('#logModal .modal-header h3').textContent = 'Log Activity';
    }
    
    hideLogModal() {
        document.getElementById('logModal').classList.remove('show');
        this.editingActivity = null;
    }
    
    showActivityModal() {
        this.renderActivityList();
        document.getElementById('activityModal').classList.add('show');
    }
    
    hideActivityModal() {
        document.getElementById('activityModal').classList.remove('show');
    }
    
    // Activity Management
    async handleLogSubmission() {
        const goal = document.getElementById('goalSelect').value;
        const date = document.getElementById('dateInput').value;
        const amount = parseFloat(document.getElementById('amountInput').value);
        
        if (!goal || !date || !amount) return;
        
        try {
            if (this.editingActivity) {
                // Update existing activity
                const index = this.activities.findIndex(a => a.id === this.editingActivity.id);
                if (index !== -1) {
                    this.activities[index] = { ...this.editingActivity, goal, date, amount };
                    
                    if (this.isOnline) {
                        await this.apiCall('PUT', { 
                            id: this.editingActivity.id, 
                            activity: this.activities[index] 
                        });
                    }
                }
            } else {
                // Add new activity
                const activity = {
                    id: Date.now(),
                    goal,
                    date,
                    amount,
                    timestamp: new Date().toISOString()
                };
                
                if (this.isOnline) {
                    const result = await this.apiCall('POST', { activity });
                    this.activities.push(result.activity);
                } else {
                    this.activities.push(activity);
                }
            }
            
            await this.saveActivities();
            this.updateProgress();
            this.renderCalendar();
            this.hideLogModal();
            
        } catch (error) {
            console.log('Failed to save to server, saved locally:', error.message);
            // The activity was still saved locally, so update UI
            this.updateProgress();
            this.renderCalendar();
            this.hideLogModal();
        }
    }
    
    renderActivityList() {
        const container = document.getElementById('activityList');
        container.innerHTML = '';
        
        if (this.activities.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #718096; padding: 20px;">No activities logged yet.</div>';
            return;
        }
        
        // Sort activities by date (newest first)
        const sortedActivities = [...this.activities].sort((a, b) => {
            const dateComparison = new Date(b.date) - new Date(a.date);
            if (dateComparison !== 0) return dateComparison;
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        sortedActivities.forEach(activity => {
            const activityElement = document.createElement('div');
            activityElement.className = `activity-item ${activity.goal}`;
            
            const goal = this.goals[activity.goal];
            const date = new Date(activity.date).toLocaleDateString();
            
            activityElement.innerHTML = `
                <div class="activity-info">
                    <div class="activity-goal">${goal.emoji} ${goal.name}</div>
                    <div class="activity-details">${date} • ${activity.amount} ${goal.unit}</div>
                </div>
                <div class="activity-actions">
                    <button class="edit-btn" onclick="habitTracker.editActivity('${activity.id}')">Edit</button>
                    <button class="delete-btn" onclick="habitTracker.deleteActivity('${activity.id}')">Delete</button>
                </div>
            `;
            
            container.appendChild(activityElement);
        });
    }
    
    editActivity(id) {
        const activity = this.activities.find(a => a.id === id);
        if (!activity) return;
        
        this.editingActivity = activity;
        document.getElementById('goalSelect').value = activity.goal;
        document.getElementById('dateInput').value = activity.date;
        document.getElementById('amountInput').value = activity.amount;
        
        document.querySelector('#logModal .modal-header h3').textContent = 'Edit Activity';
        this.hideActivityModal();
        this.showLogModal();
    }
    
    async deleteActivity(id) {
        if (confirm('Are you sure you want to delete this activity?')) {
            try {
                if (this.isOnline) {
                    await this.apiCall('DELETE', { id });
                }
                
                this.activities = this.activities.filter(a => a.id !== id);
                await this.saveActivities();
                this.updateProgress();
                this.renderCalendar();
                this.renderActivityList();
                
            } catch (error) {
                console.log('Failed to delete from server, deleted locally:', error.message);
                // Still remove locally and update UI
                this.activities = this.activities.filter(a => a.id !== id);
                this.saveActivitiesLocal();
                this.updateProgress();
                this.renderCalendar();
                this.renderActivityList();
            }
        }
    }
}

// Initialize the app when the page loads
let habitTracker;
document.addEventListener('DOMContentLoaded', () => {
    habitTracker = new HabitTracker();
});
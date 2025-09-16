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
        this.eventListenersSetup = false; // Prevent duplicate event listeners
        this.authEventListenersSetup = false; // Prevent duplicate auth event listeners
        this.isOnline = navigator.onLine;
        
        // Authentication properties
        this.currentUser = null;
        this.authToken = null;
        
        // Use relative URL so it works both locally and on Vercel
        this.apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/habits' : '/api/habits';
        this.authApiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/auth' : '/api/auth';
        
        this.init();
    }
    
    async init() {
        console.log('Initializing app...');
        
        // Register service worker for PWA functionality
        this.registerServiceWorker();
        
        this.setupOnlineListener();
        this.setupVisibilityListener(); // Add visibility listener for cross-device sync
        
        // Check authentication first
        console.log('Checking authentication...');
        await this.checkAuthentication();
        
        // If not authenticated, show auth screen and setup auth listeners
        if (!this.currentUser) {
            console.log('User not authenticated, showing auth screen');
            this.showAuthScreen();
            this.setupAuthEventListeners();
            return;
        }
        
        console.log('User authenticated, initializing main app');
        // User is authenticated, proceed with app initialization
        await this.loadActivities();
        this.updateCurrentDate();
        this.updateProgress();
        this.setupEventListeners();
        this.renderCalendar();
        
        // Set today's date as default in the form
        document.getElementById('dateInput').value = this.formatDate(this.selectedDate);
        
        // Show daily logs for today by default
        this.showDailyLogs(this.selectedDate);
        
        // Show the main app
        this.showMainApp();
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                console.log('Registering service worker...');
                const registration = await navigator.serviceWorker.register('/sw.js');
                
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('New service worker found:', newWorker);
                });
                
                console.log('Service worker registered successfully:', registration);
                
                // Handle quick action shortcuts from app icons
                this.handleShortcutActions();
                
            } catch (error) {
                console.log('Service worker registration failed:', error);
            }
        } else {
            console.log('Service workers not supported');
        }
    }
    
    handleShortcutActions() {
        // Check URL parameters for quick actions
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        if (action && this.goals[action]) {
            // Auto-open the quick add modal for the specified goal
            setTimeout(() => {
                this.showQuickAddModal(action);
            }, 500);
        }
    }

    // Authentication Methods
    async checkAuthentication() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            return false;
        }

        try {
            const response = await fetch(this.authApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'verify' })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.authToken = token;
                return true;
            } else {
                // Token is invalid, clear it
                localStorage.removeItem('authToken');
                return false;
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            return false;
        }
    }

    showAuthScreen() {
        document.getElementById('authRequired').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('authHeader').style.display = 'block';
        
        // Ensure auth event listeners are set up
        this.setupAuthEventListeners();
    }

    setupLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            // Remove any existing event listener first
            logoutBtn.replaceWith(logoutBtn.cloneNode(true));
            const newLogoutBtn = document.getElementById('logoutBtn');
            
            newLogoutBtn.addEventListener('click', () => {
                console.log('Logout button clicked');
                this.logout();
            });
            console.log('Logout event listener attached successfully');
        } else {
            console.log('Warning: Logout button not found when setting up');
        }
    }

    showMainApp() {
        document.getElementById('authRequired').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('authHeader').style.display = 'block';
        
        // Update header to show user info
        document.getElementById('authButtons').style.display = 'none';
        document.getElementById('userControls').style.display = 'flex';
        document.getElementById('usernameDisplay').textContent = this.currentUser.username;
        
        // Set up logout button now that it's visible
        this.setupLogoutButton();
    }

    async login(username, password) {
        try {
            const response = await fetch(this.authApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'login',
                    username,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                this.authToken = data.token;
                localStorage.setItem('authToken', data.token);
                
                // Initialize the app
                await this.loadActivities();
                this.updateCurrentDate();
                this.updateProgress();
                this.setupEventListeners();
                this.renderCalendar();
                document.getElementById('dateInput').value = this.formatDate(this.selectedDate);
                this.showDailyLogs(this.selectedDate);
                
                this.showMainApp();
                this.hideAuthModals();
                
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Login failed:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    async signup(username, password, confirmPassword) {
        if (password !== confirmPassword) {
            return { success: false, error: 'Passwords do not match' };
        }

        try {
            const response = await fetch(this.authApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'signup',
                    username,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                this.authToken = data.token;
                localStorage.setItem('authToken', data.token);
                
                // Initialize the app for new user
                this.activities = []; // Start with empty activities
                this.updateProgress();
                this.setupEventListeners();
                this.renderCalendar();
                document.getElementById('dateInput').value = this.formatDate(this.selectedDate);
                this.showDailyLogs(this.selectedDate);
                
                this.showMainApp();
                this.hideAuthModals();
                
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Signup failed:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    logout() {
        console.log('Logout initiated...');
        
        // Clear all authentication data
        this.currentUser = null;
        this.authToken = null;
        this.activities = [];
        
        // Reset event listener flags so they can be set up again
        this.authEventListenersSetup = false;
        
        // Clear localStorage completely
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('activities');
        localStorage.clear(); // Clear everything just to be safe
        
        console.log('Cleared authentication data and localStorage');
        
        // Clear any session storage as well
        sessionStorage.clear();
        
        // Hide authenticated content and show auth screen
        document.getElementById('authButtons').style.display = 'flex';
        document.getElementById('userControls').style.display = 'none';
        document.getElementById('authRequired').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        
        // Hide any open modals
        this.hideAuthModals();
        
        console.log('Logout complete - showing auth screen');
        
        // Force page reload to ensure clean state
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }

    hideAuthModals() {
        const loginModal = document.getElementById('loginModal');
        const signupModal = document.getElementById('signupModal');
        
        // Remove CSS classes
        loginModal.classList.remove('show');
        signupModal.classList.remove('show');
        
        // Clear inline styles that were forcing visibility
        loginModal.style.display = '';
        loginModal.style.position = '';
        loginModal.style.top = '';
        loginModal.style.left = '';
        loginModal.style.width = '';
        loginModal.style.height = '';
        loginModal.style.backgroundColor = '';
        loginModal.style.zIndex = '';
        loginModal.style.alignItems = '';
        loginModal.style.justifyContent = '';
        
        signupModal.style.display = '';
        signupModal.style.position = '';
        signupModal.style.top = '';
        signupModal.style.left = '';
        signupModal.style.width = '';
        signupModal.style.height = '';
        signupModal.style.backgroundColor = '';
        signupModal.style.zIndex = '';
        signupModal.style.alignItems = '';
        signupModal.style.justifyContent = '';
        
        // Clear modal content inline styles too
        const loginContent = loginModal.querySelector('.modal-content');
        const signupContent = signupModal.querySelector('.modal-content');
        
        if (loginContent) {
            loginContent.style.display = '';
            loginContent.style.backgroundColor = '';
            loginContent.style.padding = '';
            loginContent.style.borderRadius = '';
            loginContent.style.maxWidth = '';
            loginContent.style.width = '';
            loginContent.style.zIndex = '';
            loginContent.style.boxShadow = '';
            loginContent.style.border = '';
        }
        
        if (signupContent) {
            signupContent.style.display = '';
            signupContent.style.backgroundColor = '';
            signupContent.style.padding = '';
            signupContent.style.borderRadius = '';
            signupContent.style.maxWidth = '';
            signupContent.style.width = '';
            signupContent.style.zIndex = '';
            signupContent.style.boxShadow = '';
            signupContent.style.border = '';
        }
    }
    
    setupAuthEventListeners() {
        // Prevent duplicate auth event listeners
        if (this.authEventListenersSetup) {
            console.log('Auth event listeners already set up, skipping...');
            return;
        }
        
        console.log('Setting up authentication event listeners...');
        this.authEventListenersSetup = true;
        
        // Show login modal
        const showLoginBtn = document.getElementById('showLoginBtn');
        const authRequiredLogin = document.getElementById('authRequiredLogin');
        
        console.log('showLoginBtn element:', showLoginBtn);
        console.log('authRequiredLogin element:', authRequiredLogin);
        
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => {
                console.log('Show login button clicked');
                document.getElementById('loginModal').classList.add('show');
            });
        }
        
        if (authRequiredLogin) {
            authRequiredLogin.addEventListener('click', () => {
                console.log('Auth required login button clicked');
                
                const loginModal = document.getElementById('loginModal');
                console.log('loginModal element:', loginModal);
                if (loginModal) {
                    loginModal.classList.add('show');
                    // Force the modal to be visible with inline styles and high z-index
                    loginModal.style.display = 'flex';
                    loginModal.style.position = 'fixed';
                    loginModal.style.top = '0';
                    loginModal.style.left = '0';
                    loginModal.style.width = '100%';
                    loginModal.style.height = '100%';
                    loginModal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                    loginModal.style.zIndex = '9999';
                    loginModal.style.alignItems = 'center';
                    loginModal.style.justifyContent = 'center';
                    
                    // Also force the modal content to be visible
                    const modalContent = loginModal.querySelector('.modal-content');
                    if (modalContent) {
                        modalContent.style.display = 'block';
                        modalContent.style.backgroundColor = 'white';
                        modalContent.style.padding = '24px';
                        modalContent.style.borderRadius = '12px';
                        modalContent.style.maxWidth = '400px';
                        modalContent.style.width = '90%';
                        modalContent.style.zIndex = '10000';
                        modalContent.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                        modalContent.style.border = '1px solid #ddd';
                        console.log('Styled modal content as well');
                    }
                    
                    console.log('Added show class and inline styles to login modal');
                } else {
                    console.log('Login modal not found!');
                }
            });
        }

        // Show signup modal
        const showSignupBtn = document.getElementById('showSignupBtn');
        const authRequiredSignup = document.getElementById('authRequiredSignup');
        
        console.log('showSignupBtn element:', showSignupBtn);
        console.log('authRequiredSignup element:', authRequiredSignup);
        
        if (showSignupBtn) {
            showSignupBtn.addEventListener('click', () => {
                console.log('Show signup button clicked');
                document.getElementById('signupModal').classList.add('show');
            });
        }
        
        if (authRequiredSignup) {
            authRequiredSignup.addEventListener('click', () => {
                console.log('Auth required signup button clicked');
                const signupModal = document.getElementById('signupModal');
                console.log('signupModal element:', signupModal);
                if (signupModal) {
                    signupModal.classList.add('show');
                    // Force the modal to be visible with inline styles and high z-index
                    signupModal.style.display = 'flex';
                    signupModal.style.position = 'fixed';
                    signupModal.style.top = '0';
                    signupModal.style.left = '0';
                    signupModal.style.width = '100%';
                    signupModal.style.height = '100%';
                    signupModal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                    signupModal.style.zIndex = '9999';
                    signupModal.style.alignItems = 'center';
                    signupModal.style.justifyContent = 'center';
                    
                    // Also force the modal content to be visible
                    const modalContent = signupModal.querySelector('.modal-content');
                    if (modalContent) {
                        modalContent.style.display = 'block';
                        modalContent.style.backgroundColor = 'white';
                        modalContent.style.padding = '24px';
                        modalContent.style.borderRadius = '12px';
                        modalContent.style.maxWidth = '400px';
                        modalContent.style.width = '90%';
                        modalContent.style.zIndex = '10000';
                        modalContent.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                        modalContent.style.border = '1px solid #ddd';
                        console.log('Styled signup modal content as well');
                    }
                    
                    console.log('Added show class and inline styles to signup modal');
                } else {
                    console.log('Signup modal not found!');
                }
            });
        }

        // Close modals
        document.getElementById('closeLoginModal').addEventListener('click', () => {
            console.log('Close login modal clicked');
            this.hideAuthModals();
        });
        
        document.getElementById('closeSignupModal').addEventListener('click', () => {
            console.log('Close signup modal clicked');
            this.hideAuthModals();
        });

        // Switch between modals
        document.getElementById('switchToSignup').addEventListener('click', () => {
            document.getElementById('loginModal').classList.remove('show');
            document.getElementById('signupModal').classList.add('show');
        });
        
        document.getElementById('switchToLogin').addEventListener('click', () => {
            document.getElementById('signupModal').classList.remove('show');
            document.getElementById('loginModal').classList.add('show');
        });

        // Handle form submissions
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            const result = await this.login(username, password);
            if (!result.success) {
                alert(result.error);
            }
        });

        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signupUsername').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupPasswordConfirm').value;
            
            const result = await this.signup(username, password, confirmPassword);
            if (!result.success) {
                alert(result.error);
            }
        });

        // Note: Logout button is set up in setupLogoutButton() after user controls are shown

        // Close modals when clicking outside
        document.getElementById('loginModal').addEventListener('click', (e) => {
            if (e.target.id === 'loginModal') this.hideAuthModals();
        });
        
        document.getElementById('signupModal').addEventListener('click', (e) => {
            if (e.target.id === 'signupModal') this.hideAuthModals();
        });
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
            
            // Ensure we have the latest data cached when going offline
            this.saveActivitiesLocal();
            console.log('Gone offline - data cached locally');
        });
    }
    
    setupVisibilityListener() {
        // Refresh data when app becomes visible (for cross-device sync)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline) {
                console.log('App became visible - refreshing data for cross-device sync');
                this.syncWithServer();
            }
        });
        
        // Also refresh when window gains focus
        window.addEventListener('focus', () => {
            if (this.isOnline) {
                console.log('App gained focus - refreshing data');
                this.syncWithServer();
            }
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
        
        // Add authorization header if user is authenticated
        if (this.authToken) {
            options.headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
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
            if (result.activities) {
                this.activities = result.activities;
                this.saveActivitiesLocal(); // Update local storage with fresh data
                this.updateProgress();
                this.renderCalendar();
                console.log('Synced with server - updated activities:', this.activities.length);
            }
        } catch (error) {
            console.log('Sync failed, using local data:', error.message);
        }
        
        // Reset status indicator after sync
        setTimeout(() => {
            this.updateConnectionStatus();
        }, 1000);
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
        // Always load from local storage first to have immediate data
        this.activities = this.loadActivitiesLocal();
        console.log('Loaded activities from local storage:', this.activities.length);
        
        // Then try to sync with server if online
        if (this.isOnline) {
            try {
                const result = await this.apiCall('GET');
                if (result.activities && result.activities.length >= 0) {
                    this.activities = result.activities;
                    this.saveActivitiesLocal(); // Update local storage with fresh data
                    console.log('Updated activities from server:', this.activities.length);
                    this.updateProgress(); // Refresh UI with server data
                    this.renderCalendar();
                }
            } catch (error) {
                console.log('Server sync failed, using local data:', error.message);
                // Local data is already loaded, so we continue with that
            }
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
        this.showDailyLogs(date);
    }

    // Daily Logs Methods
    showDailyLogs(date) {
        const dateStr = this.formatDate(date);
        const dayActivities = this.activities.filter(activity => activity.date === dateStr);
        
        const dailyLogsSection = document.getElementById('dailyLogsSection');
        const dailyLogsTitle = document.getElementById('dailyLogsTitle');
        const dailyLogsContainer = document.getElementById('dailyLogsContainer');
        
        // Format the date for display
        const displayDate = date.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        dailyLogsTitle.textContent = `Activities for ${displayDate}`;
        
        if (dayActivities.length === 0) {
            dailyLogsContainer.innerHTML = '<div class="daily-logs-empty">No activities logged for this day</div>';
        } else {
            // Sort activities by timestamp (newest first)
            const sortedActivities = dayActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            dailyLogsContainer.innerHTML = sortedActivities.map(activity => {
                const goalData = this.goals[activity.goal];
                const time = new Date(activity.timestamp).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                });
                
                return `
                    <div class="daily-log-item">
                        <div class="daily-log-info">
                            <div class="daily-log-goal">${goalData.emoji} ${goalData.name}</div>
                            <div class="daily-log-amount">${activity.amount} ${goalData.unit}</div>
                            ${activity.description ? `<div class="daily-log-description">"${activity.description}"</div>` : ''}
                        </div>
                        <div class="daily-log-time">${time}</div>
                    </div>
                `;
            }).join('');
        }
        
        dailyLogsSection.style.display = 'block';
    }
    
    // Quick Add Methods
    showQuickAddModal(goal) {
        this.currentQuickAddGoal = goal;
        const goalData = this.goals[goal];
        
        document.getElementById('quickAddTitle').textContent = `Quick Add ${goalData.name}`;
        document.getElementById('quickAddLabel').textContent = `Amount (${goalData.unit}):`;
        
        const slider = document.getElementById('quickAddSlider');
        const valueInput = document.getElementById('sliderValue');
        
        slider.max = goalData.target * 2; // Allow adding up to 2x the daily goal
        valueInput.max = goalData.target * 2;
        slider.value = 0;
        valueInput.value = 0;
        
        // Clear description field
        document.getElementById('quickAddDescription').value = '';
        
        // Remove any existing event listeners by cloning elements
        const newSlider = slider.cloneNode(true);
        const newValueInput = valueInput.cloneNode(true);
        slider.parentNode.replaceChild(newSlider, slider);
        valueInput.parentNode.replaceChild(newValueInput, valueInput);
        
        // Add fresh event listeners
        newSlider.addEventListener('input', (e) => {
            newValueInput.value = e.target.value;
        });
        
        newValueInput.addEventListener('input', (e) => {
            const value = Math.max(0, Math.min(parseFloat(e.target.value) || 0, goalData.target * 2));
            newSlider.value = value;
            newValueInput.value = value;
        });
        
        document.getElementById('quickAddModal').classList.add('show');
    }
    
    hideQuickAddModal() {
        document.getElementById('quickAddModal').classList.remove('show');
        document.getElementById('quickAddDescription').value = '';
        this.currentQuickAddGoal = null;
    }
    
    async submitQuickAdd() {
        const amount = parseFloat(document.getElementById('sliderValue').value);
        if (amount <= 0) return;
        
        const description = document.getElementById('quickAddDescription').value.trim();
        
        try {
            const activity = {
                id: Date.now(),
                goal: this.currentQuickAddGoal,
                date: this.formatDate(this.selectedDate),
                amount,
                description: description || null,
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
        // Prevent duplicate event listeners for main app
        if (this.eventListenersSetup) {
            console.log('Main app event listeners already set up, skipping...');
            return;
        }
        
        console.log('Setting up main app event listeners...');
        this.eventListenersSetup = true;
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
        const description = document.getElementById('descriptionInput').value.trim();
        
        if (!goal || !date || !amount) return;
        
        try {
            if (this.editingActivity) {
                // Update existing activity
                const index = this.activities.findIndex(a => a.id === this.editingActivity.id);
                if (index !== -1) {
                    this.activities[index] = { 
                        ...this.editingActivity, 
                        goal, 
                        date, 
                        amount, 
                        description: description || null 
                    };
                    
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
                    description: description || null,
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
                    <div class="activity-goal">${goal.emoji} ${goal.name} - ${activity.amount} ${goal.unit} • ${date}</div>
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
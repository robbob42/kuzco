/**
 * KUZCO FRONTEND
 * Crafted by Coco 💅
 */

const STATE = {
    currentDate: new Date(), // Tracks the month we are viewing
    currentUser: null,
    activeTab: 'personal',   // 'personal' | 'group'
    availabilityCache: [],   // Stores dates ["2023-10-01"]
    aggregateCache: []       // Stores aggregate objects
};

const DOM = {
    monthDisplay: document.getElementById('current-month-display'),
    grid: document.getElementById('calendar-grid'),
    prevBtn: document.getElementById('prev-month'),
    nextBtn: document.getElementById('next-month'),
    tabs: document.querySelectorAll('.tab-btn'),
    userBadge: document.getElementById('user-badge')
};

/**
 * 1. API HELPERS
 * We don't do messy fetch calls inline. We wrap them with style.
 */
async function fetchWithAuth(endpoint, options = {}) {
    try {
        const response = await fetch(`/api${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (response.status === 401 || response.status === 403) {
            alert("Honey, you aren't on the list. (Unauthorized)");
            return null;
        }

        return await response.json();
    } catch (err) {
        console.error("Ugh, network error:", err);
        return null;
    }
}

/**
 * 2. INITIALIZATION
 */
async function init() {
    // Who are we?
    const user = await fetchWithAuth('/users/me');
    if (user) {
        STATE.currentUser = user;
        DOM.userBadge.textContent = `Hi, ${user.display_name}`;
    }

    // Attach Event Listeners
    DOM.prevBtn.addEventListener('click', () => changeMonth(-1));
    DOM.nextBtn.addEventListener('click', () => changeMonth(1));
    
    DOM.tabs.forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    // Initial Render
    renderHeader();
    await loadDataAndRender();
}

/**
 * 3. CORE LOGIC
 */
function changeMonth(delta) {
    STATE.currentDate.setMonth(STATE.currentDate.getMonth() + delta);
    renderHeader();
    loadDataAndRender(); // Fetch new data for the new month
}

function renderHeader() {
    const options = { month: 'long', year: 'numeric' };
    DOM.monthDisplay.textContent = STATE.currentDate.toLocaleDateString('en-US', options);
}

function switchTab(tabName) {
    STATE.activeTab = tabName;
    
    // Update Buttons
    DOM.tabs.forEach(btn => {
        if (btn.dataset.tab === tabName) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Re-fetch and Render because context changed
    loadDataAndRender();
}

/**
 * 4. DATA LOADING
 */
async function loadDataAndRender() {
    // Optimistic: Don't nuke the grid if we are just switching tabs, 
    // but do show a spinner if we are changing months.
    // For now, let's just keep it simple.
    
    if (STATE.activeTab === 'personal') {
        const dates = await fetchWithAuth('/availability/me');
        STATE.availabilityCache = dates || [];
    } else {
        const data = await fetchWithAuth('/availability/aggregate');
        STATE.aggregateCache = data || [];
    }

    renderCalendar();
}

/**
 * 5. THE RENDER ENGINE
 * This is where the magic happens. 
 */
function renderCalendar() {
    DOM.grid.innerHTML = ''; // Clear the stage

    const year = STATE.currentDate.getFullYear();
    const month = STATE.currentDate.getMonth();

    // First day of the month (0-6)
    const firstDay = new Date(year, month, 1).getDay();
    // Days in this month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 1. Spacer Cells (Empty divs before the 1st)
    for (let i = 0; i < firstDay; i++) {
        const spacer = document.createElement('div');
        spacer.className = 'day-cell empty';
        DOM.grid.appendChild(spacer);
    }

    // 2. Actual Days
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        const dateStr = formatDateString(year, month, d);
        
        cell.textContent = d;
        cell.dataset.date = dateStr;

        if (STATE.activeTab === 'personal') {
            renderPersonalDay(cell, dateStr);
        } else {
            renderAggregateDay(cell, dateStr);
        }
        
        DOM.grid.appendChild(cell);
    }
}

/**
 * Helper: Formats YYYY-MM-DD (ISO 8601 or bust, darling)
 */
function formatDateString(year, month, day) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
}

/**
 * LOGIC: Personal Tab
 */
function renderPersonalDay(cell, dateStr) {
    // Initial Render State
    const isInitiallyAvailable = STATE.availabilityCache.includes(dateStr);
    cell.className = `day-cell ${isInitiallyAvailable ? 'available' : 'unavailable'}`;
    
    // Add Click Interaction
    // FIX: We must check the cache *inside* the click handler to get the current state.
    cell.addEventListener('click', () => {
        const isCurrentlyAvailable = STATE.availabilityCache.includes(dateStr);
        toggleAvailability(cell, dateStr, !isCurrentlyAvailable);
    });
}

/**
 * LOGIC: Aggregate Tab (The Heatmap)
 */
function renderAggregateDay(cell, dateStr) {
    // Find data for this specific day
    const dayData = STATE.aggregateCache.find(item => item.date === dateStr);
    
    let heatClass = 'heat-0'; // Default: No one is free (Red)

    if (dayData) {
        const count = dayData.count;
        const total = dayData.total_active_users;

        if (count === total) heatClass = 'heat-3';      // Everyone! (Green)
        else if (count >= 2) heatClass = 'heat-2';      // Most people (Yellow)
        else if (count > 0)  heatClass = 'heat-1';      // Someone (Pink)
    }

    cell.className = `day-cell ${heatClass}`;
    // No click listener for aggregate view. Look, don't touch.
}

/**
 * 6. INTERACTION
 * Handles the click, updates UI immediately, then talks to server.
 */
async function toggleAvailability(cell, dateStr, newStatus) {
    // 1. Optimistic UI Update (Instant gratification)
    if (newStatus) {
        cell.classList.replace('unavailable', 'available');
        // Add to cache if not already there
        if (!STATE.availabilityCache.includes(dateStr)) {
            STATE.availabilityCache.push(dateStr);
        }
    } else {
        cell.classList.replace('available', 'unavailable');
        // Remove from cache
        STATE.availabilityCache = STATE.availabilityCache.filter(d => d !== dateStr);
    }

    // 2. Background API Call
    const result = await fetchWithAuth('/availability', {
        method: 'POST',
        body: JSON.stringify({
            date: dateStr,
            available: newStatus
        })
    });

    // 3. Error Handling (Rollback if server says no)
    if (!result || result.status === 'error') {
        console.error("Server rejected the vibe check.");
        // Revert UI
        const revertStatus = !newStatus;
        if (revertStatus) {
            cell.classList.replace('unavailable', 'available');
            if (!STATE.availabilityCache.includes(dateStr)) STATE.availabilityCache.push(dateStr);
        } else {
            cell.classList.replace('available', 'unavailable');
            STATE.availabilityCache = STATE.availabilityCache.filter(d => d !== dateStr);
        }
        alert("Something went wrong saving your date. Try again?");
    }
}

// Start the show
document.addEventListener('DOMContentLoaded', init);
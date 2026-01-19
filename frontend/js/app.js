/**
 * KUZCO FRONTEND
 * Crafted by Coco 💅
 * Now featuring 100% more Llama
 */

const STATE = {
    currentDate: new Date(),
    currentUser: null,
    activeTab: 'personal',
    availabilityCache: [],
    aggregateCache: []
};

const DOM = {
    monthDisplay: document.getElementById('current-month-display'),
    grid: document.getElementById('calendar-grid'),
    prevBtn: document.getElementById('prev-month'),
    nextBtn: document.getElementById('next-month'),
    tabs: document.querySelectorAll('.tab-btn'),
    userBadge: document.getElementById('user-badge'),
    quoteText: document.getElementById('kuzco-quote'),
    quoteAuthor: document.querySelector('.quote-box small')
};

const KUZCO_QUOTES = [
    "Boom, baby!",
    "No touchy!",
    "It's all about me.",
    "Yay, I'm a llama again! ...Wait.",
    "You threw off my groove!"
];

const THE_POISON_QUOTE = "Oh, right. The poison. The poison for Kuzco, the poison chosen especially to kill Kuzco, Kuzco's poison. That poison?";

/**
 * Helper: Update Quote and Author
 */
function setQuote(text, author) {
    DOM.quoteText.textContent = text;
    if (DOM.quoteAuthor) {
        DOM.quoteAuthor.textContent = `- ${author}`;
    }
}

/**
 * 1. API HELPERS
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
        setQuote(THE_POISON_QUOTE, "Kronk");
        return null;
    }
}

/**
 * 2. INITIALIZATION
 */
async function init() {
    displayRandomQuote();

    const user = await fetchWithAuth('/users/me');
    if (user) {
        STATE.currentUser = user;
        DOM.userBadge.textContent = `Hi, ${user.display_name}`;
    }

    DOM.prevBtn.addEventListener('click', () => changeMonth(-1));
    DOM.nextBtn.addEventListener('click', () => changeMonth(1));
    
    DOM.tabs.forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    document.getElementById('app-title').addEventListener('click', () => {
        setQuote(THE_POISON_QUOTE, "Kronk");
    });

    renderHeader();
    await loadDataAndRender();
}

function displayRandomQuote() {
    const randomIndex = Math.floor(Math.random() * KUZCO_QUOTES.length);
    setQuote(KUZCO_QUOTES[randomIndex], "Emperor Kuzco");
}

/**
 * 3. CORE LOGIC
 */
function changeMonth(delta) {
    STATE.currentDate.setMonth(STATE.currentDate.getMonth() + delta);
    renderHeader();
    loadDataAndRender();
}

function renderHeader() {
    const options = { month: 'long', year: 'numeric' };
    DOM.monthDisplay.textContent = STATE.currentDate.toLocaleDateString('en-US', options);
}

function switchTab(tabName) {
    STATE.activeTab = tabName;
    
    DOM.tabs.forEach(btn => {
        if (btn.dataset.tab === tabName) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    loadDataAndRender();
}

/**
 * 4. DATA LOADING
 */
async function loadDataAndRender() {
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
 */
function renderCalendar() {
    DOM.grid.innerHTML = ''; 

    const year = STATE.currentDate.getFullYear();
    const month = STATE.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Spacer Cells
    for (let i = 0; i < firstDay; i++) {
        const spacer = document.createElement('div');
        spacer.className = 'day-cell empty';
        DOM.grid.appendChild(spacer);
    }

    // Actual Days
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

function formatDateString(year, month, day) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
}

/**
 * LOGIC: Personal Tab
 */
function renderPersonalDay(cell, dateStr) {
    const isInitiallyAvailable = STATE.availabilityCache.includes(dateStr);
    cell.className = `day-cell ${isInitiallyAvailable ? 'available' : 'unavailable'}`;
    
    cell.addEventListener('click', () => {
        const isCurrentlyAvailable = STATE.availabilityCache.includes(dateStr);
        toggleAvailability(cell, dateStr, !isCurrentlyAvailable);
    });
}

/**
 * LOGIC: Aggregate Tab (The Heatmap)
 */
function renderAggregateDay(cell, dateStr) {
    const dayData = STATE.aggregateCache.find(item => item.date === dateStr);
    let heatClass = 'heat-0'; 

    // We need to keep a reference to available users
    let availableUsers = [];

    if (dayData) {
        const count = dayData.count;
        const total = dayData.total_active_users;
        availableUsers = dayData.available_users || [];

        if (count === total) heatClass = 'heat-3';      
        else if (count >= 2) heatClass = 'heat-2';      
        else if (count > 0)  heatClass = 'heat-1';      
    }
    cell.className = `day-cell ${heatClass}`;

    // ADDED: The Initials Logic
    // Only show initials if:
    // 1. Someone is free (heat-1 or heat-2)
    // 2. Not EVERYONE is free (heat-3 is already green, no need to clutter it)
    if ((heatClass === 'heat-1' || heatClass === 'heat-2') && availableUsers.length > 0) {
        const container = document.createElement('div');
        container.className = 'initials-container';
        
        availableUsers.forEach(name => {
            const span = document.createElement('span');
            span.className = 'user-initial';
            span.textContent = name.charAt(0); // First letter only
            container.appendChild(span);
        });
        
        cell.appendChild(container);
    }
}

/**
 * 6. INTERACTION
 */
async function toggleAvailability(cell, dateStr, newStatus) {
    if (newStatus) {
        cell.classList.replace('unavailable', 'available');
        if (!STATE.availabilityCache.includes(dateStr)) STATE.availabilityCache.push(dateStr);
    } else {
        cell.classList.replace('available', 'unavailable');
        STATE.availabilityCache = STATE.availabilityCache.filter(d => d !== dateStr);
    }

    const result = await fetchWithAuth('/availability', {
        method: 'POST',
        body: JSON.stringify({ date: dateStr, available: newStatus })
    });

    if (!result || result.status === 'error') {
        console.error("Server rejected the vibe check.");
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

document.addEventListener('DOMContentLoaded', init);
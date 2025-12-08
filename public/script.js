// Preloaded events (fallback if bin empty)
const preloadedEvents = [
  {symbol:"AVGO", name:"Broadcom Inc.", date:"2025-09-04", time:"Est. (After close)", domain:"broadcom.com"},
  {symbol:"TSM",  name:"TSMC (Taiwan Semiconductor)", date:"2025-10-16", time:"Before market open", domain:"tsmc.com"},
  {symbol:"AMD",  name:"Advanced Micro Devices", date:"2025-11-04", time:"After market close", domain:"amd.com"},
  {symbol:"AAPL", name:"Apple Inc.", date:"2025-11-05", time:"After market close", domain:"apple.com"},
  {symbol:"SNOW", name:"Snowflake Inc.", date:"2025-11-07", time:"After market close", domain:"snowflake.com"},
  {symbol:"AGO",  name:"Assured Guaranty Ltd.", date:"2025-11-10", time:"Estimated", domain:"assuredguaranty.com"},
  {symbol:"PYPL", name:"PayPal Holdings, Inc.", date:"2025-11-12", time:"TBD", domain:"paypal.com"},
  {symbol:"NVDA", name:"NVIDIA Corporation", date:"2025-11-19", time:"After market close", domain:"nvidia.com"}
];

let events = []; // will be populated from backend or fallback to preloaded
const eventMap = {};
function rebuildMap() {
  Object.keys(eventMap).forEach(k=> delete eventMap[k]);
  for (const ev of events) {
    if (!eventMap[ev.date]) eventMap[ev.date] = [];
    eventMap[ev.date].push(ev);
  }
  for (const d of Object.keys(eventMap)) {
    eventMap[d].sort((a,b)=> a.symbol.localeCompare(b.symbol));
  }
}

let viewDate = new Date();

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function formatMonthYear(d) { return d.toLocaleString(undefined, {month:'long', year:'numeric'}); }
function ymd(dateStr) { const [y,m,d] = dateStr.split('-').map(Number); return new Date(y,m-1,d); }

const grid = document.getElementById('calendarGrid');
const monthLabel = document.getElementById('monthLabel');
const tooltip = document.getElementById('tooltip');
const toastContainer = document.getElementById('toastContainer');

function renderCalendar(date) {
  grid.innerHTML = '';
  const first = startOfMonth(date);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const totalCells = 42;
  monthLabel.textContent = formatMonthYear(first);

  for (let i=0; i<totalCells; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const y = day.getFullYear(), m = day.getMonth()+1, d = String(day.getDate()).padStart(2,'0');
    const iso = `${y}-${String(m).padStart(2,'0')}-${d}`;

    const cell = document.createElement('div');
    cell.className = 'cell';
    if (day.getMonth() !== first.getMonth()) cell.classList.add('other-month');

    const dateNum = document.createElement('div');
    dateNum.className = 'date-num';
    dateNum.textContent = day.getDate();
    cell.appendChild(dateNum);

    const evWrap = document.createElement('div');
    evWrap.className = 'events';

    const evs = eventMap[iso] || [];
    evs.forEach(ev => {
      const evEl = document.createElement('div');
      evEl.className = 'ev';

      const logoUrl = `https://logo.clearbit.com/${ev.domain}`;
      const img = document.createElement('img');
      img.src = logoUrl;
      img.alt = ev.symbol;
      img.onerror = () => {
        img.src = `data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\"><rect fill=\"%23f3f4f6\" width=\"100%\" height=\"100%\"/><text x=\"50%\" y=\"55%\" font-size=\"10\" text-anchor=\"middle\" fill=\"%234b5563\" font-family=\"Arial\" dy=\".3em\">${ev.symbol}</text></svg>`;
      };

      const txt = document.createElement('div');
      txt.style.display = 'flex';
      txt.style.flexDirection = 'column';

      const line1 = document.createElement('div');
      line1.className = 't';
      line1.textContent = ev.symbol;
      txt.appendChild(line1);

      if (window.innerWidth > 420) {
        const small = document.createElement('div');
        small.className = 's';
        small.textContent = ev.time;
        txt.appendChild(small);
      }

      evEl.appendChild(img);
      evEl.appendChild(txt);

      evEl.addEventListener('mouseenter', (e) => {
        tooltip.style.display = 'block';
        tooltip.innerHTML = `<strong>${ev.name} (${ev.symbol})</strong><br>${ev.date} · ${ev.time}`;
        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = (rect.right + 10) + 'px';
        tooltip.style.top = (rect.top) + 'px';
        tooltip.setAttribute('aria-hidden','false');
      });
      evEl.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
        tooltip.setAttribute('aria-hidden','true');
      });

      evWrap.appendChild(evEl);
    });

    cell.appendChild(evWrap);
    grid.appendChild(cell);
  }
}

document.getElementById('prev').addEventListener('click', () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1);
  renderCalendar(viewDate);
});
document.getElementById('next').addEventListener('click', () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1);
  renderCalendar(viewDate);
});
document.getElementById('today').addEventListener('click', () => {
  viewDate = new Date();
  renderCalendar(viewDate);
});

function showToast(type, text) {
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || 'success');
  toast.innerHTML = `<div class="icon">${type==='success'?'✓': type==='fallback' ? '⚑' : '!'}</div><div class="msg">${text}</div>`;
  toastContainer.appendChild(toast);
  requestAnimationFrame(()=> toast.classList.add('show'));
  setTimeout(()=> {
    toast.classList.remove('show');
    setTimeout(()=> toast.remove(), 300);
  }, 3200);
}

// UPDATED: Use your backend endpoint instead of calling APIs directly
async function fetchEarningsForTicker(ticker) {
  console.log(`[FETCH START] Fetching earnings for ${ticker} via backend...`);
  
  try {
    const url = `/api/fetchEarnings?symbol=${ticker}`;
    console.log(`[FETCH] Calling: ${url}`);
    
    const response = await fetch(url);
    console.log(`[FETCH] Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FETCH] Error response (${response.status}):`, errorText);
      
      if (response.status === 404) {
        showToast('error', `Endpoint not found - check your API setup`);
      } else if (response.status === 429) {
        showToast('error', 'Rate limit reached - try again later');
      } else if (response.status === 500) {
        showToast('error', `Server error: ${errorText.substring(0, 100)}`);
      } else {
        showToast('error', `Failed to fetch ${ticker} (${response.status})`);
      }
      return null;
    }
    
    const data = await response.json();
    console.log(`[FETCH] Response data:`, data);
    
    // Check if backend returned an error
    if (data.error) {
      console.error(`[FETCH] Backend error:`, data.error);
      showToast('error', `Error: ${data.error}`);
      return null;
    }
    
    // Check if we got earnings data
    if (data.date) {
      console.log(`[FETCH] ✅ Success! Found earnings data for ${ticker}`);
      showToast('success', `Found earnings for ${ticker}`);
      return data;
    } else {
      console.warn(`[FETCH] No earnings data in response`);
      showToast('error', `No earnings data found for ${ticker}`);
      return null;
    }
    
  } catch (e) {
    console.error('[FETCH] Exception:', e);
    showToast('error', `Network error: ${e.message}`);
    return null;
  }
}

// Backend endpoints for JSONBin persistence
const API_EVENTS = '/api/events';

// Load events from backend
async function loadEventsFromBackend() {
  console.log('[BACKEND] Loading events from backend...');
  try {
    const r = await fetch(API_EVENTS);
    console.log(`[BACKEND] Load response status: ${r.status}`);
    
    if (r.ok) {
      const j = await r.json();
      console.log('[BACKEND] Loaded events:', j);
      if (Array.isArray(j)) {
        events = j;
        rebuildMap();
        console.log('[BACKEND] ✅ Successfully loaded events from backend');
        return true;
      } else {
        console.warn('[BACKEND] Response is not an array:', j);
      }
    } else {
      const errorText = await r.text();
      console.warn(`[BACKEND] Load failed with status ${r.status}:`, errorText);
      showToast('fallback', 'Using preloaded events (backend unavailable)');
    }
  } catch (e) {
    console.error('[BACKEND] Load exception:', e);
    showToast('fallback', `Using preloaded events (${e.message})`);
  }
  return false;
}

// Save full events array to backend (PUT)
async function saveEventsToBackend(allEvents) {
  console.log('[BACKEND] Saving events to backend:', allEvents);
  try {
    const r = await fetch(API_EVENTS, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({events: allEvents})
    });
    console.log(`[BACKEND] Save response status: ${r.status}`);
    
    if (r.ok) {
      const j = await r.json();
      console.log('[BACKEND] Save response:', j);
      return j;
    } else {
      const errorText = await r.text();
      console.error(`[BACKEND] Save failed with status ${r.status}:`, errorText);
      showToast('error', `Failed to save (${r.status})`);
    }
  } catch (e) {
    console.error('[BACKEND] Save exception:', e);
    showToast('error', `Save failed: ${e.message}`);
  }
  return null;
}

// Add event via backend (POST)
async function postEventToBackend(ev) {
  console.log('[BACKEND] Posting event to backend:', ev);
  try {
    const r = await fetch(API_EVENTS, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(ev)
    });
    console.log(`[BACKEND] Post response status: ${r.status}`);
    
    if (r.ok) {
      const j = await r.json();
      console.log('[BACKEND] Post response:', j);
      return j;
    } else {
      const errorText = await r.text();
      console.error(`[BACKEND] Post failed with status ${r.status}:`, errorText);
      showToast('error', `Failed to add event (${r.status})`);
    }
  } catch (e) {
    console.error('[BACKEND] Post exception:', e);
    showToast('error', `Failed to save: ${e.message}`);
  }
  return null;
}

// Input validation
function validateTicker(ticker) {
  if (!ticker) {
    showToast('error', 'Please enter a ticker symbol');
    return false;
  }
  if (!/^[A-Z]{1,5}$/.test(ticker)) {
    showToast('error', 'Invalid ticker format (use 1-5 letters, e.g., AAPL)');
    return false;
  }
  return true;
}

function guessDomain(ticker){
  const map = {
    'AAPL':'apple.com','NVDA':'nvidia.com','AMD':'amd.com','TSM':'tsmc.com',
    'AVGO':'broadcom.com','SNOW':'snowflake.com','PYPL':'paypal.com','AGO':'assuredguaranty.com'
  };
  return map[ticker] || (ticker.toLowerCase() + '.com');
}

// UPDATED: Simplified add button logic using backend endpoint
document.getElementById('addBtn').addEventListener('click', async () => {
  console.log('\n========== ADD BUTTON CLICKED ==========');
  const tickerInput = document.getElementById('tickerInput');
  const addBtn = document.getElementById('addBtn');
  const ticker = tickerInput.value.trim().toUpperCase();
  
  console.log(`[ADD] Ticker input: "${ticker}"`);
  
  // Validation
  if (!validateTicker(ticker)) {
    console.log('[ADD] Validation failed');
    return;
  }
  
  console.log('[ADD] Validation passed');
  
  // Set loading state
  addBtn.disabled = true;
  const originalText = addBtn.textContent;
  addBtn.textContent = 'Loading...';
  addBtn.style.opacity = '0.6';
  addBtn.style.cursor = 'not-allowed';
  
  try {
    console.log('[ADD] Fetching earnings data from backend...');
    const earningsData = await fetchEarningsForTicker(ticker);
    console.log('[ADD] Earnings data received:', earningsData);
    
    if (!earningsData || !earningsData.date) {
      console.log('[ADD] No valid earnings data, prompting for manual entry...');
      const manual = prompt(`Could not fetch earnings automatically for ${ticker}. Enter date manually (YYYY-MM-DD) or Cancel:`);
      if (!manual) {
        console.log('[ADD] User cancelled manual entry');
        showToast('error', `Cancelled adding ${ticker}`);
        return;
      }
      
      // Create manual event
      const iso = manual.trim();
      console.log('[ADD] User entered manual date:', iso);
      const domain = guessDomain(ticker);
      const newEv = {symbol:ticker, name:ticker, date:iso, time:'TBD', domain:domain};
      console.log('[ADD] Created manual event object:', newEv);
      
      console.log('[ADD] Posting manual event to backend...');
      const res = await postEventToBackend(newEv);
      console.log('[ADD] Backend post result:', res);
      
      if (res && Array.isArray(res)) {
        console.log('[ADD] ✅ Successfully added manual entry');
        events = res;
        rebuildMap();
        renderCalendar(viewDate);
        tickerInput.value = '';
        showToast('success', `Manually added ${ticker}`);
        return;
      } else {
        // Local fallback
        events.push(newEv);
        rebuildMap();
        renderCalendar(viewDate);
        tickerInput.value = '';
        showToast('error', 'Added locally (backend failed)');
        console.log('[ADD] ⚠️ Added locally due to backend failure');
        return;
      }
    }
    
    // We have earnings data from the API
    const domain = guessDomain(ticker);
    const newEv = {
      symbol: ticker,
      name: earningsData.name || ticker,
      date: earningsData.date,
      time: earningsData.time || 'TBD',
      domain: domain
    };
    console.log('[ADD] Created event object from API data:', newEv);
    
    console.log('[ADD] Posting event to backend...');
    const res = await postEventToBackend(newEv);
    console.log('[ADD] Backend post result:', res);
    
    if (res && Array.isArray(res)) {
      console.log('[ADD] ✅ Successfully added via backend');
      events = res;
      rebuildMap();
      renderCalendar(viewDate);
      tickerInput.value = '';
      return;
    } else {
      // Local fallback
      console.log('[ADD] Backend failed, adding locally...');
      events.push(newEv);
      rebuildMap();
      renderCalendar(viewDate);
      tickerInput.value = '';
      showToast('error', 'Added locally (backend save failed)');
      console.log('[ADD] ⚠️ Added locally due to backend failure');
    }
    
  } catch (error) {
    console.error('[ADD] ❌ Unexpected error:', error);
    console.error('[ADD] Error stack:', error.stack);
    showToast('error', `Unexpected error: ${error.message} (check console)`);
  } finally {
    console.log('[ADD] Restoring button state...');
    addBtn.disabled = false;
    addBtn.textContent = originalText;
    addBtn.style.opacity = '1';
    addBtn.style.cursor = 'pointer';
    console.log('========== ADD COMPLETE ==========\n');
  }
});

// Initialize
(async function init(){
  console.log('\n========== INITIALIZATION START ==========');
  
  // Show loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loading-overlay';
  loadingDiv.innerHTML = '<div style="text-align:center;padding:40px;font-size:18px;">Loading events...</div>';
  document.body.appendChild(loadingDiv);
  
  try {
    console.log('[INIT] Attempting to load events from backend...');
    const ok = await loadEventsFromBackend();
    console.log('[INIT] Backend load result:', ok);
    
    if (!ok) {
      console.log('[INIT] Using preloaded events as fallback');
      events = preloadedEvents.slice();
      rebuildMap();
    }
    
    console.log('[INIT] Current events array:', events);
    
    if (events.length){
      const min = events.reduce((a,b)=> a.date < b.date ? a : b).date;
      const dt = ymd(min);
      viewDate = new Date(dt.getFullYear(), dt.getMonth(), 1);
      console.log('[INIT] Set view date to earliest event:', viewDate);
    }
    
    console.log('[INIT] Rendering calendar...');
    renderCalendar(viewDate);
    console.log('[INIT] ✅ Calendar rendered successfully');
    
  } catch (error) {
    console.error('[INIT] ❌ Initialization error:', error);
    console.error('[INIT] Error stack:', error.stack);
    showToast('error', `Failed to initialize: ${error.message}`);
    
    // Use preloaded events as fallback
    console.log('[INIT] Falling back to preloaded events...');
    events = preloadedEvents.slice();
    rebuildMap();
    renderCalendar(viewDate);
    
  } finally {
    console.log('[INIT] Removing loading overlay...');
    loadingDiv.remove();
    console.log('========== INITIALIZATION COMPLETE ==========\n');
  }
})();

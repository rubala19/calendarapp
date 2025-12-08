// Alpha Vantage key (fallback)
const ALPHA_VANTAGE_KEY = "8NS6OXY29LA15EEF";

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

// IMPROVED: Better error handling with detailed logging
async function fetchEarningsForTicker(ticker) {
  console.log(`[FETCH START] Attempting to fetch earnings for: ${ticker}`);
  
  // MarketData.app
  try {
    console.log(`[MARKETDATA] Calling MarketData.app API...`);
    const mdUrl = `https://api.marketdata.app/v1/stocks/earnings/${ticker}`;
    const r = await fetch(mdUrl);
    console.log(`[MARKETDATA] Response status: ${r.status}`);
    
    if (r.ok) {
      const data = await r.json();
      console.log(`[MARKETDATA] Response data:`, data);
      
      if (data && data.reportDate && data.reportDate.length>0) {
        console.log(`[MARKETDATA] ✅ Success! Found earnings data for ${ticker}`);
        showToast('success', `Fetched ${ticker} from MarketData`);
        return {source:'marketdata', data};
      } else {
        console.log(`[MARKETDATA] No reportDate in response`);
      }
    } else {
      const errorText = await r.text();
      console.warn(`[MARKETDATA] Failed with status ${r.status}:`, errorText);
      if (r.status === 429) {
        showToast('error', 'Rate limit reached on MarketData API');
      } else if (r.status === 404) {
        console.log(`[MARKETDATA] ${ticker} not found, trying fallback...`);
      }
    }
  } catch (e) {
    console.error('[MARKETDATA] Exception:', e);
    showToast('fallback', `MarketData unavailable, trying backup...`);
  }

  // Alpha Vantage fallback
  try {
    console.log(`[ALPHAVANTAGE] Calling Alpha Vantage API...`);
    const avUrl = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`;
    const r2 = await fetch(avUrl);
    console.log(`[ALPHAVANTAGE] Response status: ${r2.status}`);
    
    if (r2.ok) {
      const d2 = await r2.json();
      console.log(`[ALPHAVANTAGE] Response data:`, d2);
      
      // Check for API error responses
      if (d2.Note) {
        console.warn('[ALPHAVANTAGE] Rate limit note:', d2.Note);
        showToast('error', 'Alpha Vantage API rate limit reached');
        return null;
      }
      if (d2.Error || d2['Error Message']) {
        console.error('[ALPHAVANTAGE] API Error:', d2.Error || d2['Error Message']);
        showToast('error', `Alpha Vantage error: ${d2.Error || d2['Error Message']}`);
        return null;
      }
      
      let parsed = null;
      if (d2 && Array.isArray(d2.earningsCalendar) && d2.earningsCalendar.length>0) parsed = d2.earningsCalendar[0];
      else if (d2 && Array.isArray(d2) && d2.length>0) parsed = d2[0];
      else if (d2 && d2[0]) parsed = d2[0];
      
      if (parsed) {
        console.log(`[ALPHAVANTAGE] ✅ Success! Parsed data:`, parsed);
        showToast('fallback', `Fetched ${ticker} from Alpha Vantage`);
        return {source:'alphavantage', data:parsed};
      } else {
        console.log('[ALPHAVANTAGE] Could not parse earnings data from response');
      }
    } else {
      const errorText = await r2.text();
      console.error(`[ALPHAVANTAGE] Failed with status ${r2.status}:`, errorText);
      showToast('error', `Alpha Vantage returned error ${r2.status}`);
    }
  } catch (e) {
    console.error('[ALPHAVANTAGE] Exception:', e);
    showToast('error', `Alpha Vantage unavailable: ${e.message}`);
  }

  // both failed
  console.error(`[FETCH END] Could not find earnings data for ${ticker} from any source`);
  showToast('error', `Could not find earnings data for ${ticker}`);
  return null;
}

// Backend endpoints for JSONBin persistence
const API_EVENTS = '/api/events';

// IMPROVED: Better error handling with detailed logging
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

// IMPROVED: Detailed logging for save operations
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
      showToast('error', `Failed to save events (${r.status}): ${errorText.substring(0, 100)}`);
    }
  } catch (e) {
    console.error('[BACKEND] Save exception:', e);
    showToast('error', `Save failed: ${e.message}`);
  }
  return null;
}

// IMPROVED: Detailed logging for post operations
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
      showToast('error', `Failed to add event (${r.status}): ${errorText.substring(0, 100)}`);
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

// IMPROVED: Detailed step-by-step logging
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
    console.log('[ADD] Fetching earnings data...');
    const fetched = await fetchEarningsForTicker(ticker);
    console.log('[ADD] Fetch result:', fetched);
    
    let newEv = null;
    
    if (fetched && fetched.source==='marketdata') {
      console.log('[ADD] Processing MarketData response...');
      const data = fetched.data;
      const nextDateUnix = data.reportDate[0];
      const nextDate = new Date(nextDateUnix * 1000);
      const y = nextDate.getFullYear(), m = String(nextDate.getMonth()+1).padStart(2,'0'), d = String(nextDate.getDate()).padStart(2,'0');
      const iso = `${y}-${m}-${d}`;
      const time = (data.reportTime && data.reportTime[0]) ? data.reportTime[0] : 'TBD';
      const domain = guessDomain(ticker);
      newEv = {symbol:ticker,name:ticker,date:iso,time:time,domain:domain};
      console.log('[ADD] Created event object:', newEv);
      
      console.log('[ADD] Posting to backend...');
      const res = await postEventToBackend(newEv);
      console.log('[ADD] Backend post result:', res);
      
      if (res && Array.isArray(res)) {
        console.log('[ADD] ✅ Successfully added via MarketData -> backend');
        events = res;
        rebuildMap();
        renderCalendar(viewDate);
        tickerInput.value = '';
        return;
      } else {
        console.warn('[ADD] Backend post did not return array');
      }
      
    } else if (fetched && fetched.source==='alphavantage') {
      console.log('[ADD] Processing AlphaVantage response...');
      const d = fetched.data;
      let iso = null, time='TBD';
      
      if (d.reportDate) {
        const dt = new Date(Number(d.reportDate)*1000);
        iso = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      } else if (d.reportDateLocal) {
        iso = d.reportDateLocal.split('T')[0];
      } else if (d.date) {
        iso = d.date;
      } else if (d.fiscalDateEnding) {
        iso = d.fiscalDateEnding;
      } else if (d.reportDateString) {
        iso = d.reportDateString;
      }
      
      console.log('[ADD] Parsed date:', iso);
      
      if (!iso) {
        console.log('[ADD] Could not parse date, prompting user...');
        const manual = prompt(`Alpha Vantage returned data but I couldn't parse the date for ${ticker}. Enter date manually (YYYY-MM-DD):`);
        if (!manual) { 
          console.log('[ADD] User cancelled date input');
          showToast('error', `No date provided for ${ticker}`); 
          return; 
        }
        iso = manual.trim();
        console.log('[ADD] User entered date:', iso);
      }
      
      const domain = guessDomain(ticker);
      newEv = {symbol:ticker,name:ticker,date:iso,time:time,domain:domain};
      console.log('[ADD] Created event object:', newEv);
      
      console.log('[ADD] Posting to backend...');
      const res = await postEventToBackend(newEv);
      console.log('[ADD] Backend post result:', res);
      
      if (res && Array.isArray(res)) {
        console.log('[ADD] ✅ Successfully added via AlphaVantage -> backend');
        events = res;
        rebuildMap();
        renderCalendar(viewDate);
        tickerInput.value = '';
        return;
      } else {
        console.warn('[ADD] Backend post did not return array');
      }
      
    } else {
      console.log('[ADD] No data from APIs, prompting for manual entry...');
      const manual = prompt(`Could not fetch earnings automatically for ${ticker}. Enter date manually (YYYY-MM-DD) or Cancel:`);
      if (manual) {
        const iso = manual.trim();
        console.log('[ADD] User entered manual date:', iso);
        const domain = guessDomain(ticker);
        newEv = {symbol:ticker,name:ticker,date:iso,time:'TBD',domain:domain};
        console.log('[ADD] Created manual event object:', newEv);
        
        console.log('[ADD] Posting to backend...');
        const res = await postEventToBackend(newEv);
        console.log('[ADD] Backend post result:', res);
        
        if (res && Array.isArray(res)) {
          console.log('[ADD] ✅ Successfully added manual entry -> backend');
          events = res;
          rebuildMap();
          renderCalendar(viewDate);
          tickerInput.value = '';
          showToast('success', `Manually added ${ticker}`);
          return;
        } else {
          console.warn('[ADD] Backend post did not return array');
        }
      } else {
        console.log('[ADD] User cancelled manual entry');
        showToast('error', `Cancelled adding ${ticker}`);
        return;
      }
    }

    // If backend failed, fall back to local add
    if (newEv) {
      console.log('[ADD] Backend failed, adding locally...');
      events.push(newEv);
      rebuildMap();
      renderCalendar(viewDate);
      tickerInput.value = '';
      showToast('error', 'Added locally (backend save failed, check console)');
      console.log('[ADD] ⚠️ Added locally due to backend failure');
    } else {
      console.error('[ADD] ❌ No event was created - this should not happen!');
      showToast('error', 'Failed to create event - check console for details');
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

function guessDomain(ticker){
  const map = {
    'AAPL':'apple.com','NVDA':'nvidia.com','AMD':'amd.com','TSM':'tsmc.com',
    'AVGO':'broadcom.com','SNOW':'snowflake.com','PYPL':'paypal.com','AGO':'assuredguaranty.com'
  };
  return map[ticker] || (ticker.toLowerCase() + '.com');
}

// IMPROVED: Detailed initialization logging
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

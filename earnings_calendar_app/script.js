// Preloaded events
const events = [
  {symbol:"AVGO", name:"Broadcom Inc.", date:"2025-09-04", time:"Est. (After close)", domain:"broadcom.com"},
  {symbol:"TSM",  name:"TSMC (Taiwan Semiconductor)", date:"2025-10-16", time:"Before market open", domain:"tsmc.com"},
  {symbol:"AMD",  name:"Advanced Micro Devices", date:"2025-11-04", time:"After market close", domain:"amd.com"},
  {symbol:"AAPL", name:"Apple Inc.", date:"2025-11-05", time:"After market close", domain:"apple.com"},
  {symbol:"SNOW", name:"Snowflake Inc.", date:"2025-11-07", time:"After market close", domain:"snowflake.com"},
  {symbol:"AGO",  name:"Assured Guaranty Ltd.", date:"2025-11-10", time:"Estimated", domain:"assuredguaranty.com"},
  {symbol:"PYPL", name:"PayPal Holdings, Inc.", date:"2025-11-12", time:"TBD", domain:"paypal.com"},
  {symbol:"NVDA", name:"NVIDIA Corporation", date:"2025-11-19", time:"After market close", domain:"nvidia.com"}
];

const eventMap = {};
function rebuildMap() {
  // clear and rebuild map
  Object.keys(eventMap).forEach(k=> delete eventMap[k]);
  for (const ev of events) {
    if (!eventMap[ev.date]) eventMap[ev.date] = [];
    eventMap[ev.date].push(ev);
  }
  for (const d of Object.keys(eventMap)) {
    eventMap[d].sort((a,b)=> a.symbol.localeCompare(b.symbol));
  }
}
rebuildMap();

let viewDate = new Date();

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function formatMonthYear(d) { return d.toLocaleString(undefined, {month:'long', year:'numeric'}); }
function ymd(dateStr) { const [y,m,d] = dateStr.split('-').map(Number); return new Date(y,m-1,d); }

const grid = document.getElementById('calendarGrid');
const monthLabel = document.getElementById('monthLabel');
const tooltip = document.getElementById('tooltip');

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
        img.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="%23f3f4f6" width="100%" height="100%"/><text x="50%" y="55%" font-size="10" text-anchor="middle" fill="%234b5563" font-family="Arial" dy=".3em">${ev.symbol}</text></svg>`;
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

// Add event button logic: fetch earnings date from MarketData.app (no key required)
// If the fetch fails, user can manually enter date in a prompt as fallback.
document.getElementById('addBtn').addEventListener('click', async () => {
  const ticker = document.getElementById('tickerInput').value.trim().toUpperCase();
  if (!ticker) {
    alert('Please input a ticker symbol.');
    return;
  }
  try {
    // MarketData.app endpoint (public)
    const apiUrl = `https://api.marketdata.app/v1/stocks/earnings/${ticker}`;
    const resp = await fetch(apiUrl);
    if (!resp.ok) throw new Error('API fetch failed: ' + resp.status);
    const data = await resp.json();
    // data.reportDate expected as array of epoch seconds
    if (!data.reportDate || data.reportDate.length === 0) {
      throw new Error('No earnings data found from API');
    }
    const nextDateUnix = data.reportDate[0];
    const nextDate = new Date(nextDateUnix * 1000);
    const y = nextDate.getFullYear(),
          m = String(nextDate.getMonth()+1).padStart(2, '0'),
          d = String(nextDate.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    const time = (data.reportTime && data.reportTime[0]) ? data.reportTime[0] : 'TBD';
    // guess domain for Clearbit logo
    const domain = guessDomain(ticker);

    const newEv = {
      symbol: ticker,
      name: ticker,
      date: iso,
      time: time,
      domain: domain
    };
    events.push(newEv);
    rebuildMap();
    renderCalendar(viewDate);
    alert(`Added ${ticker} on ${iso} (${time})`);
  } catch (err) {
    console.error(err);
    // fallback: let user enter date manually
    const manual = prompt('Could not fetch earnings automatically. Enter date manually (YYYY-MM-DD) or Cancel:');
    if (manual) {
      const iso = manual.trim();
      const domain = guessDomain(ticker);
      const newEv = {symbol:ticker,name:ticker,date:iso,time:'TBD',domain:domain};
      events.push(newEv);
      rebuildMap();
      renderCalendar(viewDate);
      alert(`Added ${ticker} on ${iso} (manual)`);
    } else {
      alert('No event added.');
    }
  }
});

function guessDomain(ticker){
  // simple heuristics map for common tickers (extendable)
  const map = {
    'AAPL':'apple.com','NVDA':'nvidia.com','AMD':'amd.com','TSM':'tsmc.com',
    'AVGO':'broadcom.com','SNOW':'snowflake.com','PYPL':'paypal.com','AGO':'assuredguaranty.com'
  };
  return map[ticker] || (ticker.toLowerCase() + '.com');
}

(function init(){
  if (events.length){
    const min = events.reduce((a,b)=> a.date < b.date ? a : b).date;
    const dt = ymd(min);
    viewDate = new Date(dt.getFullYear(), dt.getMonth(), 1);
  }
  rebuildMap();
  renderCalendar(viewDate);
})();

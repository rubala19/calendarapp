import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'react-calendar/dist/Calendar.css';
import toast from 'react-hot-toast';

const Calendar = dynamic(() => import('react-calendar'), { ssr: false });

export default function Home() {
  const [events, setEvents] = useState([]);
  const [symbol, setSymbol] = useState('');
  const [date, setDate] = useState(new Date());
  const debug = process.env.NEXT_PUBLIC_DEBUG === 'true';
  
  useEffect(() => {
    loadEvents();
  }, []);
  
  async function loadEvents() {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();
      setEvents(data || []);
      if (debug) console.log('[Client] Loaded events:', data);
    } catch (err) {
      console.error('Load events error', err);
      toast.error('Failed to load events');
    }
  }
  
  async function addEvent() {
    if (!symbol) { toast.error('Enter ticker'); return; }
    
    // FIXED: Changed backticks to parentheses
    toast.loading(`Fetching ${symbol}...`, { id: 'fetch' });
    
    try {
      // FIXED: Changed backticks to parentheses
      const r = await fetch(`/api/fetchEarnings?symbol=${encodeURIComponent(symbol)}`);
      const j = await r.json();
      toast.dismiss('fetch');
      
      if (!r.ok) {
        console.error('fetchEarnings failed', j);
        toast.error(j.error || 'No earnings found');
        return;
      }
      
      const payload = { symbol: j.symbol, date: j.date || j.nextEarnings };
      const post = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const pj = await post.json();
      
      if (!post.ok) {
        toast.error(pj.error || 'Failed to save event');
        return;
      }
      
      // FIXED: Changed backticks to parentheses
      toast.success(`${payload.symbol} added ${payload.date}`);
      setSymbol('');
      await loadEvents();
    } catch (err) {
      toast.dismiss('fetch');
      console.error('Add event error', err);
      toast.error('Error adding event');
    }
  }
  
  function tileContent({ date: d, view }) {
    if (view !== 'month') return null;
    const matches = events.filter(e => new Date(e.date).toDateString() === d.toDateString());
    if (!matches.length) return null;
    
    return (
      <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:4 }}>
        {matches.slice(0,3).map((m,i) => 
          <div key={i} style={{ background:'#06263a', padding:'4px 6px', borderRadius:6, color:'#9fe8ff', fontWeight:700, fontSize:12 }}>
            {m.symbol}
          </div>
        )}
      </div>
    );
  }
  
  function onClickDay(d) {
    const matches = events.filter(e => new Date(e.date).toDateString() === d.toDateString());
    if (matches.length) {
      // FIXED: Changed backticks to parentheses
      toast.success(`Earnings: ${matches.map(m=>m.symbol).join(', ')}`);
    } else {
      toast('No earnings on this date');
    }
  }
  
  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>Earnings Calendar</h1>
          <div style={{color:'#9aa3b2'}}>Dark calendar • AlphaVantage • JSONBin persistence</div>
        </div>
        <div className="controls">
          <input 
            value={symbol} 
            onChange={e=>setSymbol(e.target.value.toUpperCase())} 
            placeholder="Ticker e.g. NVDA" 
          />
          <button className="primary" onClick={addEvent}>Add / Fetch</button>
        </div>
      </div>
      <div className="calendar-wrap">
        <div className="card">
          <Calendar 
            value={date} 
            onChange={setDate} 
            tileContent={tileContent} 
            onClickDay={onClickDay} 
          />
        </div>
        <div className="card">
          <h3>Upcoming events</h3>
          <div className="event-list">
            {events.slice(0,40).map((ev,i)=> (
              <div key={i} className="event-pill">{ev.symbol} — {ev.date}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

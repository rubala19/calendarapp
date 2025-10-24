import axios from 'axios';

const DEBUG = (process.env.DEBUG_LOGS === 'true');
function dbg(...args){ if (DEBUG) console.log(...args); }

const BIN_ID = process.env.JSONBIN_BIN_ID;
const MASTER_KEY = process.env.JSONBIN_MASTER_KEY;
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function loadEvents() {
  dbg('[events] loadEvents -> GET', BASE_URL + '/latest');
  const resp = await axios.get(`${BASE_URL}/latest`, { headers: { 'X-Master-Key': MASTER_KEY } });
  const j = resp.data;
  dbg('[events] raw bin response keys:', Object.keys(j || {}));
  let events = [];
  if (Array.isArray(j.record)) events = j.record;
  else if (j.record && Array.isArray(j.record.data)) events = j.record.data;
  if (!Array.isArray(events)) events = [];
  dbg('[events] returning events count:', events.length);
  return events;
}

async function saveEvents(events) {
  dbg('[events] saveEvents -> PUT', BASE_URL);
  const resp = await axios.put(BASE_URL, events, { headers: { 'X-Master-Key': MASTER_KEY, 'Content-Type': 'application/json' } });
  dbg('[events] save response status:', resp.status);
  return true;
}

export default async function handler(req, res) {
  if (!BIN_ID || !MASTER_KEY) {
    console.error('[events] Missing JSONBin credentials');
    return res.status(500).json({ error: 'Missing JSONBin credentials' });
  }
  try {
    dbg('[events] method', req.method);
    if (req.method === 'GET') {
      const events = await loadEvents();
      return res.status(200).json(events);
    }
    if (req.method === 'POST') {
      dbg('[events] POST body', req.body);
      const body = req.body || {};
      const symbol = (body.symbol || '').toString().trim().toUpperCase();
      const date = body.date;
      if (!symbol || !date) return res.status(400).json({ error: 'Symbol and date required' });

      const events = await loadEvents();
      events.push({ symbol, date });
      events.sort((a,b)=> new Date(a.date) - new Date(b.date));
      await saveEvents(events);
      dbg('[events] POST completed, total events:', events.length);
      return res.status(200).json(events);
    }

    res.setHeader('Allow', ['GET','POST']);
    return res.status(405).end('Method Not Allowed');
  } catch (err) {
    console.error('[events] Error:', err.response?.data || err.message);
    console.error(err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
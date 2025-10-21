// Vercel serverless function to proxy JSONBin (v3) for persistent events
// Expects environment variables: JSONBIN_ID, JSONBIN_KEY
const BIN_ID = process.env.JSONBIN_ID;
const API_KEY = process.env.JSONBIN_KEY;
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function getBinLatest() {
  const res = await fetch(`${BASE_URL}/latest`, {
    headers: { "X-Master-Key": API_KEY }
  });
  if (!res.ok) throw new Error('Failed to fetch bin');
  const j = await res.json();
  return j.record || [];
}

async function putBin(data) {
  const res = await fetch(`${BASE_URL}`, {
    method: 'PUT',
    headers: { "Content-Type": "application/json", "X-Master-Key": API_KEY },
    body: JSON.stringify({ data })
  });
  if (!res.ok) throw new Error('Failed to update bin');
  return await res.json();
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const events = await getBinLatest();
      return res.status(200).json(events);
    } else if (req.method === 'POST') {
      const ev = req.body;
      if (!ev || !ev.symbol || !ev.date) return res.status(400).json({error:'invalid event'});
      const events = await getBinLatest();
      events.push(ev);
      await putBin(events);
      return res.status(200).json(events);
    } else if (req.method === 'PUT') {
      const payload = req.body;
      if (!payload || !Array.isArray(payload.events)) return res.status(400).json({error:'invalid payload'});
      const events = payload.events;
      await putBin(events);
      return res.status(200).json({ok:true});
    } else {
      res.setHeader('Allow', 'GET,POST,PUT');
      return res.status(405).end('Method Not Allowed');
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({error: e.message});
  }
}

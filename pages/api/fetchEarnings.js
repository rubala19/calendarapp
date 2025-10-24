import axios from 'axios';

const DEBUG = (process.env.DEBUG_LOGS === 'true');

function dbg(...args) { if (DEBUG) console.log(...args); }

export default async function handler(req, res) {
  const symbol = (req.query.symbol || '').toString().trim();
  const key = process.env.ALPHAVANTAGE_KEY;
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' });
  if (!key) {
    dbg('[fetchEarnings] Missing ALPHAVANTAGE_KEY');
    return res.status(500).json({ error: 'Missing ALPHAVANTAGE_KEY' });
  }

  const url = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${encodeURIComponent(symbol)}&horizon=3month&apikey=${encodeURIComponent(key)}`;
  dbg('[fetchEarnings] Fetching for symbol:', symbol);
  dbg('[fetchEarnings] URL:', url);

  try {
    const resp = await axios.get(url, { responseType: 'text', timeout: 15000 });
    const dataText = resp.data;
    dbg('[fetchEarnings] Raw response length:', typeof dataText === 'string' ? dataText.length : 'not-string');
    dbg('[fetchEarnings] Raw response preview:', typeof dataText === 'string' ? dataText.slice(0,400) : String(dataText).slice(0,400));

    // Parse CSV (AlphaVantage returns CSV)
    const lines = dataText.trim().split('\n').map(l=>l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      dbg('[fetchEarnings] No CSV rows found');
      return res.status(404).json({ error: 'No earnings data found', raw: dataText });
    }
    const headers = lines[0].split(',').map(h=>h.trim());
    const row = lines[1].split(',').map(v=>v.trim());
    const obj = Object.fromEntries(headers.map((h,i)=>[h, row[i] || null]));

    dbg('[fetchEarnings] Parsed object:', obj);
    const reportDate = obj.reportDate || obj.report_date || obj.reportDateLocal || obj.reportDateLocal || null;
    if (!reportDate) {
      dbg('[fetchEarnings] reportDate missing in parsed object');
      return res.status(404).json({ error: 'No reportDate parsed', parsed: obj });
    }

    dbg('[fetchEarnings] reportDate for', symbol, reportDate);
    return res.status(200).json({ symbol: obj.symbol || symbol, nextEarnings: reportDate, parsed: obj });
  } catch (err) {
    dbg('[fetchEarnings] Error:', err.response?.data || err.message);
    console.error('[fetchEarnings] Exception:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Failed to fetch earnings', details: err.message });
  }
}
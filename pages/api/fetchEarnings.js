import axios from 'axios';

export default async function handler(req, res) {
  const symbol = (req.query.symbol || '').toString().trim();
  const key = process.env.ALPHAVANTAGE_KEY;
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' });
  if (!key) return res.status(500).json({ error: 'Missing ALPHAVANTAGE_KEY' });

  const url = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${encodeURIComponent(symbol)}&horizon=3month&apikey=${encodeURIComponent(key)}`;
  console.log(`[fetchEarnings] URL: ${url}`);

  try {
    const resp = await axios.get(url, { responseType: 'text', timeout: 15000 });
    const dataText = resp.data;
    console.log('[fetchEarnings] Raw response (first 300 chars):', typeof dataText === 'string' ? dataText.slice(0,300) : String(dataText).slice(0,300));

    // Parse CSV
    const lines = dataText.trim().split('\n').map(l=>l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      console.warn('[fetchEarnings] No CSV rows found');
      return res.status(404).json({ error: 'No earnings data found', raw: dataText });
    }
    const headers = lines[0].split(',').map(h=>h.trim());
    const row = lines[1].split(',').map(v=>v.trim());
    const obj = Object.fromEntries(headers.map((h,i)=>[h, row[i] || null]));

    console.log('[fetchEarnings] Parsed object:', obj);
    const reportDate = obj.reportDate || obj.report_date || obj.reportDateLocal || obj.reportDateLocal || null;
    if (!reportDate) {
      return res.status(404).json({ error: 'No reportDate parsed', parsed: obj });
    }

    return res.status(200).json({ symbol: obj.symbol || symbol, nextEarnings: reportDate, parsed: obj });
  } catch (err) {
    console.error('[fetchEarnings] Error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to fetch earnings', details: err.message });
  }
}
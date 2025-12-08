// pages/api/fetchEarnings.js
// This endpoint fetches earnings data from external APIs

const DEBUG = (process.env.DEBUG_LOGS === 'true');
function dbg(...args){ if (DEBUG) console.log(...args); }

async function fetchEarningsAlphaVantage(ticker) {
  const API_KEY = process.env.ALPHAVANTAGE_KEY;
  if (!API_KEY) {
    throw new Error("Missing ALPHAVANTAGE_KEY env variable");
  }
  
  dbg('[fetchEarnings] Fetching from Alpha Vantage for', ticker);
  const url = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${ticker}&horizon=3month&apikey=${API_KEY}`;
  
  const response = await fetch(url);
  dbg('[fetchEarnings] Alpha Vantage status:', response.status);
  
  if (!response.ok) {
    throw new Error(`Alpha Vantage error: ${response.status}`);
  }
  
  const text = await response.text();
  dbg('[fetchEarnings] Response length:', text.length);
  
  // Check for API error messages
  if (text.includes('Error Message')) {
    dbg('[fetchEarnings] Alpha Vantage returned error');
    throw new Error('Alpha Vantage API error');
  }
  
  if (text.includes('Note') && text.includes('premium')) {
    dbg('[fetchEarnings] Alpha Vantage rate limit');
    throw new Error('Alpha Vantage rate limit reached');
  }
  
  const lines = text.trim().split("\n");
  dbg('[fetchEarnings] Parsed lines:', lines.length);
  
  if (lines.length <= 1) {
    dbg('[fetchEarnings] No earnings data (empty)');
    return null;
  }
  
  // Parse CSV line
  const [symbol, name, reportDate, fiscalDateEnding, estimate, currency] = lines[1].split(",");
  dbg('[fetchEarnings] Parsed:', { symbol, name, reportDate });
  
  if (!reportDate || reportDate === "None") {
    dbg('[fetchEarnings] No valid report date');
    return null;
  }
  
  return {
    symbol,
    name,
    date: reportDate,
    time: 'TBD', // Alpha Vantage CSV doesn't include time
    fiscalDateEnding,
    estimate,
    currency,
    source: "AlphaVantage",
  };
}

async function fetchEarningsMarketData(ticker) {
  dbg('[fetchEarnings] Fetching from MarketData.app for', ticker);
  const url = `https://api.marketdata.app/v1/stocks/earnings/${ticker}`;
  
  try {
    const response = await fetch(url);
    dbg('[fetchEarnings] MarketData status:', response.status);
    
    if (!response.ok) {
      dbg('[fetchEarnings] MarketData failed');
      return null;
    }
    
    const data = await response.json();
    dbg('[fetchEarnings] MarketData response:', data);
    
    if (data && data.reportDate && data.reportDate.length > 0) {
      // Convert Unix timestamp to date
      const nextDateUnix = data.reportDate[0];
      const nextDate = new Date(nextDateUnix * 1000);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(nextDate.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${d}`;
      const time = (data.reportTime && data.reportTime[0]) ? data.reportTime[0] : 'TBD';
      
      dbg('[fetchEarnings] MarketData success:', { iso, time });
      
      return {
        symbol: ticker,
        name: ticker,
        date: iso,
        time: time,
        source: 'MarketData'
      };
    }
    
    dbg('[fetchEarnings] MarketData no data');
    return null;
  } catch (error) {
    dbg('[fetchEarnings] MarketData exception:', error.message);
    return null;
  }
}

export default async function handler(req, res) {
  dbg('[fetchEarnings] ===== REQUEST START =====');
  dbg('[fetchEarnings] Method:', req.method);
  dbg('[fetchEarnings] Query:', req.query);
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    dbg('[fetchEarnings] Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { symbol } = req.query;
  
  if (!symbol) {
    dbg('[fetchEarnings] Missing symbol');
    return res.status(400).json({ error: 'Missing symbol parameter' });
  }
  
  const ticker = symbol.toUpperCase();
  dbg('[fetchEarnings] Processing ticker:', ticker);
  
  try {
    // Try MarketData.app first (more reliable, has time info)
    dbg('[fetchEarnings] Trying MarketData.app...');
    let earnings = await fetchEarningsMarketData(ticker);
    
    if (earnings) {
      dbg('[fetchEarnings] ✅ Success with MarketData');
      return res.status(200).json(earnings);
    }
    
    // Fallback to Alpha Vantage
    dbg('[fetchEarnings] Trying Alpha Vantage...');
    earnings = await fetchEarningsAlphaVantage(ticker);
    
    if (earnings) {
      dbg('[fetchEarnings] ✅ Success with Alpha Vantage');
      return res.status(200).json(earnings);
    }
    
    // No data found
    dbg('[fetchEarnings] ❌ No data from any source');
    return res.status(404).json({ 
      error: `No earnings data found for ${ticker}`,
      ticker: ticker
    });
    
  } catch (error) {
    console.error('[fetchEarnings] ❌ Error:', error.message);
    console.error(error.stack);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch earnings data',
      ticker: ticker
    });
  }
}

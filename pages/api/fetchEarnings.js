// pages/api/fetchEarnings.js
// This file should be in your pages/api/ directory for Vercel to serve it

async function fetchEarningsAlphaVantage(ticker) {
  const API_KEY = process.env.ALPHAVANTAGE_KEY;
  if (!API_KEY) {
    console.error('[API] Missing ALPHAVANTAGE_KEY env variable');
    throw new Error("Missing ALPHAVANTAGE_KEY env variable");
  }
  
  console.log(`[API] Fetching from Alpha Vantage for ${ticker}...`);
  const url = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${ticker}&horizon=3month&apikey=${API_KEY}`;
  
  const response = await fetch(url);
  console.log(`[API] Alpha Vantage response status: ${response.status}`);
  
  if (!response.ok) {
    throw new Error(`Alpha Vantage error: ${response.status}`);
  }
  
  const text = await response.text();
  console.log(`[API] Alpha Vantage response text (first 200 chars):`, text.substring(0, 200));
  
  // Check for API error messages
  if (text.includes('Error Message')) {
    console.error('[API] Alpha Vantage returned error message:', text);
    throw new Error('Alpha Vantage API error');
  }
  
  if (text.includes('Note') && text.includes('premium')) {
    console.error('[API] Alpha Vantage rate limit hit');
    throw new Error('Alpha Vantage rate limit reached');
  }
  
  const lines = text.trim().split("\n");
  console.log(`[API] Parsed ${lines.length} lines from CSV`);
  
  if (lines.length <= 1) {
    console.log('[API] No earnings data found (only header or empty)');
    return null;
  }
  
  // Parse CSV line
  const [symbol, name, reportDate, fiscalDateEnding, estimate, currency] = lines[1].split(",");
  console.log(`[API] Parsed data: symbol=${symbol}, name=${name}, date=${reportDate}`);
  
  if (!reportDate || reportDate === "None") {
    console.log('[API] No valid report date found');
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
  console.log(`[API] Fetching from MarketData.app for ${ticker}...`);
  const url = `https://api.marketdata.app/v1/stocks/earnings/${ticker}`;
  
  try {
    const response = await fetch(url);
    console.log(`[API] MarketData response status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`[API] MarketData failed with status ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`[API] MarketData response:`, data);
    
    if (data && data.reportDate && data.reportDate.length > 0) {
      // Convert Unix timestamp to date
      const nextDateUnix = data.reportDate[0];
      const nextDate = new Date(nextDateUnix * 1000);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(nextDate.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${d}`;
      const time = (data.reportTime && data.reportTime[0]) ? data.reportTime[0] : 'TBD';
      
      console.log(`[API] MarketData success: date=${iso}, time=${time}`);
      
      return {
        symbol: ticker,
        name: ticker,
        date: iso,
        time: time,
        source: 'MarketData'
      };
    }
    
    console.log('[API] MarketData returned no earnings data');
    return null;
  } catch (error) {
    console.error('[API] MarketData exception:', error);
    return null;
  }
}

// Main API handler
export default async function handler(req, res) {
  console.log('\n========== API CALL START ==========');
  console.log('[API] Method:', req.method);
  console.log('[API] Query:', req.query);
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    console.log('[API] ❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { symbol } = req.query;
  
  if (!symbol) {
    console.log('[API] ❌ Missing symbol parameter');
    return res.status(400).json({ error: 'Missing symbol parameter' });
  }
  
  const ticker = symbol.toUpperCase();
  console.log(`[API] Processing ticker: ${ticker}`);
  
  try {
    // Try MarketData.app first (more reliable, has time info)
    console.log('[API] Trying MarketData.app first...');
    let earnings = await fetchEarningsMarketData(ticker);
    
    if (earnings) {
      console.log('[API] ✅ Success with MarketData.app');
      console.log('========== API CALL END ==========\n');
      return res.status(200).json(earnings);
    }
    
    // Fallback to Alpha Vantage
    console.log('[API] MarketData failed, trying Alpha Vantage...');
    earnings = await fetchEarningsAlphaVantage(ticker);
    
    if (earnings) {
      console.log('[API] ✅ Success with Alpha Vantage');
      console.log('========== API CALL END ==========\n');
      return res.status(200).json(earnings);
    }
    
    // No data found
    console.log('[API] ❌ No earnings data found from any source');
    console.log('========== API CALL END ==========\n');
    return res.status(404).json({ 
      error: `No earnings data found for ${ticker}`,
      ticker: ticker
    });
    
  } catch (error) {
    console.error('[API] ❌ Exception:', error);
    console.error('[API] Error stack:', error.stack);
    console.log('========== API CALL END ==========\n');
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch earnings data',
      ticker: ticker
    });
  }
}

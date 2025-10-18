# Earnings Calendar — v2 (MarketData + Alpha Vantage fallback)

This static prototype includes:
- Preloaded tickers (AVGO, TSM, AMD, AAPL, SNOW, AGO, PYPL, NVDA)
- Add / Fetch Earnings: MarketData.app primary, Alpha Vantage fallback (embedded key)
- Dark translucent toast notifications (bottom-right)
- Manual prompt fallback if both APIs fail

## Files
- index.html
- style.css
- script.js
- README.md

## Notes
- Alpha Vantage API key is embedded in script.js. Replace `ALPHA_VANTAGE_KEY` if you want to use another key.
- For production, consider moving API calls to a small backend to hide API keys and avoid CORS/rate limits.

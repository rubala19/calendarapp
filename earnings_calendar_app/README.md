# Earnings Calendar — Static Prototype

This is a clean, static **Earnings Calendar** web app prototype.

## Contents
- `index.html` — main HTML file
- `style.css` — styling
- `script.js` — calendar logic, preloaded events, "Add Event" fetch from MarketData.app

## Usage
1. Unzip and open `index.html` in a modern browser.
2. Use the month navigation to browse months.
3. In the **Add / Fetch Earnings** box, enter a ticker (e.g. `NVDA`) and click **Add / Fetch Earnings**.
   - The app will attempt to fetch the next earnings date from MarketData.app:
     `https://api.marketdata.app/v1/stocks/earnings/{TICKER}`
   - If the API fetch fails, you'll be prompted to enter a date manually (YYYY-MM-DD).
4. Logos are loaded via Clearbit: `https://logo.clearbit.com/{company-domain}`.
   - Some logos may not be available or blocked depending on network rules.

## Deploying
This is a static site. You can deploy it on Vercel, Netlify, GitHub Pages:
- For Vercel: `vercel deploy` after connecting a new project or uploading the zip to the Vercel dashboard.
- For Netlify: drag-and-drop the folder to the Netlify Sites dashboard.

## Notes
- This prototype uses a public API (MarketData.app) without authentication; for production, prefer an API key-backed provider to avoid rate limits.
- The domain lookup for logos is heuristic-based; you can expand the `guessDomain` map in `script.js`.


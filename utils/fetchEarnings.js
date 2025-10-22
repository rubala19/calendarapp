export async function fetchEarningsAlphaVantage(ticker) {
  const API_KEY = process.env.ALPHAVANTAGE_KEY;
  if (!API_KEY) throw new Error("Missing ALPHAVANTAGE_KEY env variable");

  const url = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${ticker}&horizon=3month&apikey=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Alpha Vantage error: ${response.status}`);

  const text = await response.text();
  const lines = text.trim().split("\n");
  if (lines.length <= 1) return null;

  const [symbol, name, reportDate, fiscalDateEnding, estimate, currency] =
    lines[1].split(",");

  if (!reportDate || reportDate === "None") return null;

  return {
    symbol,
    name,
    date: reportDate,
    fiscalDateEnding,
    estimate,
    currency,
    source: "AlphaVantage",
  };
}

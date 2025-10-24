import axios from "axios";

const BIN_ID = process.env.JSONBIN_BIN_ID;
const MASTER_KEY = process.env.JSONBIN_MASTER_KEY;

export default async function handler(req, res) {
  const binUrl = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
  console.log(`📦 [EventsAPI] Handling ${req.method} at ${binUrl}`);

  try {
    if (req.method === "GET") {
      const { data } = await axios.get(binUrl, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      console.log(`📤 Retrieved ${Array.isArray(data.record) ? data.record.length : 0} events`);
      return res.status(200).json(data.record || []);
    }

    if (req.method === "POST") {
      const { symbol, date } = req.body;
      console.log(`➕ Adding new event: ${symbol} @ ${date}`);

      const { data } = await axios.get(binUrl, {
        headers: { "X-Master-Key": MASTER_KEY }
      });

      const current = Array.isArray(data.record) ? data.record : [];
      const updated = [...current, { symbol, date }];

      await axios.put(binUrl, updated, {
        headers: {
          "X-Master-Key": MASTER_KEY,
          "Content-Type": "application/json"
        }
      });

      console.log(`✅ JSONBin updated with ${updated.length} total events`);
      return res.status(200).json({ success: true, count: updated.length });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ [EventsAPI] Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Error updating JSONBin", details: err.message });
  }
}

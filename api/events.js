export default async function handler(req, res) {
  const BIN_ID = process.env.JSONBIN_ID;
  const API_KEY = process.env.JSONBIN_KEY;
  const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  if (!BIN_ID || !API_KEY) {
    return res.status(500).json({ error: "Missing JSONBin credentials" });
  }

  try {
    if (req.method === "GET") {
      // Fetch events
      const response = await fetch(`${BASE_URL}/latest`, {
        headers: { "X-Master-Key": API_KEY },
      });

      const json = await response.json();

      // Handle both response shapes from JSONBin
      let events = [];
      if (Array.isArray(json.record)) {
        events = json.record;
      } else if (json.record && Array.isArray(json.record.data)) {
        events = json.record.data;
      }

      if (!Array.isArray(events)) events = [];

      return res.status(200).json(events);
    }

    if (req.method === "POST") {
      const newEvent = req.body;

      // Get current events
      const response = await fetch(`${BASE_URL}/latest`, {
        headers: { "X-Master-Key": API_KEY },
      });
      const json = await response.json();

      let events = [];
      if (Array.isArray(json.record)) {
        events = json.record;
      } else if (json.record && Array.isArray(json.record.data)) {
        events = json.record.data;
      }
      if (!Array.isArray(events)) events = [];

      // Append and save back
      events.push(newEvent);

      await fetch(BASE_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": API_KEY,
        },
        body: JSON.stringify(events), // save as plain array
      });

      return res.status(200).json({ success: true, event: newEvent });
    }

    // Method not allowed
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

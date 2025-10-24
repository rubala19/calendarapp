const DEBUG = (process.env.DEBUG_LOGS === 'true');
export default function handler(req, res) {
  if (DEBUG) console.log('[health] ping at', new Date().toISOString());
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
}
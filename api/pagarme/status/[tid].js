import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { tid } = req.query || {};
  try {
    const key = process.env.PAGARME_API_KEY;
    if (!key) return res.status(500).json({ error: "PAGARME_API_KEY ausente" });
    if (!tid) return res.status(400).json({ error: "tid obrigatório" });

    const r = await axios.get(
      `https://api.pagar.me/1/transactions/${encodeURIComponent(tid)}?api_key=${encodeURIComponent(key)}`,
      { timeout: 15000 }
    );
    return res.json({ status: r.data?.status || "unknown", raw: r.data });
  } catch (e) {
    console.error("status error:", e?.response?.data || e.message);
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
}

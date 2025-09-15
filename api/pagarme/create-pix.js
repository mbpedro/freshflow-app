import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { orderId, lines, totalPrice } = req.body || {};
    if (!orderId) return res.status(400).json({ error: "orderId obrigatório" });

    const key = process.env.PAGARME_API_KEY;
    if (!key) return res.status(500).json({ error: "PAGARME_API_KEY ausente" });

    const items = Array.isArray(lines) && lines.length
      ? lines
      : [{ name: "Suco Freshflow", qty: 1, price: Number(totalPrice || 0) }];

    const totalCents = items.reduce(
      (s, l) => s + Math.round(Number(l.price) * 100) * Math.max(1, l.qty || 1),
      0
    );
    if (!totalCents) return res.status(400).json({ error: "Valor inválido" });

    const payload = {
      api_key: key,
      amount: totalCents,
      payment_method: "pix",
      pix_expiration_date: Math.floor(Date.now() / 1000) + 30 * 60,
      metadata: { orderId },
      items: items.map((l, i) => ({
        id: String(i + 1),
        title: l.name || "Suco Freshflow",
        unit_price: Math.round(Number(l.price) * 100),
        quantity: Math.max(1, l.qty || 1),
        tangible: false
      })),
    };

    const r = await axios.post("https://api.pagar.me/1/transactions", payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000
    });

    const tr = r.data || {};
    return res.json({
      transaction_id: tr.id,
      qr_code: tr.pix_qr_code || tr.qr_code || tr.qr_code_text || null,
      qr_code_url: tr.pix_qr_code_url || tr.qr_code_url || null,
      status: tr.status
    });
  } catch (e) {
    console.error("create-pix error:", e?.response?.data || e.message);
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
}

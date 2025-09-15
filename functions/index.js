const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const axios = require("axios");

try { admin.initializeApp(); } catch (e) {}
const db = admin.firestore();

const PAGARME_API_KEY =
  process.env.PAGARME_API_KEY ||
  (functions.config().pagarme && functions.config().pagarme.api_key);

if (!PAGARME_API_KEY) {
  console.warn("[Pagar.me] API KEY não configurada. Use: firebase functions:config:set pagarme.api_key=... ");
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Util: carrega pedido por ID
async function getOrder(orderId) {
  const ref = db.collection("orders").doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Pedido não encontrado");
  return { ref, data: snap.data() };
}

/**
 * POST /api/pagarme/create-pix
 * body: { orderId }
 * resp: { transaction_id, qr_code, qr_code_url, status }
 */
app.post("/pagarme/create-pix", async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId obrigatório" });

    const { ref, data } = await getOrder(orderId);

    const lines = Array.isArray(data.lines) && data.lines.length
      ? data.lines
      : [{ name: "Suco Freshflow", qty: data.qty || 1, price: Number(data.price || data.totalPrice || 0) }];

    // Valor total (centavos)
    const totalCents = lines.reduce((sum, l) => {
      const v = Math.round(Number(l.price) * 100) * Math.max(1, Math.floor(l.qty || 1));
      return sum + (isFinite(v) ? v : 0);
    }, 0);
    if (!totalCents || totalCents <= 0) {
      return res.status(400).json({ error: "Valor inválido" });
    }

    // ----- API legada /1/transactions (Pix) -----
    const payload = {
      api_key: PAGARME_API_KEY,
      amount: totalCents,
      payment_method: "pix",
      pix_expiration_date: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutos
      metadata: { orderId },
      items: lines.map((l, idx) => ({
        id: String(idx + 1),
        title: l.name || "Suco Freshflow",
        unit_price: Math.round(Number(l.price) * 100),
        quantity: Math.max(1, Math.floor(l.qty || 1)),
        tangible: false,
      })),
    };

    const resp = await axios.post("https://api.pagar.me/1/transactions", payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    const tr = resp.data || {};
    const transaction_id = tr.id;
    const qr_code = tr.pix_qr_code || tr.qr_code || tr.qr_code_text || null;
    const qr_code_url = tr.pix_qr_code_url || tr.qr_code_url || null;
    const status = tr.status; // "pending" até ser pago

    await ref.update({
      paymentProvider: "pagarme",
      pagarme_transaction_id: transaction_id,
      pagarme_status: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ transaction_id, qr_code, qr_code_url, status });
  } catch (e) {
    console.error("[pagarme/create-pix] error:", e?.response?.data || e.message);
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
});

/**
 * GET /api/pagarme/status/:tid
 * resp: { status, raw }
 */
app.get("/pagarme/status/:tid", async (req, res) => {
  try {
    const tid = req.params.tid;
    if (!tid) return res.status(400).json({ error: "tid obrigatório" });

    const r = await axios.get(`https://api.pagar.me/1/transactions/${encodeURIComponent(tid)}?api_key=${encodeURIComponent(PAGARME_API_KEY)}`, {
      timeout: 15000,
    });

    const status = r.data?.status || "unknown";
    return res.json({ status, raw: r.data });
  } catch (e) {
    console.error("[pagarme/status] error:", e?.response?.data || e.message);
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
});

/**
 * POST /api/pagarme/webhook
 * Configure a URL pública desta rota no painel do Pagar.me.
 * Atualiza o pedido como pago quando receber status = "paid".
 */
app.post("/pagarme/webhook", async (req, res) => {
  try {
    const body = req.body || {};

    let status = null;
    let tid = null;
    let orderId = null;

    if (body.event === "transaction_status_changed" && body.payload) {
      status = body.payload.current_status || body.payload.status;
      tid = body.payload.id;
      orderId = body.payload.metadata?.orderId || null;
    } else if (body.type && body.data) {
      status = body.data?.status || body.data?.current_status || null;
      tid = body.data?.id || null;
      orderId = body.data?.metadata?.orderId || null;
    } else if (body.object === "transaction") {
      status = body.status;
      tid = body.id;
      orderId = body.metadata?.orderId || null;
    }

    if (!tid) {
      console.warn("[webhook] payload inesperado", body);
      return res.json({ ok: true, ignored: true });
    }

    if (!orderId) {
      const snap = await db.collection("orders").where("pagarme_transaction_id", "==", tid).limit(1).get();
      if (!snap.empty) {
        orderId = snap.docs[0].id;
      }
    }

    if (orderId) {
      const ref = db.collection("orders").doc(orderId);
      await ref.update({
        pagarme_status: status || null,
        paid: status === "paid" ? true : admin.firestore.FieldValue.delete(),
        status: status === "paid" ? "preparing" : admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("[pagarme/webhook] error:", e?.response?.data || e.message);
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
});

exports.api = functions.region("us-central1").https.onRequest(app);

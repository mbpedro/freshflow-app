export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // Dependendo da sua necessidade, você pode:
    // 1) Só responder 200 e usar "status/[tid]" no front (polling), OU
    // 2) Integrar aqui com Firebase Admin SDK para atualizar o Firestore.
    // (Se quiser, eu te mando a versão com Admin SDK.)

    console.log("Webhook Pagar.me recebido.");
    return res.json({ ok: true });
  } catch (e) {
    console.error("webhook error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

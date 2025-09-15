import { useEffect, useState } from "react";
import { ensurePersistence, signInWithGoogleSmart, onAuth, signOutUser } from "@/lib/auth";
import { saveUser } from "@/lib/db";
import { saveOrder } from "@/lib/orders";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, PlusCircle, CheckCircle2, MapPin, Bike, Store } from "lucide-react";

/** =========================================================
 * Helpers para integração Pix (Pagar.me) via Vercel Functions
 * ========================================================= */
async function pagarmeCreatePixFrontend(orderId, lines, totalPrice) {
  // Chama sua serverless function na Vercel
  const res = await fetch(`/api/pagarme/create-pix`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, lines, totalPrice }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Falha ao criar Pix: ${t || res.status}`);
  }
  return await res.json(); // { transaction_id, qr_code, qr_code_url, status }
}

async function pagarmeCheckStatusFrontend(tid) {
  const res = await fetch(`/api/pagarme/status/${encodeURIComponent(tid)}`);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Falha ao consultar status Pix: ${t || res.status}`);
  }
  return await res.json(); // { status, raw }
}

export default function FreshflowApp() {
  const [step, setStep] = useState(0);
  const [user, setUser] = useState(null);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(null);

  // estado do pedido (mantendo seu formato atual)
  const [order, setOrder] = useState({
    items: ["Maçã", "Couve", "Limão"],
    price: 18.9,
    address: {},
    delivery: null,
  });

  // Estados para Pix
  const [pixInfo, setPixInfo] = useState(null); // { tid, qr_code, qr_code_url }
  const [checkingPix, setCheckingPix] = useState(false);

  useEffect(() => {
    ensurePersistence().catch(console.error);
    const unsub = onAuth(async (u) => {
      setUser(u || null);
      if (u) await saveUser(u);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = parseInt(params.get("step") || "0", 10);
    if (!isNaN(s)) setStep(s);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(step));
    window.history.replaceState(null, "", url.toString());
  }, [step]);

  const handleGoogleLogin = async () => {
    try {
      setLoadingLogin(true);
      const cred = await signInWithGoogleSmart();
      if (cred && cred.user) {
        console.log("Login OK:", cred.user.email);
        await saveUser(cred.user);
        setStep(2);
      } else {
        console.log("Redirecionando para login…");
      }
    } catch (e) {
      console.error("Auth error:", e);
      alert(`Falha no login: ${e.code || ""} ${e.message || ""}`);
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setUser(null);
    setStep(1);
  };

  /** ===========================================
   * Pagamento com Pix (Pagar.me) via Vercel
   * Fluxo:
   * 1) Salva o pedido no Firestore
   * 2) Cria a cobrança Pix (QR/cópia e cola)
   * 3) Abre Step 55 para pagar e checar status
   * =========================================== */
  const handlePayWithPagarmePix = async () => {
    try {
      if (!user) throw new Error("Usuário não logado");

      // Normaliza em "lines" (mesmo que seja 1 item)
      const normLines = [
        {
          name: "Suco Personalizado",
          items: Array.isArray(order.items) ? order.items.slice(0, 20) : [],
          price: Number(order.price) || 0,
          qty: 1,
        },
      ];
      const totalPrice = normLines.reduce((s, l) => s + (Number(l.price) || 0) * Math.max(1, l.qty || 1), 0);

      // payload salvo no Firestore (mantendo compatibilidade com seu schema)
      const payload = {
        lines: normLines,
        totalPrice,
        delivery: order.delivery || undefined,
        address: typeof order.address === "object" && order.address ? order.address : {},
        paymentMethod: "Pix (Pagar.me)",
        email: user.email ?? "",
        // legados/compat
        items: normLines[0].items,
        price: normLines[0].price,
        qty: normLines[0].qty,
        itemsSummary: normLines[0].items,
      };

      // 1) Salva pedido
      const docRef = await saveOrder(user, payload);
      setLastOrderId(docRef.id);

      // 2) Cria Pix
      const { transaction_id, qr_code, qr_code_url } = await pagarmeCreatePixFrontend(docRef.id, normLines, totalPrice);

      // 3) Guarda info e abre Step 55
      setPixInfo({
        tid: transaction_id,
        qr_code: qr_code || "",
        qr_code_url: qr_code_url || "",
      });

      setStep(55);
    } catch (e) {
      console.error("Pix error:", e);
      alert("Falha ao iniciar Pix. Veja o console.");
    }
  };

  // Mantém seu fluxo de salvar pedido para outras formas (ex.: cartão, carteiras)
  const handleSaveOrder = async (paymentMethod) => {
    try {
      if (!user) throw new Error("Usuário não logado");

      const payload = {
        ...order,
        paymentMethod,
        email: user.email ?? "",
      };
      if (payload.delivery == null) delete payload.delivery;

      payload.items = Array.isArray(payload.items)
        ? payload.items.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, 20)
        : [];
      payload.price = typeof payload.price === "number" ? payload.price : Number(payload.price) || 0;
      if (typeof payload.address !== "object" || !payload.address) payload.address = {};

      if (payload.items.length === 0) throw new Error("Itens do pedido vazios");
      if (payload.price < 0 || payload.price > 1000) throw new Error("Preço inválido");

      console.log("[DEBUG] Vai salvar pedido:", payload);
      const docRef = await saveOrder(user, payload);
      console.log("[DEBUG] Pedido salvo com ID:", docRef.id);
      setLastOrderId(docRef.id);
      setStep(6);
    } catch (e) {
      console.error("Erro ao salvar pedido:", e);
      alert("Falha ao salvar pedido. Veja o console.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ff0080] via-[#7928ca] to-[#2af598] text-white font-bold">
      {/* Splash Screen */}
      {step === 0 && (
        <motion.div className="flex flex-col items-center justify-center h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-6xl mb-4 drop-shadow-xl text-yellow-300">Freshflow</h1>
          <p className="text-lg italic mb-8 text-pink-200">Seu suco, do seu jeito 🍹</p>
          <Button className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 px-6 py-3 text-lg shadow-lg" onClick={() => setStep(1)}>Entrar</Button>
        </motion.div>
      )}

      {/* Login Screen */}
      {step === 1 && (
        <motion.div className="flex flex-col items-center justify-center h-screen p-6 bg-gradient-to-b from-green-400 via-teal-400 to-blue-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-3xl mb-6 text-yellow-200">Login / Cadastro</h2>
          {user ? (
            <>
              <p className="mb-4">Logado como <b>{user.displayName || user.email}</b></p>
              <div className="flex gap-3">
                <Button className="bg-white text-purple-800 rounded-xl px-6" onClick={handleLogout}>Sair</Button>
                <Button className="bg-gradient-to-r from-green-300 to-lime-400 text-purple-900 rounded-xl" onClick={() => setStep(2)}>Entrar no App</Button>
              </div>
            </>
          ) : (
            <Button className="mb-4 bg-white text-purple-800 rounded-xl px-6" onClick={handleGoogleLogin} disabled={loadingLogin}>
              {loadingLogin ? "Entrando…" : "Entrar com Google"}
            </Button>
          )}
        </motion.div>
      )}

      {/* Home Screen */}
      {step === 2 && (
        <motion.div className="p-6 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 min-h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl text-yellow-300">Bem-vindo à Freshflow 🌈</h2>
            {user && (
              <Button className="bg-white text-purple-800 rounded-xl px-4 py-2" onClick={handleLogout}>Sair</Button>
            )}
          </div>
          <Card className="mb-6 bg-white/20 text-white rounded-2xl shadow-lg">
            <CardContent className="p-4">
              <h3 className="text-xl mb-2">Monte seu Suco</h3>
              <Button className="bg-gradient-to-r from-green-300 to-lime-400 text-purple-900 rounded-xl" onClick={() => setStep(3)}>Criar Agora <PlusCircle className="ml-2" /></Button>
            </CardContent>
          </Card>

          <h3 className="text-xl mb-3">Sugestões do dia</h3>
          <div className="grid grid-cols-2 gap-4">
            {["Tropical Power", "Detox Verde", "Explosão Cítrica", "Fresh Energy"].map((s, i) => (
              <Card key={i} className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white rounded-2xl p-4 shadow-md">{s}</Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Custom Juice Builder */}
      {step === 3 && (
        <motion.div className="p-6 bg-gradient-to-br from-green-300 via-teal-400 to-blue-500 min-h-screen" initial={{ x: 200, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h2 className="text-3xl mb-4 text-yellow-200">Monte seu Suco 🍇🥭🥬</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {["Maçã", "Laranja", "Couve", "Limão", "Manga", "Gengibre", "Abacaxi", "Hortelã"].map((f, i) => (
              <Card key={i} className="bg-white/20 text-center rounded-2xl p-4 cursor-pointer hover:bg-white/30 shadow-md" onClick={() => setOrder((prev) => {
                const exists = prev.items.includes(f);
                const items = exists ? prev.items.filter((x) => x !== f) : [...prev.items, f];
                return { ...prev, items };
              })}>{f}</Card>
            ))}
          </div>
          <div className="flex items-center justify-between mb-6">
            <div className="text-purple-900 bg-white/70 rounded-xl px-3 py-2">Selecionados: {order.items.join(", ") || "—"}</div>
            <div className="text-purple-900 bg-white/70 rounded-xl px-3 py-2">Preço: R$ {Number(order.price || 0).toFixed(2)}</div>
          </div>
          <Button className="bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 rounded-xl" onClick={() => setStep(4)}>
            Finalizar <ShoppingCart className="ml-2" />
          </Button>
        </motion.div>
      )}

      {/* Cart Screen */}
      {step === 4 && (
        <motion.div className="p-6 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 min-h-screen" initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h2 className="text-3xl mb-4 text-yellow-200">Resumo do Pedido 🛒</h2>
          <Card className="bg-white/20 text-white rounded-2xl p-4 mb-4 shadow-lg">
            <h3 className="text-xl mb-2">Suco Personalizado</h3>
            <p>Ingredientes: {order.items.join(", ")}</p>
            <p className="mt-2">Preço: R$ {Number(order.price || 0).toFixed(2)}</p>
          </Card>
          <Button className="bg-gradient-to-r from-green-300 to-lime-400 text-purple-900 rounded-xl" onClick={() => setStep(7)}>
            Continuar
          </Button>
        </motion.div>
      )}

      {/* Address Screen */}
      {step === 7 && (
        <motion.div className="p-6 bg-gradient-to-b from-green-300 via-lime-400 to-yellow-300 min-h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-3xl mb-6 flex items-center text-purple-900"><MapPin className="mr-2"/>Endereço de Entrega</h2>
          <input type="text" placeholder="Rua" className="w-full p-3 mb-3 rounded-xl text-black" />
          <input type="text" placeholder="Número" className="w-full p-3 mb-3 rounded-xl text-black" />
          <input type="text" placeholder="Bairro" className="w-full p-3 mb-3 rounded-xl text-black" />
          <input type="text" placeholder="Cidade" className="w-full p-3 mb-3 rounded-xl text-black" />
          <input type="text" placeholder="CEP" className="w-full p-3 mb-6 rounded-xl text-black" />
          <Button className="bg-gradient-to-r from-blue-400 to-teal-400 text-white rounded-xl mb-4">Usar Localização Atual</Button>
          <Button className="bg-gradient-to-r from-green-400 to-lime-500 text-purple-900 rounded-xl" onClick={() => setStep(8)}>Avançar</Button>
        </motion.div>
      )}

      {/* Delivery Options */}
      {step === 8 && (
        <motion.div className="p-6 bg-gradient-to-br from-pink-400 via-red-400 to-orange-400 min-h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-3xl mb-6 text-yellow-200">Escolha a Entrega 🚚</h2>
          <Card className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30" onClick={() => {
            setOrder((prev) => ({ ...prev, delivery: "express" }));
            setStep(5);
          }}>
            <Bike className="inline-block mr-2"/> Entrega Rápida (até 45 min)
          </Card>
          <Card className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30" onClick={() => {
            setOrder((prev) => ({ ...prev, delivery: "pickup" }));
            setStep(5);
          }}>
            <Store className="inline-block mr-2"/> Retirada na Loja
          </Card>
        </motion.div>
      )}

      {/* Payment Screen */}
      {step === 5 && (
        <motion.div className="p-6 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 min-h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-3xl mb-4 text-yellow-200">Pagamento 💳</h2>

          {/* Pix via Pagar.me (Vercel Functions) */}
          <Card className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30" onClick={handlePayWithPagarmePix}>
            Pix (Pagar.me)
          </Card>

          {/* Outras formas (se quiser manter) */}
          <Card className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30" onClick={() => handleSaveOrder("Pix (manual)")}>
            Pix (manual)
          </Card>
          <Card className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30" onClick={() => handleSaveOrder("Cartão de Crédito")}>
            Cartão de Crédito
          </Card>
          <Card className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30" onClick={() => handleSaveOrder("Carteiras Digitais")}>
            Carteiras Digitais
          </Card>
        </motion.div>
      )}

      {/* PIX Screen (Step 55) */}
      {step === 55 && pixInfo && (
        <motion.div
          className="p-6 bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-400 min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2 className="text-3xl mb-4 text-purple-900">Pague com Pix</h2>

          <Card className="bg-white/90 text-purple-900 rounded-2xl p-4 mb-4">
            <p className="mb-2">Escaneie o QR Code abaixo no seu app bancário:</p>

            {pixInfo.qr_code_url ? (
              <img
                src={pixInfo.qr_code_url}
                alt="QR Code Pix"
                className="w-64 h-64 object-contain bg-white rounded-xl border mx-auto"
              />
            ) : (
              <p>QR Code não disponível — use o código copia-e-cola abaixo.</p>
            )}

            {pixInfo.qr_code && (
              <>
                <p className="mt-4 text-sm opacity-80">Código copia-e-cola:</p>
                <textarea
                  readOnly
                  className="w-full p-2 text-sm rounded-lg border"
                  rows={4}
                  value={pixInfo.qr_code}
                />
                <Button
                  className="mt-2 bg-purple-800 text-white rounded-xl"
                  onClick={() => navigator.clipboard.writeText(pixInfo.qr_code)}
                >
                  Copiar código
                </Button>
              </>
            )}
          </Card>

          <div className="flex gap-3">
            <Button className="bg-white text-purple-900 rounded-xl" onClick={() => setStep(2)}>
              Voltar à Home
            </Button>
            <Button
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 rounded-xl"
              disabled={checkingPix}
              onClick={async () => {
                try {
                  setCheckingPix(true);
                  const r = await pagarmeCheckStatusFrontend(pixInfo.tid);
                  if (r.status === "paid") {
                    setStep(6); // confirmação
                  } else {
                    alert(`Status atual: ${r.status}. Tente novamente em instantes.`);
                  }
                } catch (e) {
                  console.error("check status error:", e);
                  alert("Falha ao verificar status. Veja o console.");
                } finally {
                  setCheckingPix(false);
                }
              }}
            >
              Já paguei — Verificar
            </Button>
          </div>

          <p className="mt-4 text-sm text-purple-900/80">
            Dica: você também pode abrir “Meus Pedidos” — quando o gateway confirmar seu pagamento, o status mudará para <b>Em preparo</b>.
          </p>
        </motion.div>
      )}

      {/* Confirmation Screen */}
      {step === 6 && (
        <motion.div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-gradient-to-br from-green-400 via-teal-400 to-blue-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <CheckCircle2 className="text-yellow-300 w-20 h-20 mb-6" />
          <h2 className="text-3xl mb-4 text-pink-200">Pedido Confirmado! 🎉</h2>
          <p className="text-lg mb-2">Seu suco Freshflow está a caminho 🍹✨</p>
          {lastOrderId && (
            <p className="text-sm opacity-80 mb-6">
              Código do pedido: <b>{lastOrderId}</b>
            </p>
          )}
          <Button className="bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 rounded-xl" onClick={() => setStep(2)}>Voltar ao Início</Button>
        </motion.div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingCart,
  PlusCircle,
  CheckCircle2,
  MapPin,
  Bike,
  Store,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";

import { ensurePersistence, signInWithGoogleSmart, onAuth, signOutUser } from "@/lib/auth";
import { saveUser } from "@/lib/db";
import { saveOrder } from "@/lib/orders";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import {
  subscribeActiveMenu,
  loadAllMenu,
  createMenuItem,
  updateMenuItem,
  removeMenuItem,
} from "@/lib/menu";

/** Linha do carrinho: { name, items[], price, qty } */

export default function FreshflowApp() {
  const [step, setStep] = useState(0);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  // Builder / Carrinho
  const [builderItems, setBuilderItems] = useState(["Maçã", "Couve", "Limão"]);
  const [builderPrice, setBuilderPrice] = useState(18.9);
  const [pendingLine, setPendingLine] = useState(null);
  const [cart, setCart] = useState([]);

  // Entrega / Endereço
  const [address, setAddress] = useState({});
  const [delivery, setDelivery] = useState(null);

  // Pedidos / tracking
  const [lastOrderId, setLastOrderId] = useState(null);
  const [liveOrder, setLiveOrder] = useState(null);
  const [liveError, setLiveError] = useState(null);

  // Meus pedidos
  const [ordersList, setOrdersList] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  // Admin pedidos
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Admin menu
  const [menuAll, setMenuAll] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState(null);

  // Menu dinâmico (home)
  const [activeMenu, setActiveMenu] = useState([]);
  const [activeMenuError, setActiveMenuError] = useState(null);

  // Fallback local (se Firestore estiver vazio)
  const fallbackSuggestions = [
    {
      name: "Cosmic Flow",
      items: ["Abacaxi", "Kiwi", "Gengibre", "Hortelã"],
      price: 19.9,
      gradient: "from-violet-500/40 to-fuchsia-500/40",
    },
    {
      name: "Good Vibes",
      items: ["Laranja", "Cenoura", "Maçã", "Cúrcuma"],
      price: 19.9,
      gradient: "from-amber-400/40 to-orange-500/40",
    },
    {
      name: "Peace & Green",
      items: ["Couve", "Pepino", "Maçã Verde", "Limão", "Gengibre"],
      price: 21.9,
      gradient: "from-emerald-400/40 to-teal-500/40",
    },
    {
      name: "Strawberry Groove",
      items: ["Morango", "Melancia", "Hortelã", "Limão"],
      price: 19.9,
      gradient: "from-rose-500/40 to-pink-500/40",
    },
  ];

  const suggestions = activeMenu?.length
    ? activeMenu.map((m) => ({
        ...m,
        gradient: m.gradient || "from-fuchsia-500/40 to-pink-500/40",
      }))
    : fallbackSuggestions;

  // Subtotal carrinho
  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, line) => sum + (Number(line.price) || 0) * (line.qty || 1),
        0
      ),
    [cart]
  );

  // ===== Auth + flag admin
  useEffect(() => {
    ensurePersistence().catch(console.error);
    const unsub = onAuth(async (u) => {
      setUser(u || null);
      if (u) {
        await saveUser(u);
        try {
          const adm = await getDoc(doc(db, "admins", u.uid));
          setIsAdmin(adm.exists());
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsub && unsub();
  }, []);

  // Deep link (?step=)
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

  // Menu dinâmico na Home
  useEffect(() => {
    const unsub = subscribeActiveMenu(
      (items) => {
        setActiveMenu(items);
        setActiveMenuError(null);
      },
      (err) => {
        setActiveMenuError(err?.message || String(err));
      }
    );
    return () => unsub && unsub();
  }, []);

  // Login
  const handleGoogleLogin = async () => {
    try {
      setLoadingLogin(true);
      const cred = await signInWithGoogleSmart();
      if (cred?.user) {
        await saveUser(cred.user);
        setStep(2);
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
    setIsAdmin(false);
    setStep(1);
  };

  // Carrinho
  const startAddFromSuggestion = (sug) => {
    setPendingLine({
      name: sug.name,
      items: sug.items,
      price: Number(sug.price),
      qty: 1,
    });
    setStep(33);
  };
  const startAddFromBuilder = () => {
    setPendingLine({
      name: "Suco Personalizado",
      items: builderItems.slice(0, 20),
      price: builderPrice,
      qty: 1,
    });
    setStep(33);
  };
  const confirmAddPendingLine = () => {
    if (!pendingLine) return;
    const safeQty = Math.min(50, Math.max(1, Math.floor(pendingLine.qty || 1)));
    const safeItems = Array.isArray(pendingLine.items)
      ? pendingLine.items
          .filter((s) => typeof s === "string" && s.trim())
          .slice(0, 20)
      : [];
    const line = {
      name: String(pendingLine.name || "Suco"),
      items: safeItems,
      price: Number.isFinite(pendingLine.price)
        ? pendingLine.price
        : Number(pendingLine.price) || 0,
      qty: safeQty,
    };
    setCart((prev) => [...prev, line]);
    setPendingLine(null);
    setStep(4);
  };
  const updateLineQty = (index, delta) => {
    setCart((prev) =>
      prev.map((l, i) =>
        i === index
          ? { ...l, qty: Math.min(50, Math.max(1, (l.qty || 1) + delta)) }
          : l
      )
    );
  };
  const removeLine = (index) =>
    setCart((prev) => prev.filter((_, i) => i !== index));

  // Salvar pedido (lines)
  const handleSaveOrder = async (paymentMethod) => {
    try {
      if (!user) throw new Error("Usuário não logado");
      if (!cart.length) throw new Error("Carrinho vazio");

      const normLines = cart.map((l) => {
        const qty = Math.min(50, Math.max(1, Math.floor(l.qty || 1)));
        const price = Number.isFinite(l.price) ? l.price : Number(l.price) || 0;
        const items = Array.isArray(l.items)
          ? l.items
              .filter((s) => typeof s === "string" && s.trim())
              .slice(0, 20)
          : [];
        return { name: String(l.name || "Suco"), items, price, qty };
      });
      const totalPrice = normLines.reduce(
        (sum, l) => sum + l.price * l.qty,
        0
      );

      const payload = {
        lines: normLines,
        totalPrice,
        delivery: delivery || undefined,
        address: typeof address === "object" && address ? address : {},
        paymentMethod,
        email: user.email ?? "",
        // legado (compatibilidade com versões antigas)
        items: normLines[0]?.items || [],
        price: normLines[0]?.price || 0,
        qty: normLines[0]?.qty || 1,
        itemsSummary: normLines.map((l) => l.name).slice(0, 10),
      };

      const docRef = await saveOrder(user, payload);
      setLastOrderId(docRef.id);
      setCart([]);
      setDelivery(null);
      setAddress({});
      setStep(6);
    } catch (e) {
      console.error("Erro ao salvar pedido:", e);
      alert("Falha ao salvar pedido. Veja o console.");
    }
  };

  // Meus pedidos
  const loadMyOrders = async () => {
    if (!user) {
      alert("Faça login para ver seus pedidos.");
      setStep(1);
      return;
    }
    try {
      setOrdersError(null);
      setLoadingOrders(true);

      try {
        const q1 = query(
          collection(db, "orders"),
          where("uid", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snap1 = await getDocs(q1);
        const list1 = [];
        snap1.forEach((d) => list1.push({ id: d.id, ...d.data() }));
        setOrdersList(list1);
        setStep(9);
        return;
      } catch (e1) {
        console.warn("[Meus Pedidos] orderBy falhou, fallback:", e1);
      }

      const q2 = query(collection(db, "orders"), where("uid", "==", user.uid));
      const snap2 = await getDocs(q2);
      const list2 = [];
      snap2.forEach((d) => list2.push({ id: d.id, ...d.data() }));
      list2.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
      setOrdersList(list2);
      setStep(9);
    } catch (e) {
      console.error("Erro ao carregar pedidos:", e);
      setOrdersError(e?.message || String(e));
      setStep(9);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Live tracking do último pedido
  useEffect(() => {
    if (!user || !lastOrderId) return;
    const ref = doc(db, "orders", lastOrderId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setLiveOrder({ id: snap.id, ...snap.data() });
          setLiveError(null);
        } else {
          setLiveOrder(null);
          setLiveError("Pedido não encontrado.");
        }
      },
      (err) => {
        console.error("[LiveTracking] erro:", err);
        setLiveError(err?.message || String(err));
      }
    );
    return () => unsub && unsub();
  }, [user, lastOrderId]);

  // Admin: carregar pedidos
  const loadAllOrders = async () => {
    if (!isAdmin) {
      alert("Acesso restrito a administradores.");
      return;
    }
    try {
      setAdminError(null);
      setAdminLoading(true);

      try {
        const q1 = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const snap1 = await getDocs(q1);
        const list1 = [];
        snap1.forEach((d) => list1.push({ id: d.id, ...d.data() }));
        setAdminOrders(list1);
        setStep(10);
        return;
      } catch (e1) {
        console.warn("[Admin] orderBy falhou, fallback:", e1);
      }

      const q2 = query(collection(db, "orders"));
      const snap2 = await getDocs(q2);
      const list2 = [];
      snap2.forEach((d) => list2.push({ id: d.id, ...d.data() }));
      list2.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
      setAdminOrders(list2);
      setStep(10);
    } catch (e) {
      console.error("Erro ao carregar todos pedidos:", e);
      setAdminError(e?.message || String(e));
      setStep(10);
    } finally {
      setAdminLoading(false);
    }
  };

  // Admin: atualizar status do pedido
  const updateOrderStatus = async (orderId, status) => {
    if (!isAdmin) return;
    try {
      setUpdatingId(orderId);
      await updateDoc(doc(db, "orders", orderId), {
        status,
        updatedAt: serverTimestamp(),
      });
      await loadAllOrders();
    } catch (e) {
      alert("Falha ao atualizar status: " + (e?.message || String(e)));
    } finally {
      setUpdatingId(null);
    }
  };

  // Admin: Menu
  const openAdminMenu = async () => {
    if (!isAdmin) {
      alert("Acesso restrito a administradores.");
      return;
    }
    try {
      setMenuError(null);
      setMenuLoading(true);
      const list = await loadAllMenu();
      setMenuAll(list);
      setStep(11);
    } catch (e) {
      console.error("[AdminMenu] loadAll error:", e);
      setMenuError(e?.message || String(e));
      setStep(11);
    } finally {
      setMenuLoading(false);
    }
  };

  const handleCreateMenuItem = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = form.name.value;
    const price = Number(form.price.value);
    const itemsComma = form.items.value;
    const gradient = form.gradient.value;
    const active = form.active.checked;
    const items = itemsComma
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await createMenuItem({ name, items, price, active, gradient });
      form.reset();
      const list = await loadAllMenu();
      setMenuAll(list);
      alert("Item criado!");
    } catch (err) {
      alert("Falha ao criar: " + (err?.message || String(err)));
    }
  };

  const handleToggleActive = async (id, current) => {
    try {
      await updateMenuItem(id, { active: !current });
      const list = await loadAllMenu();
      setMenuAll(list);
    } catch (err) {
      alert("Falha ao atualizar: " + (err?.message || String(err)));
    }
  };

  const handleQuickEdit = async (id, field, value) => {
    try {
      if (field === "items") {
        const items = String(value)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        await updateMenuItem(id, { items });
      } else if (field === "name") {
        await updateMenuItem(id, { name: String(value) });
      } else if (field === "price") {
        await updateMenuItem(id, { price: Number(value) });
      } else if (field === "gradient") {
        await updateMenuItem(id, { gradient: String(value) });
      }
      const list = await loadAllMenu();
      setMenuAll(list);
    } catch (err) {
      alert("Falha ao editar: " + (err?.message || String(err)));
    }
  };

  // UI helpers
  const statusMap = {
    pending: "Recebido",
    preparing: "Em preparo",
    on_the_way: "A caminho",
    delivered: "Entregue",
  };

  // ============== RENDER ==============
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ff0080] via-[#7928ca] to-[#2af598] text-white font-bold">
      {/* Splash */}
      {step === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h1 className="text-6xl mb-4 drop-shadow-xl text-yellow-300">
            Freshflow
          </h1>
          <p className="text-lg italic mb-8 text-pink-200">
            Seu suco, do seu jeito 🍹
          </p>
          <Button
            className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 px-6 py-3 text-lg shadow-lg"
            onClick={() => setStep(1)}
          >
            Entrar
          </Button>
        </motion.div>
      )}

      {/* Login */}
      {step === 1 && (
        <motion.div
          className="flex flex-col items-center justify-center h-screen p-6 bg-gradient-to-b from-green-400 via-teal-400 to-blue-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2 className="text-3xl mb-6 text-yellow-200">Login / Cadastro</h2>

          {user ? (
            <>
              <p className="mb-4">
                Logado como <b>{user.displayName || user.email}</b>
              </p>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-white text-purple-800 rounded-xl px-6"
                  onClick={handleLogout}
                >
                  Sair
                </Button>
                <Button
                  className="bg-gradient-to-r from-green-300 to-lime-400 text-purple-900 rounded-xl"
                  onClick={() => setStep(2)}
                >
                  Entrar no App
                </Button>

                {isAdmin && (
                  <>
                    <Button
                      className="bg-yellow-300 text-purple-900 rounded-xl"
                      onClick={loadAllOrders}
                    >
                      Admin (Pedidos)
                    </Button>
                    <Button
                      className="bg-yellow-300 text-purple-900 rounded-xl"
                      onClick={openAdminMenu}
                    >
                      <UtensilsCrossed className="inline mr-1" size={16} />
                      Menu
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <Button
              className="mb-4 bg-white text-purple-800 rounded-xl px-6"
              onClick={handleGoogleLogin}
              disabled={loadingLogin}
            >
              {loadingLogin ? "Entrando…" : "Entrar com Google"}
            </Button>
          )}
        </motion.div>
      )}

      {/* Home */}
      {step === 2 && (
        <motion.div
          className="p-6 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl text-yellow-300">Bem-vindo à Freshflow 🌈</h2>
            <div className="flex gap-3">
              <Button
                className="bg-white/20 border border-white/30 rounded-xl px-4 py-2"
                onClick={() => setStep(4)}
              >
                <ShoppingCart className="mr-2 inline-block" size={18} /> Carrinho (
                {cart.length})
              </Button>
              {isAdmin && (
                <Button
                  className="bg-yellow-300 text-purple-900 rounded-xl px-4 py-2"
                  onClick={openAdminMenu}
                >
                  <UtensilsCrossed className="inline mr-1" size={16} />
                  Menu
                </Button>
              )}
              {isAdmin && (
                <Button
                  className="bg-yellow-300 text-purple-900 rounded-xl px-4 py-2"
                  onClick={loadAllOrders}
                >
                  Admin
                </Button>
              )}
              {user && (
                <Button
                  className="bg-white text-purple-800 rounded-xl px-4 py-2"
                  onClick={handleLogout}
                >
                  Sair
                </Button>
              )}
            </div>
          </div>

          {/* Monte seu suco */}
          <Card className="mb-6 bg-white/20 text-white rounded-2xl shadow-lg">
            <CardContent className="p-4">
              <h3 className="text-xl mb-2">Monte seu Suco</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  "Maçã",
                  "Laranja",
                  "Couve",
                  "Limão",
                  "Manga",
                  "Gengibre",
                  "Abacaxi",
                  "Hortelã",
                ].map((f, i) => (
                  <Card
                    key={i}
                    className="bg-white/20 text-center rounded-2xl p-3 cursor-pointer hover:bg-white/30 shadow-md"
                    onClick={() => {
                      const exists = builderItems.includes(f);
                      setBuilderItems((prev) =>
                        exists ? prev.filter((x) => x !== f) : [...prev, f]
                      );
                    }}
                  >
                    {f}
                  </Card>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-90">
                  Selecionados: {builderItems.join(", ") || "-"}
                </div>
                <div className="flex gap-2">
                  <Button
                    className="bg-white text-purple-800 rounded-xl"
                    onClick={() => setBuilderItems([])}
                  >
                    Limpar
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-green-300 to-lime-400 text-purple-900 rounded-xl"
                    onClick={startAddFromBuilder}
                  >
                    Adicionar <PlusCircle className="ml-1" size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sugestões do dia (dinâmico) */}
          <h3 className="text-xl mb-3">Sugestões do dia</h3>
          {activeMenuError && (
            <div className="text-sm mb-2 opacity-90">
              Falha ao carregar menu dinâmico — mostrando sugestões padrão.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((s, i) => (
              <Card
                key={s.id || i}
                className={`bg-gradient-to-r ${
                  s.gradient || "from-fuchsia-500/40 to-pink-500/40"
                } text-white rounded-2xl p-4 shadow-md cursor-pointer hover:scale-[1.01] transition`}
                onClick={() => startAddFromSuggestion(s)}
              >
                <div className="text-lg font-semibold flex items-center justify-between">
                  <span>{s.name}</span>
                  <span className="text-sm bg-white/20 px-2 py-0.5 rounded-lg">
                    R$ {Number(s.price).toFixed(2)}
                  </span>
                </div>
                <div className="text-sm opacity-90">
                  {(s.items || []).join(" • ")}
                </div>
                <div className="text-xs opacity-80 mt-1">
                  Toque para definir quantidade e adicionar
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quantidade (Step 33) */}
      {step === 33 && pendingLine && (
        <motion.div
          className="p-6 bg-gradient-to-b from-amber-300 via-orange-300 to-pink-300 min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2 className="text-3xl mb-4 text-purple-900">Quantidade 🧮</h2>
          <Card className="bg-white/70 text-purple-900 rounded-2xl p-4 mb-6">
            <h3 className="text-lg font-semibold">{pendingLine.name}</h3>
            <div className="text-sm opacity-90">
              Ingredientes: {pendingLine.items.join(", ")}
            </div>
            <div className="mt-2 text-sm">
              Preço unitário: <b>R$ {Number(pendingLine.price).toFixed(2)}</b>
            </div>
          </Card>
          <Card className="bg-white/70 text-purple-900 rounded-2xl p-4 mb-6">
            <h3 className="text-lg font-semibold mb-2">Defina a quantidade</h3>
            <div className="flex items-center gap-4">
              <Button
                className="bg-purple-800 text-white rounded-xl px-4"
                onClick={() =>
                  setPendingLine((prev) => ({
                    ...prev,
                    qty: Math.max(1, (prev.qty || 1) - 1),
                  }))
                }
              >
                −
              </Button>
              <div className="text-2xl w-12 text-center">
                {pendingLine.qty || 1}
              </div>
              <Button
                className="bg-purple-800 text-white rounded-xl px-4"
                onClick={() =>
                  setPendingLine((prev) => ({
                    ...prev,
                    qty: Math.min(50, (prev.qty || 1) + 1),
                  }))
                }
              >
                +
              </Button>
            </div>
          </Card>
          <div className="text-purple-900 mb-6">
            Total desta bebida:{" "}
            <b>
              R${" "}
              {(Number(pendingLine.price) * (pendingLine.qty || 1)).toFixed(2)}
            </b>
          </div>
          <div className="flex gap-3">
            <Button
              className="bg-white text-purple-900 rounded-xl"
              onClick={() => {
                setPendingLine(null);
                setStep(2);
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-gradient-to-r from-green-400 to-lime-500 text-purple-900 rounded-xl"
              onClick={confirmAddPendingLine}
            >
              Adicionar ao carrinho
            </Button>
          </div>
        </motion.div>
      )}

      {/* Carrinho (Step 4) */}
      {step === 4 && (
        <motion.div
          className="p-6 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 min-h-screen"
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl text-yellow-200">Seu Carrinho 🛒</h2>
            <Button
              className="bg-white text-purple-800 rounded-xl"
              onClick={() => setStep(2)}
            >
              Adicionar mais
            </Button>
          </div>

          {cart.length === 0 ? (
            <Card className="bg-white/20 text-white rounded-2xl p-4">
              Seu carrinho está vazio.
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 mb-4">
                {cart.map((line, idx) => (
                  <Card
                    key={idx}
                    className="bg-white/20 text-white rounded-2xl p-4 border border-white/20"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-semibold">{line.name}</div>
                        <div className="text-sm opacity-90">
                          {line.items.join(", ")}
                        </div>
                        <div className="text-sm mt-1">
                          Preço unit.: R$ {Number(line.price).toFixed(2)}
                        </div>
                      </div>
                      <Button
                        className="bg-red-500 text-white rounded-xl"
                        onClick={() => removeLine(idx)}
                      >
                        <Trash2 className="mr-1" size={16} /> Remover
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-sm opacity-90">Qtd:</span>
                      <Button
                        className="bg-white text-purple-900 rounded-xl px-3"
                        onClick={() => updateLineQty(idx, -1)}
                      >
                        −
                      </Button>
                      <div className="w-10 text-center">{line.qty}</div>
                      <Button
                        className="bg-white text-purple-900 rounded-xl px-3"
                        onClick={() => updateLineQty(idx, +1)}
                      >
                        +
                      </Button>
                      <div className="ml-auto font-semibold">
                        Parcial: R${" "}
                        {(Number(line.price) * line.qty).toFixed(2)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="bg-white/20 text-white rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>Subtotal</div>
                  <div className="font-semibold">R$ {subtotal.toFixed(2)}</div>
                </div>
              </Card>

              <div className="flex gap-3">
                <Button
                  className="bg-white text-purple-800 rounded-xl"
                  onClick={() => setStep(2)}
                >
                  Continuar comprando
                </Button>
                <Button
                  className="bg-gradient-to-r from-green-300 to-lime-400 text-purple-900 rounded-xl"
                  onClick={() => setStep(7)}
                >
                  Continuar
                </Button>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Endereço (Step 7) */}
      {step === 7 && (
        <motion.div
          className="p-6 bg-gradient-to-b from-green-300 via-lime-400 to-yellow-300 min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2 className="text-3xl mb-6 flex items-center text-purple-900">
            <MapPin className="mr-2" />
            Endereço de Entrega
          </h2>
          <input
            type="text"
            placeholder="Rua"
            className="w-full p-3 mb-3 rounded-xl text-black"
            onChange={(e) => setAddress((p) => ({ ...p, rua: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Número"
            className="w-full p-3 mb-3 rounded-xl text-black"
            onChange={(e) =>
              setAddress((p) => ({ ...p, numero: e.target.value }))
            }
          />
          <input
            type="text"
            placeholder="Bairro"
            className="w-full p-3 mb-3 rounded-xl text-black"
            onChange={(e) =>
              setAddress((p) => ({ ...p, bairro: e.target.value }))
            }
          />
          <input
            type="text"
            placeholder="Cidade"
            className="w-full p-3 mb-3 rounded-xl text-black"
            onChange={(e) =>
              setAddress((p) => ({ ...p, cidade: e.target.value }))
            }
          />
          <input
            type="text"
            placeholder="CEP"
            className="w-full p-3 mb-6 rounded-xl text-black"
            onChange={(e) => setAddress((p) => ({ ...p, cep: e.target.value }))}
          />
          <Button className="bg-gradient-to-r from-blue-400 to-teal-400 text-white rounded-xl mb-4">
            Usar Localização Atual
          </Button>
          <Button
            className="bg-gradient-to-r from-green-400 to-lime-500 text-purple-900 rounded-xl"
            onClick={() => setStep(8)}
          >
            Avançar
          </Button>
        </motion.div>
      )}

      {/* Entrega (Step 8) */}
      {step === 8 && (
        <motion.div
          className="p-6 bg-gradient-to-br from-pink-400 via-red-400 to-orange-400 min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2 className="text-3xl mb-6 text-yellow-200">Escolha a Entrega 🚚</h2>
          <Card
            className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30"
            onClick={() => {
              setDelivery("express");
              setStep(5);
            }}
          >
            <Bike className="inline-block mr-2" /> Entrega Rápida (até 45 min)
          </Card>
          <Card
            className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30"
            onClick={() => {
              setDelivery("pickup");
              setStep(5);
            }}
          >
            <Store className="inline-block mr-2" /> Retirada na Loja
          </Card>
        </motion.div>
      )}

      {/* Pagamento (Step 5) */}
      {step === 5 && (
        <motion.div
          className="p-6 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2 className="text-3xl mb-4 text-yellow-200">Pagamento 💳</h2>
          <Card
            className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30"
            onClick={() => handleSaveOrder("Pix")}
          >
            Pix
          </Card>
          <Card
            className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30"
            onClick={() => handleSaveOrder("Cartão de Crédito")}
          >
            Cartão de Crédito
          </Card>
          <Card
            className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30"
            onClick={() => handleSaveOrder("Carteiras Digitais")}
          >
            Carteiras Digitais
          </Card>
        </motion.div>
      )}

      {/* Confirmação + Tracking (Step 6) */}
      {step === 6 && (
        <motion.div
          className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gradient-to-br from-green-400 via-teal-400 to-blue-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <CheckCircle2 className="text-yellow-300 w-20 h-20 mb-6" />
          <h2 className="text-3xl mb-2 text-pink-200">Pedido Confirmado! 🎉</h2>
          {lastOrderId && (
            <p className="text-sm opacity-90 mb-6">
              Código do pedido: <b>{lastOrderId}</b>
            </p>
          )}

          {liveError && (
            <Card className="bg-red-500/20 border border-red-400 text-white rounded-2xl p-4 mb-4">
              <div className="text-sm">
                <b>Falha ao acompanhar:</b> {liveError}
              </div>
            </Card>
          )}

          <Card className="bg-white/15 text-white rounded-2xl p-5 w-full max-w-xl border border-white/10">
            <h3 className="text-xl mb-3">Status do pedido</h3>
            <div className="mb-1 text-lg">
              <b>{statusMap[liveOrder?.status || "pending"]}</b>
            </div>

            {/* Linhas */}
            {Array.isArray(liveOrder?.lines) && liveOrder.lines.length > 0 && (
              <div className="text-left text-sm opacity-95 mt-4 space-y-2">
                {liveOrder.lines.map((l, i) => (
                  <div key={i} className="border-b border-white/10 pb-2">
                    <div className="font-semibold">
                      {l.name} · Qtd {l.qty} · R${" "}
                      {Number(l.price).toFixed(2)} cada
                    </div>
                    <div className="opacity-85">
                      {(l.items || []).join(", ")}
                    </div>
                  </div>
                ))}
                <div className="mt-2 font-semibold">
                  Total: R$ {Number(liveOrder.totalPrice || 0).toFixed(2)}
                </div>
              </div>
            )}

            {/* Compatibilidade 1-item */}
            {!liveOrder?.lines && (
              <div className="mt-4 text-sm opacity-90">
                <div>
                  <b>Ingredientes:</b>{" "}
                  {Array.isArray(liveOrder?.items)
                    ? liveOrder.items.join(", ")
                    : "-"}
                </div>
                <div>
                  <b>Quantidade:</b> {liveOrder?.qty ?? 1}
                </div>
                <div>
                  <b>Total:</b>{" "}
                  {typeof liveOrder?.price === "number" &&
                  typeof liveOrder?.qty === "number"
                    ? `R$ ${(liveOrder.price * liveOrder.qty).toFixed(2)}`
                    : "-"}
                </div>
              </div>
            )}
          </Card>

          <div className="mt-6 flex gap-3">
            <Button
              className="bg-white text-purple-800 rounded-xl px-4"
              onClick={() => setStep(2)}
            >
              Nova compra
            </Button>
            <Button
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 rounded-xl px-4"
              onClick={() => loadMyOrders()}
            >
              Meus Pedidos
            </Button>
            {isAdmin && (
              <Button
                className="bg-yellow-300 text-purple-900 rounded-xl px-4"
                onClick={() => loadAllOrders()}
              >
                Admin
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Meus Pedidos (Step 9) */}
      {step === 9 && (
        <motion.div
          className="p-6 bg-gradient-to-b from-slate-900 via-purple-900 to-fuchsia-700 min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl text-yellow-300">Meus Pedidos</h2>
            <Button
              className="bg-white text-purple-800 rounded-xl"
              onClick={() => setStep(2)}
            >
              Voltar
            </Button>
          </div>

          {ordersError && (
            <Card className="bg-red-500/20 border border-red-400 text-white rounded-2xl p-4 mb-4">
              <div className="text-sm">
                <b>Falha ao carregar pedidos:</b> {ordersError}
              </div>
            </Card>
          )}

          {ordersList.length === 0 ? (
            <Card className="bg-white/15 text-white rounded-2xl p-4">
              Você ainda não tem pedidos.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ordersList.map((o) => {
                const hasLines = Array.isArray(o.lines) && o.lines.length > 0;
                const total = hasLines
                  ? Number(o.totalPrice || 0)
                  : typeof o.price === "number" && typeof o.qty === "number"
                  ? o.price * o.qty
                  : 0;
                return (
                  <Card
                    key={o.id}
                    className="bg-white/15 text-white rounded-2xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm opacity-80">
                        #{o.id.slice(0, 8)}
                      </span>
                      <span className="text-xs opacity-75">
                        {o.status || "pending"}
                      </span>
                    </div>
                    {!hasLines ? (
                      <div className="text-sm opacity-90">
                        <div>
                          <b>Itens:</b>{" "}
                          {Array.isArray(o.items) ? o.items.join(", ") : "-"}
                        </div>
                        <div>
                          <b>Preço unitário:</b>{" "}
                          R$ {typeof o.price === "number" ? o.price.toFixed(2) : "-"}
                        </div>
                        <div>
                          <b>Quantidade:</b> {o.qty ?? "-"}
                        </div>
                        <div>
                          <b>Total:</b> {total ? `R$ ${total.toFixed(2)}` : "-"}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm opacity-90">
                        <div className="mb-2">
                          <b>Itens:</b>
                        </div>
                        <ul className="list-disc ml-4 space-y-1">
                          {o.lines.map((l, i) => (
                            <li key={i}>
                              <b>{l.name}</b> — Qtd {l.qty} — R${" "}
                              {Number(l.price).toFixed(2)} (
                              {Array.isArray(l.items) ? l.items.join(", ") : "-"}
                              )
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2">
                          <b>Total:</b> R$ {total.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Painel Admin – Pedidos (Step 10) */}
      {step === 10 && (
        <motion.div
          className="p-6 bg-gradient-to-b from-amber-200 via-yellow-300 to-orange-300 min-h-screen text-purple-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl">Painel Admin – Pedidos</h2>
            <div className="flex gap-3">
              <Button
                className="bg-white text-purple-900 rounded-xl"
                onClick={() => setStep(2)}
              >
                Voltar
              </Button>
              <Button
                className="bg-purple-800 text-white rounded-xl"
                onClick={loadAllOrders}
                disabled={adminLoading}
              >
                {adminLoading ? "Atualizando…" : "Recarregar"}
              </Button>
              <Button
                className="bg-purple-900 text-white rounded-xl"
                onClick={openAdminMenu}
              >
                <UtensilsCrossed className="inline mr-1" size={16} />
                Menu
              </Button>
            </div>
          </div>

          {adminError && (
            <Card className="bg-red-200 text-red-900 rounded-2xl p-4 mb-4 border border-red-400">
              <div className="text-sm">
                <b>Falha ao carregar pedidos:</b> {adminError}
              </div>
            </Card>
          )}

          {adminOrders.length === 0 ? (
            <Card className="bg-white/70 text-purple-900 rounded-2xl p-4">
              Nenhum pedido encontrado.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminOrders.map((o) => {
                const hasLines = Array.isArray(o.lines) && o.lines.length > 0;
                const total = hasLines
                  ? Number(o.totalPrice || 0)
                  : typeof o.price === "number" && typeof o.qty === "number"
                  ? o.price * o.qty
                  : 0;
                const shortId = o.id.slice(0, 8);
                return (
                  <Card
                    key={o.id}
                    className="bg-white/80 text-purple-900 rounded-2xl p-4 border border-white"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm opacity-80">#{shortId}</span>
                      <span className="text-xs opacity-75">
                        {o.status || "pending"}
                      </span>
                    </div>
                    <div className="text-sm opacity-90 mb-3">
                      <div>
                        <b>Cliente:</b> {o.email || "-"}
                      </div>
                      {!hasLines ? (
                        <>
                          <div>
                            <b>Itens:</b>{" "}
                            {Array.isArray(o.items) ? o.items.join(", ") : "-"}
                          </div>
                          <div>
                            <b>Qtd:</b> {o.qty ?? "-"}
                          </div>
                          <div>
                            <b>Total:</b>{" "}
                            {total ? `R$ ${total.toFixed(2)}` : "-"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mb-1">
                            <b>Linhas:</b>
                          </div>
                          <ul className="list-disc ml-5">
                            {o.lines.map((l, i) => (
                              <li key={i}>
                                <b>{l.name}</b> — {l.qty} x R${" "}
                                {Number(l.price).toFixed(2)} ·{" "}
                                {(l.items || []).join(", ")}
                              </li>
                            ))}
                          </ul>
                          <div className="mt-2">
                            <b>Total:</b> R$ {total.toFixed(2)}
                          </div>
                        </>
                      )}
                      <div>
                        <b>Entrega:</b> {o.delivery || "-"}
                      </div>
                      <div>
                        <b>Pagamento:</b> {o.paymentMethod || "-"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="bg-gray-200 text-purple-900 rounded-xl px-3"
                        disabled={updatingId === o.id}
                        onClick={() => updateOrderStatus(o.id, "pending")}
                      >
                        Recebido
                      </Button>
                      <Button
                        className="bg-yellow-300 text-purple-900 rounded-xl px-3"
                        disabled={updatingId === o.id}
                        onClick={() => updateOrderStatus(o.id, "preparing")}
                      >
                        Em preparo
                      </Button>
                      <Button
                        className="bg-orange-400 text-white rounded-xl px-3"
                        disabled={updatingId === o.id}
                        onClick={() => updateOrderStatus(o.id, "on_the_way")}
                      >
                        A caminho
                      </Button>
                      <Button
                        className="bg-green-500 text-white rounded-xl px-3"
                        disabled={updatingId === o.id}
                        onClick={() => updateOrderStatus(o.id, "delivered")}
                      >
                        Entregue
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Painel Admin – Menu (Step 11) */}
      {step === 11 && (
        <motion.div
          className="p-6 bg-gradient-to-b from-lime-200 via-emerald-200 to-teal-200 min-h-screen text-purple-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl">Painel Admin – Menu</h2>
            <div className="flex gap-3">
              <Button
                className="bg-white text-purple-900 rounded-xl"
                onClick={() => setStep(2)}
              >
                Voltar
              </Button>
              <Button
                className="bg-purple-800 text-white rounded-xl"
                onClick={openAdminMenu}
                disabled={menuLoading}
              >
                {menuLoading ? "Atualizando…" : "Recarregar"}
              </Button>
            </div>
          </div>

          {menuError && (
            <Card className="bg-red-200 text-red-900 rounded-2xl p-4 mb-4 border border-red-400">
              <div className="text-sm">
                <b>Falha ao carregar menu:</b> {menuError}
              </div>
            </Card>
          )}

          {/* Criar novo item */}
          <Card className="bg-white/80 text-purple-900 rounded-2xl p-4 mb-6 border border-white">
            <h3 className="text-xl mb-3">Criar item</h3>
            <form onSubmit={handleCreateMenuItem} className="grid md:grid-cols-5 gap-3">
              <input
                name="name"
                placeholder="Nome (ex.: Cosmic Flow)"
                className="p-2 rounded-lg border"
                required
              />
              <input
                name="items"
                placeholder="Ingredientes (sep. por vírgulas)"
                className="p-2 rounded-lg border"
                required
              />
              <input
                name="price"
                type="number"
                step="0.01"
                placeholder="Preço (ex.: 19.90)"
                className="p-2 rounded-lg border"
                required
              />
              <input
                name="gradient"
                placeholder="Gradient (ex.: from-rose-500/40 to-pink-500/40)"
                className="p-2 rounded-lg border"
              />
              <label className="flex items-center gap-2">
                <input name="active" type="checkbox" defaultChecked /> Ativo
              </label>
              <div className="md:col-span-5">
                <Button type="submit" className="bg-purple-800 text-white rounded-xl mt-2">
                  Criar
                </Button>
              </div>
            </form>
          </Card>

          {/* Lista de itens */}
          {menuAll.length === 0 ? (
            <Card className="bg-white/80 text-purple-900 rounded-2xl p-4">
              Nenhum item cadastrado.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menuAll.map((m) => (
                <Card
                  key={m.id}
                  className="bg-white/80 text-purple-900 rounded-2xl p-4 border border-white"
                >
                  <div className="flex items-center justify-between">
                    <input
                      defaultValue={m.name}
                      onBlur={(e) => handleQuickEdit(m.id, "name", e.target.value)}
                      className="font-semibold bg-transparent border-b border-transparent focus:border-purple-500 outline-none"
                    />
                    <label className="text-sm flex items-center gap-2">
                      <input
                        type="checkbox"
                        defaultChecked={!!m.active}
                        onChange={() => handleToggleActive(m.id, !!m.active)}
                      />
                      Ativo
                    </label>
                  </div>

                  <div className="mt-2">
                    <div className="text-xs opacity-80 mb-1">
                      Ingredientes (vírgulas):
                    </div>
                    <input
                      defaultValue={(m.items || []).join(", ")}
                      onBlur={(e) => handleQuickEdit(m.id, "items", e.target.value)}
                      className="w-full bg-transparent border-b border-transparent focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <span className="text-xs opacity-80">Preço:</span>{" "}
                      <input
                        defaultValue={Number(m.price).toFixed(2)}
                        onBlur={(e) => handleQuickEdit(m.id, "price", e.target.value)}
                        className="w-28 bg-transparent border-b border-transparent focus:border-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="text-xs opacity-80 mb-1">Gradient (Tailwind):</div>
                    <input
                      defaultValue={m.gradient || "from-fuchsia-500/40 to-pink-500/40"}
                      onBlur={(e) => handleQuickEdit(m.id, "gradient", e.target.value)}
                      className="w-full bg-transparent border-b border-transparent focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div className="mt-3">
                    <Button
                      className="bg-red-600 text-white rounded-xl"
                      onClick={() => removeMenuItem(m.id).then(openAdminMenu)}
                    >
                      Excluir
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

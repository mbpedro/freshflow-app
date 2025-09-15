// src/lib/menu.js
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

// --- Criar um item de menu ---
export async function createMenuItem({ name, items, price, active = true, gradient }) {
  const safeName = String(name || "").trim().slice(0, 80);
  const safeItems = Array.isArray(items)
    ? items.filter((s) => typeof s === "string" && s.trim()).slice(0, 20)
    : [];
  const safePrice = Number.isFinite(price) ? price : Number(price) || 0;
  const safeGradient =
    typeof gradient === "string" && gradient.trim()
      ? gradient.trim().slice(0, 120)
      : "from-fuchsia-500/40 to-pink-500/40";

  if (!safeName) throw new Error("Nome obrigatório.");
  if (safeItems.length === 0) throw new Error("Ingredientes obrigatórios.");
  if (safePrice <= 0) throw new Error("Preço deve ser > 0.");

  return await addDoc(collection(db, "menu"), {
    name: safeName,
    items: safeItems,
    price: safePrice,
    active: !!active,
    gradient: safeGradient,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// --- Atualizar um item de menu ---
export async function updateMenuItem(id, patch) {
  const ref = doc(db, "menu", id);
  const upd = { updatedAt: serverTimestamp() };

  if ("name" in patch)
    upd.name = String(patch.name || "").trim().slice(0, 80);
  if ("items" in patch) {
    upd.items = Array.isArray(patch.items)
      ? patch.items.filter((s) => typeof s === "string" && s.trim()).slice(0, 20)
      : [];
  }
  if ("price" in patch)
    upd.price = Number.isFinite(patch.price) ? patch.price : Number(patch.price) || 0;
  if ("active" in patch) upd.active = !!patch.active;
  if ("gradient" in patch) {
    upd.gradient =
      typeof patch.gradient === "string" && patch.gradient.trim()
        ? patch.gradient.trim().slice(0, 120)
        : "from-fuchsia-500/40 to-pink-500/40";
  }

  return await updateDoc(ref, upd);
}

// --- Remover item de menu ---
export async function removeMenuItem(id) {
  const ref = doc(db, "menu", id);
  return await deleteDoc(ref);
}

// --- Carregar todos os itens de menu (admin) ---
export async function loadAllMenu() {
  const snap = await getDocs(collection(db, "menu"));
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  return list;
}

// --- Observar apenas os ativos (para a Home) ---
export function subscribeActiveMenu(onData, onError) {
  const q = query(collection(db, "menu"), where("active", "==", true));
  return onSnapshot(q, (snap) => {
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    onData(list);
  }, onError);
}

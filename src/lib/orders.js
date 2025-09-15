import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Salva um pedido no Firestore
 * @param {Object} user - usuário logado (Firebase Auth)
 * @param {Object} order - dados do pedido (ingredientes, preço, endereço, entrega, etc.)
 */
export async function saveOrder(user, order) {
  if (!user) throw new Error("Usuário não autenticado");

  const ref = collection(db, "orders");
  return await addDoc(ref, {
    uid: user.uid,
    email: user.email,
    ...order,
    createdAt: serverTimestamp(),
    status: "pending",
  });
}

import { db } from "./firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function saveUser(user) {
  if (!user) return;
  const ref = doc(db, "users", user.uid);
  await setDoc(ref, {
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    createdAt: serverTimestamp()
  }, { merge: true });
}

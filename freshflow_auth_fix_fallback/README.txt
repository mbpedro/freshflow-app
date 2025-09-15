# Freshflow – Auth Fix (Popup→Redirect Fallback + Persistence)

Este patch melhora o login Google:
- Usa `browserLocalPersistence` (sessão persiste após reload)
- Tenta `signInWithPopup` e, se for bloqueado, cai para `signInWithRedirect` automaticamente
- Captura o resultado do redirect quando o app volta

## Como aplicar
1) Copie `src/lib/auth.js` deste patch para o seu projeto (substitua o arquivo).
2) No seu `src/App.jsx`, ajuste os imports e o handler:

   ```jsx
   import { ensurePersistence, signInWithGoogleSmart, onAuth, signOutUser } from "@/lib/auth";
   import { saveUser } from "@/lib/db";
   import { useEffect, useState } from "react";

   export default function App() {
     const [user, setUser] = useState(null);
     const [loadingLogin, setLoadingLogin] = useState(false);

     useEffect(() => {
       ensurePersistence().catch(console.error);
       const unsub = onAuth(async (u) => {
         setUser(u || null);
         if (u) await saveUser(u);
       });
       return () => unsub && unsub();
     }, []);

     const handleGoogleLogin = async () => {
       try {
         setLoadingLogin(true);
         const cred = await signInWithGoogleSmart(); // pode retornar null se redirecionar
         if (cred && cred.user) {
           console.log("Login OK", cred.user.email);
         } else {
           console.log("Indo para redirect...");
         }
       } catch (e) {
         console.error("Auth error:", e);
         alert(`Falha no login: ${e.code || ""} ${e.message || ""}`);
       } finally {
         setLoadingLogin(false);
       }
     };
   }
   ```

3) Garanta no Firebase Console:
   - Authentication → Sign‑in method → Google: **Enable**
   - Authentication → Settings → Authorized domains: **localhost**, **127.0.0.1**, e seu domínio Vercel
4) Reinicie o Vite após editar `.env`: `npm run dev`
5) Permita **pop‑ups** no navegador. Se o popup for bloqueado, o patch usa redirect automaticamente.

# Freshflow Patch – Step 9 (Meus Pedidos)

Este patch adiciona o **Step 9** para listar o histórico de pedidos do usuário.

## Arquivos incluídos
- `src/App.jsx` (atualizado com:
  - botão “Meus Pedidos” na Home (step 2);
  - `loadMyOrders()` usando Firestore (`where("uid","==", user.uid)` + `orderBy("createdAt","desc")`);
  - nova tela **Step 9** para exibir pedidos.)

## Como aplicar
1. Extraia o ZIP **na raiz do projeto** (onde está seu `package.json`) e **substitua** `src/App.jsx`.
2. Rode o projeto:
   ```bash
   npm run dev
   ```
3. Na Home → clique em **Meus Pedidos**. Se o Firestore pedir um índice, o Console mostrará um link para criar.

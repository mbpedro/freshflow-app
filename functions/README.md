# Freshflow — Firebase Functions (Pagar.me Pix)

## Endpoints
- `POST /api/pagarme/create-pix` body: `{ orderId }` → retorna `{ transaction_id, qr_code, qr_code_url, status }`
- `GET  /api/pagarme/status/:tid` → retorna `{ status, raw }`
- `POST /api/pagarme/webhook` → configure no painel do Pagar.me (produção)

## Passos
1) Dentro de `functions/`:
   ```bash
   npm install
   ```
2) Configure a chave do Pagar.me:
   ```bash
   firebase functions:config:set pagarme.api_key="SUA_CHAVE_SECRETA_PAGARME"
   ```
   Para emulador crie `.env`:
   ```
   PAGARME_API_KEY=SUA_CHAVE_SECRETA_PAGARME
   ```
3) Rodar local:
   ```bash
   firebase emulators:start
   ```
4) Deploy:
   ```bash
   firebase deploy --only functions
   ```
5) Frontend (Vite `.env`):
   ```
   VITE_API_BASE=http://localhost:5001/<SEU-PROJETO>/us-central1
   # Produção:
   # VITE_API_BASE=https://us-central1-<SEU-PROJETO>.cloudfunctions.net
   ```

> Observação: usa API **legada** `/1/transactions` para Pix. Se sua conta estiver na **nova API** (Orders/Charges), avise que eu adapto os endpoints.

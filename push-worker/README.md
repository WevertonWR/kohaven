# Korhaven Push — Servidor Gratuito no Cloudflare Workers

Este Worker envia **Web Push real** (com o ícone do Korhaven) para o seu celular mesmo quando o app estiver **fechado** ou com a tela bloqueada.

## Passo a passo (100% gratuito)

1. **Gerar as chaves VAPID**:
   - Abra o arquivo `gerar-chaves.html` no seu navegador e copie `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`.

2. **Criar o KV e fazer deploy no Cloudflare**:
   ```bash
   cd push-worker
   npx wrangler login
   npx wrangler kv namespace create KORHAVEN_PUSH_KV
   ```
   - Copie o `id` do KV retornado e cole em `wrangler.toml` no lugar de `SUBSTITUA_PELO_ID_DO_SEU_KV`.

3. **Salvar as chaves secretas e publicar**:
   ```bash
   npx wrangler secret put VAPID_PUBLIC_KEY
   npx wrangler secret put VAPID_PRIVATE_KEY
   npx wrangler deploy
   ```
   - Ao final, o Wrangler vai mostrar a URL do seu Worker (ex.: `https://korhaven-push.SEU-USUARIO.workers.dev`).

4. **Conectar no Korhaven**:
   - No Korhaven, abra **Configurações → Aplicativo & Notificações → ⚡ Push em 2º Plano (App Fechado)**, cole a URL do Worker e clique em **Conectar & Testar Push**.

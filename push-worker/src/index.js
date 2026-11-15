/* ============================================
   KORHAVEN — Cloudflare Worker (Web Push + Cron)
   Zero dependências externas (Web Crypto nativo)
   ============================================ */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

function b64uEncode(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64uDecode(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concatBytes(...arrays) {
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

async function hmacSha256(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, dataBytes);
  return new Uint8Array(sig);
}

async function createVapidJwt(audience, subject, publicKeyB64u, privateKeyB64u) {
  const pubBytes = b64uDecode(publicKeyB64u);
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
    throw new Error('VAPID_PUBLIC_KEY inválida');
  }
  const x = b64uEncode(pubBytes.slice(1, 33));
  const y = b64uEncode(pubBytes.slice(33, 65));

  const jwk = { kty: 'EC', crv: 'P-256', x, y, d: privateKeyB64u };
  const signingKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const enc = new TextEncoder();
  const header = b64uEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payload = b64uEncode(enc.encode(JSON.stringify({ aud: audience, exp, sub: subject })));
  const unsigned = `${header}.${payload}`;

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    enc.encode(unsigned)
  );
  return `${unsigned}.${b64uEncode(new Uint8Array(sig))}`;
}

async function encryptWebPushPayload(payloadObj, p256dhB64u, authB64u) {
  const enc = new TextEncoder();
  const userPubBytes = b64uDecode(p256dhB64u);
  const userAuthBytes = b64uDecode(authB64u);

  const userPubKey = await crypto.subtle.importKey(
    'raw',
    userPubBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const asKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const asPubBytes = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey));
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: userPubKey },
      asKeyPair.privateKey,
      256
    )
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // RFC 8291 key derivation
  const prkKey = await hmacSha256(userAuthBytes, sharedSecret);
  const keyInfo = concatBytes(enc.encode('WebPush: info\0'), userPubBytes, asPubBytes);
  const ikm = await hmacSha256(prkKey, concatBytes(keyInfo, new Uint8Array([1])));

  const prk = await hmacSha256(salt, ikm);
  const cekFull = await hmacSha256(prk, concatBytes(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])));
  const nonceFull = await hmacSha256(prk, concatBytes(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])));

  const cek = cekFull.slice(0, 16);
  const nonce = nonceFull.slice(0, 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const plaintext = concatBytes(enc.encode(JSON.stringify(payloadObj)), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext)
  );

  const header = new Uint8Array(16 + 4 + 1 + asPubBytes.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = asPubBytes.length;
  header.set(asPubBytes, 21);

  return concatBytes(header, ciphertext);
}

async function sendWebPush(subscription, payloadObj, env) {
  const endpointUrl = new URL(subscription.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
  const jwt = await createVapidJwt(
    audience,
    env.VAPID_SUBJECT || 'mailto:admin@korhaven.app',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );

  const body = await encryptWebPushPayload(
    payloadObj,
    subscription.keys.p256dh,
    subscription.keys.auth
  );

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '3600',
      'Urgency': 'high'
    },
    body
  });

  return res.status;
}

function getLocalClock(timezoneOffsetMinutes) {
  // timezoneOffsetMinutes: ex. -180 para Brasília (UTC-3)
  const now = new Date(Date.now() + timezoneOffsetMinutes * 60000);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  return {
    todayStr: `${y}-${m}-${d}`,
    timeStr: `${hh}:${mm}`,
    dayOfWeek: now.getUTCDay()
  };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/vapid-public-key') {
      if (!env.VAPID_PUBLIC_KEY) {
        return jsonResponse({ error: 'VAPID_PUBLIC_KEY não configurada no Worker.' }, 500);
      }
      return jsonResponse({ publicKey: env.VAPID_PUBLIC_KEY });
    }

    if (request.method === 'POST' && url.pathname === '/sync') {
      const body = await request.json();
      if (!body.deviceId || !body.subscription || !body.subscription.endpoint) {
        return jsonResponse({ error: 'deviceId e subscription são obrigatórios.' }, 400);
      }
      const key = `device:${body.deviceId}`;
      const existing = await env.KORHAVEN_PUSH_KV.get(key, { type: 'json' });
      const record = {
        deviceId: body.deviceId,
        subscription: body.subscription,
        timezoneOffset: Number.isFinite(body.timezoneOffset) ? body.timezoneOffset : -180,
        reminders: Array.isArray(body.reminders) ? body.reminders : [],
        sentKeys: (existing && existing.sentKeys) ? existing.sentKeys : {},
        updatedAt: Date.now()
      };
      await env.KORHAVEN_PUSH_KV.put(key, JSON.stringify(record));
      return jsonResponse({ ok: true, count: record.reminders.length });
    }

    if (request.method === 'POST' && url.pathname === '/test') {
      const body = await request.json();
      if (!body.subscription || !body.subscription.endpoint) {
        return jsonResponse({ error: 'subscription obrigatória.' }, 400);
      }
      const status = await sendWebPush(
        body.subscription,
        {
          title: '⚡ Korhaven Push Conectado!',
          body: 'Notificações em segundo plano ativas — vai tocar mesmo com o app fechado!',
          url: './'
        },
        env
      );
      return jsonResponse({ ok: status >= 200 && status < 300, status });
    }

    return jsonResponse({ ok: true, service: 'korhaven-push' });
  },

  async scheduled(event, env) {
    if (!env.KORHAVEN_PUSH_KV || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;

    const list = await env.KORHAVEN_PUSH_KV.list({ prefix: 'device:' });
    for (const item of list.keys) {
      const record = await env.KORHAVEN_PUSH_KV.get(item.name, { type: 'json' });
      if (!record || !record.subscription || !Array.isArray(record.reminders)) continue;

      const { todayStr, timeStr, dayOfWeek } = getLocalClock(record.timezoneOffset ?? -180);
      const sentKeys = {};
      for (const [k, v] of Object.entries(record.sentKeys || {})) {
        if (k.includes(`_${todayStr}_`)) sentKeys[k] = v;
      }

      let dirty = false;
      for (const rem of record.reminders) {
        if (rem.kind === 'habit') {
          const days = Array.isArray(rem.days) ? rem.days : [0, 1, 2, 3, 4, 5, 6];
          if (!days.includes(dayOfWeek) || rem.time !== timeStr) continue;
          const sentKey = `habit_${rem.id}_${todayStr}_${timeStr}`;
          if (sentKeys[sentKey]) continue;

          const status = await sendWebPush(
            record.subscription,
            { title: rem.title, body: rem.body, url: '#habits' },
            env
          );
          if (status === 404 || status === 410) {
            await env.KORHAVEN_PUSH_KV.delete(item.name);
            dirty = false;
            break;
          }
          sentKeys[sentKey] = true;
          dirty = true;
        } else if (rem.kind === 'note') {
          if (rem.date !== todayStr || rem.time !== timeStr) continue;
          const sentKey = `note_${rem.id}_${todayStr}_${timeStr}`;
          if (sentKeys[sentKey]) continue;

          const status = await sendWebPush(
            record.subscription,
            { title: rem.title, body: rem.body, url: `./#notes?noteId=${encodeURIComponent(rem.id)}` },
            env
          );
          if (status === 404 || status === 410) {
            await env.KORHAVEN_PUSH_KV.delete(item.name);
            dirty = false;
            break;
          }
          sentKeys[sentKey] = true;
          dirty = true;
        }
      }

      if (dirty) {
        record.sentKeys = sentKeys;
        await env.KORHAVEN_PUSH_KV.put(item.name, JSON.stringify(record));
      }
    }
  }
};

/* ============================================
   KORHAVEN — PWA & Notifications Manager
   ============================================ */

const PWA = {
  deferredPrompt: null,

  init() {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./service-worker.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registrado com sucesso:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Falha ao registrar Service Worker:', err);
          });
      });
    }

    // 2. Capture install prompt (Chrome / Android / Edge)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallUI();
    });

    // 3. Listen for Service Worker Messages (e.g. notification click redirection to Fichário)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && (event.data.type === 'OPEN_FICHARIO' || event.data.noteId)) {
          const noteId = event.data.noteId;
          if (noteId && typeof App !== 'undefined') {
            App.navigate(`notes?noteId=${encodeURIComponent(noteId)}`);
          }
        }
      });
    }

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Korhaven foi instalado com sucesso!');
      this.deferredPrompt = null;
      this.hideInstallUI();
      if (typeof Utils !== 'undefined') {
        Utils.toast('Korhaven instalado no seu celular! 🎉', 'success');
      }
    });

    // Check notification status on startup
    this.updateNotificationUI();
  },

  showInstallUI() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'flex';
    }
  },

  hideInstallUI() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  },

  async promptInstall() {
    if (!this.deferredPrompt) {
      if (typeof Utils !== 'undefined') {
        // Fallback for iOS / Safari or if already installed
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          Utils.alert('Para instalar no iPhone: Toque no botão de Compartilhar (quadrado com seta) do Safari e escolha "Adicionar à Tela de Início" 📲');
        } else {
          Utils.toast('Abra o menu do seu navegador (⋮) e selecione "Instalar Aplicativo" ou "Adicionar à tela inicial".', 'info');
        }
      }
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`[PWA] Usuário respondeu ao prompt de instalação: ${outcome}`);
    this.deferredPrompt = null;
    this.hideInstallUI();
  },

  updateNotificationUI() {
    const notifBtn = document.getElementById('pwa-notif-btn');
    const notifStatus = document.getElementById('pwa-notif-status');
    if (!notifBtn || !notifStatus) return;

    if (!('Notification' in window)) {
      notifStatus.textContent = 'Não suportado neste navegador';
      notifBtn.disabled = true;
      return;
    }

    if (Notification.permission === 'granted') {
      notifStatus.textContent = 'Notificações ativas ✅';
      notifStatus.style.color = 'var(--success)';
      notifBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        Enviar Notificação de Teste
      `;
    } else if (Notification.permission === 'denied') {
      notifStatus.textContent = 'Bloqueado nas configurações do navegador ⚠️';
      notifStatus.style.color = 'var(--danger)';
    } else {
      notifStatus.textContent = 'Não configuradas';
      notifStatus.style.color = 'var(--text-muted)';
    }
  },

  async requestAndTestNotification() {
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      if (typeof Utils !== 'undefined') {
        Utils.toast('Notificações no celular exigem HTTPS (ou localhost). Abra pelo link HTTPS do app.', 'warning');
      }
      return;
    }

    if (!('Notification' in window)) {
      if (typeof Utils !== 'undefined') {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        Utils.toast(
          isIOS
            ? 'No iPhone, instale o app na Tela de Início (Compartilhar → Adicionar à Tela de Início) para ativar notificações.'
            : 'Seu dispositivo ou navegador não suporta notificações.',
          'warning'
        );
      }
      return;
    }

    try {
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      this.updateNotificationUI();

      if (permission === 'granted') {
        if (typeof Utils !== 'undefined') {
          Utils.toast('Notificações autorizadas com sucesso! 🔔', 'success');
        }
        await this.sendNotification(
          '⚡ Korhaven Conectado!',
          'Seu celular está pronto para receber notificações de metas, hábitos e conquistas.'
        );
      } else {
        if (typeof Utils !== 'undefined') {
          Utils.toast('Permissão de notificação bloqueada. Libere nas configurações do navegador.', 'warning');
        }
      }
    } catch (err) {
      console.error('[PWA] Erro ao pedir permissão de notificações:', err);
    }
  },

  async sendNotification(title, body, url = './', noteId = null, tag = null) {
    // Sempre mostrar aviso visual dentro do app também
    if (typeof Utils !== 'undefined') {
      Utils.toast(`${title}: ${body || ''}`, 'info');
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const options = {
      body: body || 'Lembrete do seu Dashboard Korhaven',
      icon: 'assets/icon-192.png',
      badge: 'assets/icon-192.png',
      vibrate: [200, 100, 200],
      renotify: true,
      tag: tag || `korhaven_${Date.now()}`,
      data: { url: url, noteId: noteId }
    };

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const readyReg = reg || await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error('SW_TIMEOUT')), 1500))
        ]);
        if (readyReg && typeof readyReg.showNotification === 'function') {
          await readyReg.showNotification(title, options);
          return;
        }
      } catch (e) {
        console.warn('[PWA] Fallback para notificação direta:', e);
      }
    }

    try {
      new Notification(title, options);
    } catch (e) {
      console.warn('[PWA] Erro ao criar notificação:', e);
    }
  },

  // Active Reminder Engine for Habits & Notes
  _triggeredReminders: {},
  _scheduledTimers: [],

  _loadTriggeredReminders() {
    try {
      const raw = localStorage.getItem('korhaven_triggered_reminders');
      const parsed = raw ? JSON.parse(raw) : {};
      const todayStr = this._getLocalTodayStr();
      // Manter apenas chaves do dia atual para não crescer indefinidamente
      const cleaned = {};
      Object.keys(parsed).forEach(k => {
        if (k.includes(`_${todayStr}_`)) cleaned[k] = true;
      });
      this._triggeredReminders = cleaned;
    } catch (e) {
      this._triggeredReminders = {};
    }
  },

  _markTriggered(key) {
    this._triggeredReminders[key] = true;
    try {
      localStorage.setItem('korhaven_triggered_reminders', JSON.stringify(this._triggeredReminders));
    } catch (e) {}
  },

  _getLocalTodayStr(now = new Date()) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  _normalizeTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return '';
    const m = timeStr.trim().match(/^(\d{1,2}):(\d{1,2})/);
    if (!m) return '';
    return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
  },

  _toMinutes(timeStr) {
    const norm = this._normalizeTime(timeStr);
    if (!norm) return -1;
    const [h, m] = norm.split(':').map(Number);
    return h * 60 + m;
  },

  startReminderEngine() {
    this._loadTriggeredReminders();
    this.checkReminders();
    setInterval(() => this.checkReminders(), 20000);

    // No celular, ao voltar para o app / desbloquear tela, verificar lembretes perdidos imediatamente
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.checkReminders();
    });
    window.addEventListener('focus', () => this.checkReminders());
    this.syncRemindersToWorker().catch(() => {});
  },

  _clearScheduledTimers() {
    this._scheduledTimers.forEach(id => clearTimeout(id));
    this._scheduledTimers = [];
  },

  _scheduleAtMinute(targetTimeStr) {
    const now = new Date();
    const norm = this._normalizeTime(targetTimeStr);
    if (!norm) return;
    const [th, tm] = norm.split(':').map(Number);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), th, tm, 1, 0);
    const diff = target.getTime() - now.getTime();
    if (diff > 0 && diff <= 12 * 3600 * 1000) {
      const id = setTimeout(() => this.checkReminders(), diff);
      this._scheduledTimers.push(id);
    }
  },

  checkReminders() {
    if (typeof Store === 'undefined') return;

    // Check & move expired daily notes automatically
    if (Store.notes && typeof Store.notes.checkExpirations === 'function') {
      const expiredChanged = Store.notes.checkExpirations();
      if (expiredChanged && typeof App !== 'undefined' && App.currentPage === 'notes') {
        App.renderCurrentPage();
      }
    }

    this._clearScheduledTimers();

    const now = new Date();
    const todayStr = this._getLocalTodayStr(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const dayOfWeek = now.getDay(); // 0-6
    const GRACE_MINUTES = 180; // Recuperar notificações perdidas em até 3h quando o app estava minimizado no celular

    // 1. Check Habits Reminders
    try {
      const habits = Store.habits ? Store.habits.getAll() : [];
      habits.forEach(h => {
        if (!h.reminder || !h.reminder.enabled) return;
        const targetTime = this._normalizeTime(h.reminder.time);
        const targetMinutes = this._toMinutes(targetTime);
        const targetDays = Array.isArray(h.reminder.days) ? h.reminder.days : [0,1,2,3,4,5,6];
        if (!targetTime || targetMinutes < 0 || !targetDays.includes(dayOfWeek)) return;

        const diff = nowMinutes - targetMinutes;
        if (diff >= 0 && diff <= GRACE_MINUTES) {
          const triggerKey = `habit_${h.id}_${todayStr}_${targetTime}`;
          if (!this._triggeredReminders[triggerKey]) {
            this._markTriggered(triggerKey);
            this.sendNotification(
              `⚡ Lembrete: ${h.name}`,
              `Hora de cumprir seu hábito de hoje! Mantenha o streak ativo.`,
              '#habits',
              null,
              triggerKey
            );
          }
        } else if (diff < 0) {
          this._scheduleAtMinute(targetTime);
        }
      });
    } catch (err) {
      console.warn('[PWA] Erro ao verificar lembretes de hábitos:', err);
    }

    // 2. Check Notes Reminders (Fixa, Diária, Prolongada)
    try {
      const notes = Store.notes ? Store.notes.getAll() : [];
      notes.forEach(n => {
        if (n.expired || n.category === 'Expiradas') return;
        const reminder = n.reminder || {};
        if (!reminder.enabled) return;
        const targetDate = reminder.date || n.date || todayStr;
        const targetTime = this._normalizeTime(reminder.time);
        const targetMinutes = this._toMinutes(targetTime);
        if (targetDate !== todayStr || !targetTime || targetMinutes < 0) return;

        const diff = nowMinutes - targetMinutes;
        if (diff >= 0 && diff <= GRACE_MINUTES) {
          const triggerKey = `note_${n.id}_${todayStr}_${targetTime}`;
          if (!this._triggeredReminders[triggerKey]) {
            this._markTriggered(triggerKey);

            let title = `📌 Alerta: ${n.title}`;
            let message = reminder.message || `Lembrete agendado: ${n.title}`;

            if (n.type === 'diaria') {
              const impPrefix = n.importance === 'super' 
                ? '🚨 [SUPER IMPORTANTE] ' 
                : n.importance === 'importante' 
                  ? '⚠️ [IMPORTANTE] ' 
                  : '📅 ';
              title = `${impPrefix}${n.title}`;
              message = n.notifyMessage || reminder.message || `Lembrete diário: ${n.title}`;
            } else if (n.type === 'fixa') {
              title = `📌 Fixa: ${n.title}`;
              message = reminder.message || `Lembrete da anotação fixa: ${n.title}`;
            } else {
              title = `📈 Oferta: ${n.title}`;
              message = reminder.message || `Lembrete da oferta: ${n.title}`;
            }

            this.sendNotification(
              title,
              message,
              `./#notes?noteId=${encodeURIComponent(n.id)}`,
              n.id,
              triggerKey
            );
          }
        } else if (diff < 0) {
          this._scheduleAtMinute(targetTime);
        }
      });
    } catch (err) {
      console.warn('[PWA] Erro ao verificar lembretes de anotações:', err);
    }
  },

  // ============================================
  // WEB PUSH EM 2º PLANO (CLOUDFLARE WORKER)
  // ============================================
  getPushConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem('korhaven_push_config') || '{}');
      if (!saved.deviceId) {
        saved.deviceId = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        localStorage.setItem('korhaven_push_config', JSON.stringify(saved));
      }
      return {
        workerUrl: saved.workerUrl || '',
        deviceId: saved.deviceId,
        lastSync: saved.lastSync || 0
      };
    } catch (e) {
      return { workerUrl: '', deviceId: 'dev_default', lastSync: 0 };
    }
  },

  savePushConfig(patch) {
    const cur = this.getPushConfig();
    const next = { ...cur, ...patch };
    try {
      localStorage.setItem('korhaven_push_config', JSON.stringify(next));
    } catch (e) {}
    return next;
  },

  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },

  _collectRemindersPayload() {
    const reminders = [];
    if (typeof Store === 'undefined') return reminders;

    const habits = Store.habits ? Store.habits.getAll() : [];
    habits.forEach(h => {
      if (!h.reminder || !h.reminder.enabled) return;
      const time = this._normalizeTime(h.reminder.time);
      if (!time) return;
      reminders.push({
        kind: 'habit',
        id: h.id,
        title: `⚡ Lembrete: ${h.name}`,
        body: 'Hora de cumprir seu hábito de hoje! Mantenha o streak ativo.',
        time,
        days: Array.isArray(h.reminder.days) ? h.reminder.days : [0, 1, 2, 3, 4, 5, 6]
      });
    });

    const notes = Store.notes ? Store.notes.getAll() : [];
    const todayStr = this._getLocalTodayStr();
    notes.forEach(n => {
      if (n.expired || n.category === 'Expiradas') return;
      const rem = n.reminder || {};
      if (!rem.enabled) return;
      const date = rem.date || n.date || todayStr;
      const time = this._normalizeTime(rem.time);
      if (!date || !time) return;

      let title = `📌 Alerta: ${n.title}`;
      let body = rem.message || `Lembrete agendado: ${n.title}`;
      if (n.type === 'diaria') {
        const impPrefix = n.importance === 'super'
          ? '🚨 [SUPER IMPORTANTE] '
          : n.importance === 'importante'
            ? '⚠️ [IMPORTANTE] '
            : '📅 ';
        title = `${impPrefix}${n.title}`;
        body = n.notifyMessage || rem.message || `Lembrete diário: ${n.title}`;
      } else if (n.type === 'fixa') {
        title = `📌 Fixa: ${n.title}`;
        body = rem.message || `Lembrete da anotação fixa: ${n.title}`;
      } else {
        title = `📈 Oferta: ${n.title}`;
        body = rem.message || `Lembrete da oferta: ${n.title}`;
      }

      reminders.push({
        kind: 'note',
        id: n.id,
        title,
        body,
        date,
        time
      });
    });

    return reminders;
  },

  async syncRemindersToWorker(subscriptionOverride = null, showToast = false) {
    const cfg = this.getPushConfig();
    const baseUrl = (cfg.workerUrl || '').trim().replace(/\/+$/, '');
    if (!baseUrl) return { synced: false, reason: 'no_url' };
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { synced: false, reason: 'no_push_support' };
    }

    const reg = (await navigator.serviceWorker.getRegistration()) || await navigator.serviceWorker.ready;
    if (!reg || !reg.pushManager) return { synced: false, reason: 'no_sw' };

    const sub = subscriptionOverride || await reg.pushManager.getSubscription();
    if (!sub) return { synced: false, reason: 'no_subscription' };

    const reminders = this._collectRemindersPayload();
    const res = await fetch(`${baseUrl}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: cfg.deviceId,
        subscription: sub.toJSON ? sub.toJSON() : sub,
        timezoneOffset: -new Date().getTimezoneOffset(),
        reminders
      })
    });

    if (!res.ok) throw new Error(`SYNC_HTTP_${res.status}`);
    this.savePushConfig({ lastSync: Date.now() });
    if (showToast && typeof Utils !== 'undefined') {
      Utils.toast(`☁️ Push em 2º plano sincronizado (${reminders.length})`, 'info');
    }
    return { synced: true, count: reminders.length };
  },

  async connectWebPush(workerUrl) {
    const baseUrl = (workerUrl || '').trim().replace(/\/+$/, '');
    if (!baseUrl) throw new Error('Informe a URL do seu Cloudflare Worker.');
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Este navegador não suporta Web Push em segundo plano.');
    }

    const perm = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
    this.updateNotificationUI();
    if (perm !== 'granted') {
      throw new Error('Permissão de notificação negada.');
    }

    let keyRes;
    try {
      keyRes = await fetch(`${baseUrl}/vapid-public-key`);
    } catch (e) {
      throw new Error(`[1/4 Chave] ${e.message || 'Falha de rede'}`);
    }
    if (!keyRes.ok) throw new Error('Não foi possível obter a chave pública do Worker.');
    const { publicKey } = await keyRes.json();
    if (!publicKey) throw new Error('VAPID_PUBLIC_KEY não configurada no Worker.');

    const reg = (await navigator.serviceWorker.getRegistration()) || await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this._urlBase64ToUint8Array(publicKey)
        });
      } catch (subErr) {
        const msg = String(subErr && subErr.message || subErr || '');
        if (/push service error/i.test(msg)) {
          throw new Error(
            'O navegador bloqueou o registro de Push (push service error). Verifique: 1) Não estar em Aba Anônima; 2) Se usar Brave, ative "Usar serviços do Google para mensagens push" nas configurações; 3) Desative VPN/AdGuard que bloqueie fcm.googleapis.com e teste no Chrome/Edge normal.'
          );
        }
        throw new Error(`[2/4 Assinatura] ${msg}`);
      }
    }

    this.savePushConfig({ workerUrl: baseUrl });
    let syncInfo;
    try {
      syncInfo = await this.syncRemindersToWorker(sub);
    } catch (e) {
      throw new Error(`[3/4 Sync] ${e.message || 'Falha de rede'}`);
    }

    // Enviar push de teste real e verificar status do serviço FCM/APNs
    let testRes;
    try {
      testRes = await fetch(`${baseUrl}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON ? sub.toJSON() : sub })
      });
    } catch (e) {
      throw new Error(`[4/4 Teste] ${e.message || 'Falha de rede'}`);
    }
    const testData = await testRes.json().catch(() => ({}));
    if (!testRes.ok || testData.ok === false) {
      throw new Error(`Push rejeitado pelo servidor de destino (HTTP ${testData.status || testRes.status}).`);
    }

    return syncInfo;
  },

  openPushSettings() {
    const existing = document.getElementById('pwa-push-modal');
    if (existing) existing.remove();

    const cfg = this.getPushConfig();
    const modal = document.createElement('div');
    modal.id = 'pwa-push-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <span>⚡</span> Push em 2º Plano (App Fechado)
          </h3>
          <button class="modal-close" onclick="PWA.closePushSettings()">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
            Conecte seu Worker gratuito do Cloudflare (pasta <code>push-worker</code>) para receber notificações no celular na hora exata, mesmo com o Korhaven fechado.
          </p>
          <div class="form-group">
            <label class="form-label">URL do Cloudflare Worker</label>
            <input type="url" class="form-input" id="pwa-worker-url" value="${cfg.workerUrl || ''}" placeholder="https://korhaven-push.seu-usuario.workers.dev">
          </div>
          <div id="pwa-push-feedback" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">
            ${cfg.lastSync ? `Última sincronização: ${new Date(cfg.lastSync).toLocaleTimeString('pt-BR')}` : 'Ainda não conectado.'}
          </div>
        </div>
        <div class="modal-footer" style="justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn btn-secondary sm" onclick="PWA.closePushSettings()">Fechar</button>
          <button type="button" class="btn btn-primary sm" id="pwa-push-connect-btn" onclick="PWA.saveAndConnectPush()">
            🔔 Conectar & Testar Push
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 30);

    if (cfg.workerUrl) {
      const fb = document.getElementById('pwa-push-feedback');
      const base = cfg.workerUrl.trim().replace(/\/+$/, '');
      fetch(`${base}/status?deviceId=${encodeURIComponent(cfg.deviceId)}`)
        .then(r => r.json())
        .then(st => {
          if (!fb || !st.ok) return;
          const cronTxt = st.lastCron?.at ? new Date(st.lastCron.at).toLocaleTimeString('pt-BR') : 'aguardando';
          const rems = st.device?.reminders || [];
          const listTxt = rems.map(r => `${r.time} (${r.kind === 'habit' ? 'Hábito' : r.date})`).join(', ');
          fb.innerHTML = `Worker ativo · Último Cron: <strong>${cronTxt}</strong><br>No servidor: <strong>${rems.length}</strong> lembrete(s)${listTxt ? ` — ${listTxt}` : ''}`;
        })
        .catch(() => {});
    }
  },

  closePushSettings() {
    const modal = document.getElementById('pwa-push-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    }
  },

  async saveAndConnectPush() {
    const urlInput = document.getElementById('pwa-worker-url');
    const fb = document.getElementById('pwa-push-feedback');
    const btn = document.getElementById('pwa-push-connect-btn');
    if (!urlInput) return;

    if (btn) btn.disabled = true;
    if (fb) fb.textContent = 'Conectando ao Worker e registrando Push...';

    try {
      const info = await this.connectWebPush(urlInput.value);
      if (fb) {
        fb.style.color = 'var(--success)';
        fb.textContent = `✅ Conectado! ${info.count || 0} lembrete(s) sincronizado(s).`;
      }
      if (typeof Utils !== 'undefined') {
        Utils.toast('Push em 2º plano conectado com sucesso! 🔔', 'success');
      }
    } catch (err) {
      if (fb) {
        fb.style.color = 'var(--danger)';
        fb.textContent = `❌ ${err.message}`;
      }
      if (typeof Utils !== 'undefined') {
        Utils.toast(err.message, 'error');
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }
};

// Auto-initialize PWA
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    PWA.init();
    PWA.startReminderEngine();
  });
} else {
  PWA.init();
  PWA.startReminderEngine();
}

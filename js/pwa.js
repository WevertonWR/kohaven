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
    if (!('Notification' in window)) {
      if (typeof Utils !== 'undefined') {
        Utils.toast('Seu dispositivo ou navegador não suporta a API de notificações.', 'warning');
      }
      return;
    }

    try {
      const permission = await Notification.requestPermission();
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
          Utils.toast('Permissão de notificação não foi concedida.', 'warning');
        }
      }
    } catch (err) {
      console.error('[PWA] Erro ao pedir permissão de notificações:', err);
    }
  },

  async sendNotification(title, body, url = './') {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const options = {
      body: body || 'Lembrete do seu Dashboard Korhaven',
      icon: 'assets/icon-192.png',
      badge: 'assets/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: url }
    };

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, options);
        return;
      } catch (e) {
        console.warn('[PWA] Fallback para notificação direta:', e);
      }
    }

    try {
      new Notification(title, options);
    } catch (e) {
      console.warn('[PWA] Erro ao criar notificação:', e);
    }
  }
};

// Auto-initialize PWA
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PWA.init());
} else {
  PWA.init();
}

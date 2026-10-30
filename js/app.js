/* ============================================
   KORHAVEN — App Router & Initialization
   ============================================ */

const App = {
  currentPage: 'dashboard',

  routes: {
    dashboard:    { module: 'Dashboard',    icon: 'home',      label: 'Dashboard' },
    achievements: { module: 'Achievements', icon: 'trophy',    label: 'Conquistas' },
    timer:        { module: 'Timer',        icon: 'timer',     label: 'Cronômetro' },
    habits:       { module: 'Habits',       icon: 'habits',    label: 'Hábitos' },
    finances:     { module: 'Finances',     icon: 'finances',  label: 'Finanças' },
    goals:        { module: 'Goals',        icon: 'goals',     label: 'Metas' },
    evolution:    { module: 'Evolution',    icon: 'evolution',  label: 'Evolução' },
    quotes:       { module: 'Quotes',       icon: 'quote',     label: 'Frases' },
    media:        { module: 'Media',        icon: 'video',     label: 'Mídias' },
    notes:        { module: 'Notes',        icon: 'book',      label: 'Anotações' },
  },

  init() {
    // Theme setup
    const savedTheme = localStorage.getItem('korhaven_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('korhaven_theme', newTheme);
        // Dispatch event for charts if they need to re-render
        window.dispatchEvent(new Event('themechange'));
      });
    }

    // Render sidebar & mobile categories
    this.renderSidebar();
    this.renderMobileMenu();
    
    // Load User Profile
    this.updateProfileUI();

    // Route based on hash
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.navigate(hash, false);

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      const page = window.location.hash.replace('#', '') || 'dashboard';
      this.navigate(page, false);
    });

    // Keyboard shortcut: Escape to close modals and mobile menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        this.closeMobileMenu();
      }
    });

    // Horizontal scroll for top navigation
    const sidebarNav = document.getElementById('sidebar-nav');
    if (sidebarNav) {
      sidebarNav.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          sidebarNav.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }

    // Start splash particles
    this._initSplashParticles();

    // Start background particles
    this._initBgParticles();

    // Hide splash screen after animation completes
    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.classList.add('hidden');
        setTimeout(() => {
          if (this.stopSplashParticles) this.stopSplashParticles();
          splash.remove();
          this.initAuth();
        }, 600); // Remove from DOM after transition
      }
    }, 2800);
  },

  _initSplashParticles() {
    const canvas = document.getElementById('splash-particles');
    const wrapper = document.getElementById('splash-wrapper');
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    let particles = [];
    const numParticles = 120;

    // Use Korhaven accent colors: blue, purple, light blue, white
    const colors = [
      'rgba(83, 109, 255, 0.7)',  // accent (blue)
      'rgba(0, 210, 255, 0.6)',   // cyan
      'rgba(167, 139, 250, 0.6)', // purple
      'rgba(255, 255, 255, 0.3)'  // subtle white
    ];

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 0.05
      });
    }

    let animationId;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Get current wrapper bounding box to create a reaction (force field)
      const rect = wrapper.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      // The radius grows dynamically if the text expands!
      const repelRadius = Math.max(rect.width, rect.height) / 2 + 60;

      particles.forEach(p => {
        // Move
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.angularVelocity;

        // Wrap around screen
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // React to wrapper (repel away from center)
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < repelRadius && dist > 0) {
          const force = (repelRadius - dist) / repelRadius;
          // Apply a gentle outward push
          p.x += (dx / dist) * force * 4;
          p.y += (dy / dist) * force * 4;
        }

        // Draw (as glowing points of light)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0; // reset for next draw
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    this.stopSplashParticles = () => cancelAnimationFrame(animationId);

    window.addEventListener('resize', () => {
      if(canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    });
  },

  _initBgParticles() {
    const canvas = document.getElementById('bg-particles');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    let particles = [];
    const numParticles = 60; // Less dense than splash screen
    
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 3 + 1,
        // Bright blue color (accent)
        color: 'rgba(0, 150, 199, 0.4)',
        glow: 'rgba(0, 150, 199, 0.8)'
      });
    }

    const animate = () => {
      // Clear with transparency so background color shows through
      ctx.clearRect(0, 0, width, height);
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        
        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.glow;
        
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      });
      requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });
  },

  renderSidebar() {
    const sidebarNav = document.getElementById('sidebar-nav');
    if (!sidebarNav) return;

    const mainRoutes = ['dashboard', 'achievements', 'timer', 'habits'];
    const moduleRoutes = ['finances', 'goals', 'evolution', 'media', 'quotes', 'notes'];

    sidebarNav.innerHTML = `
      ${mainRoutes.map(key => {
        const route = this.routes[key];
        return `
          <div class="sidebar-nav-item ${this.currentPage === key ? 'active' : ''}"
               onclick="App.navigate('${key}')" id="nav-${key}">
            ${Utils.icons[route.icon]}
            <span>${route.label}</span>
          </div>
        `;
      }).join('')}
      ${moduleRoutes.map(key => {
        const route = this.routes[key];
        return `
          <div class="sidebar-nav-item ${this.currentPage === key ? 'active' : ''}"
               onclick="App.navigate('${key}')" id="nav-${key}">
            ${Utils.icons[route.icon]}
            <span>${route.label}</span>
          </div>
        `;
      }).join('')}
    `;
  },

  renderMobileMenu() {
    const container = document.getElementById('mobile-categories-list');
    if (!container) return;

    const allKeys = ['dashboard', 'achievements', 'timer', 'habits', 'finances', 'goals', 'evolution', 'media', 'quotes', 'notes'];

    container.innerHTML = allKeys.map(key => {
      const route = this.routes[key];
      if (!route) return '';
      const isActive = this.currentPage === key;
      const subtitle = this.getCategorySubtitle(key);
      return `
        <button class="mobile-cat-card ${isActive ? 'active' : ''}" 
                onclick="App.navigateFromMobile('${key}')" 
                data-key="${key}" 
                data-label="${route.label.toLowerCase()} ${subtitle.toLowerCase()}">
          <div class="mobile-cat-icon">
            ${Utils.icons[route.icon] || ''}
          </div>
          <div class="mobile-cat-info">
            <span class="mobile-cat-title">${route.label}</span>
            <span class="mobile-cat-sub">${subtitle}</span>
          </div>
          ${isActive 
            ? '<span class="mobile-cat-active-pill">Ativo</span>' 
            : '<svg class="mobile-cat-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>'}
        </button>
      `;
    }).join('');
  },

  getCategorySubtitle(key) {
    const subtitles = {
      dashboard: 'Visão Geral & Métricas',
      achievements: 'Conquistas & Níveis',
      timer: 'Pomodoro & Foco',
      habits: 'Hábitos & Rotina',
      finances: 'Controle Financeiro',
      goals: 'Metas & Objetivos',
      evolution: 'Gráficos & Progresso',
      quotes: 'Frases Inspiradoras',
      media: 'Livros, Filmes & Cursos',
      notes: 'Bloco de Notas & Ideias'
    };
    return subtitles[key] || 'Módulo Korhaven';
  },

  navigateFromMobile(page) {
    this.navigate(page);
    this.closeMobileMenu();
  },

  filterMobileCategories(query) {
    const q = (query || '').toLowerCase().trim();
    const cards = document.querySelectorAll('.mobile-cat-card');
    cards.forEach(card => {
      const label = card.getAttribute('data-label') || '';
      if (!q || label.includes(q)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  },

  toggleMobileMenu() {
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('mobile-drawer-overlay');
    const btn = document.getElementById('mobile-menu-btn');
    if (!drawer || !overlay) return;

    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
      this.closeMobileMenu();
    } else {
      this.renderMobileMenu();
      this.updateProfileUI();
      drawer.classList.add('open');
      overlay.classList.add('open');
      if (btn) btn.classList.add('open');
      document.body.classList.add('mobile-drawer-open');

      const search = document.getElementById('mobile-sidebar-search');
      if (search) search.value = '';
    }
  },

  closeMobileMenu() {
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('mobile-drawer-overlay');
    const btn = document.getElementById('mobile-menu-btn');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    if (btn) btn.classList.remove('open');
    document.body.classList.remove('mobile-drawer-open');
  },

  navigate(page, updateHash = true) {
    if (!this.routes[page]) page = 'dashboard';
    this.currentPage = page;

    if (updateHash) {
      window.location.hash = page;
    }

    // Update active state in desktop
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    const activeItem = document.getElementById(`nav-${page}`);
    if (activeItem) activeItem.classList.add('active');

    // Update active state in mobile menu
    this.renderMobileMenu();

    // Close mobile menu if open
    this.closeMobileMenu();

    // Render page
    this.renderCurrentPage();

    // Scroll to top on page switch
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderCurrentPage() {
    const contentEl = document.getElementById('main-content');
    if (!contentEl) return;

    const route = this.routes[this.currentPage];
    if (!route) return;

    let module = null;
    switch (route.module) {
      case 'Dashboard': module = typeof Dashboard !== 'undefined' ? Dashboard : null; break;
      case 'Achievements': module = typeof Achievements !== 'undefined' ? Achievements : null; break;
      case 'Timer': module = typeof Timer !== 'undefined' ? Timer : null; break;
      case 'Habits': module = typeof Habits !== 'undefined' ? Habits : null; break;
      case 'Finances': module = typeof Finances !== 'undefined' ? Finances : null; break;
      case 'Goals': module = typeof Goals !== 'undefined' ? Goals : null; break;
      case 'Evolution': module = typeof Evolution !== 'undefined' ? Evolution : null; break;
      case 'Quotes': module = typeof Quotes !== 'undefined' ? Quotes : null; break;
      case 'Media': module = typeof Media !== 'undefined' ? Media : null; break;
      case 'Notes': module = typeof Notes !== 'undefined' ? Notes : null; break;
    }

    if (!module) {
      contentEl.innerHTML = `
        <div class="empty-state" style="margin-top:var(--space-16);">
          <img src="assets/construction_icon.jpg" class="empty-state-img" alt="Construction">
          <h3 class="empty-state-title">Módulo em desenvolvimento</h3>
          <p class="empty-state-text">Esta seção estará disponível em breve.</p>
        </div>
      `;
      return;
    }

    contentEl.innerHTML = `<div class="main-content-inner">${module.render()}</div>`;

    // Call afterRender for chart initialization etc.
    if (module.afterRender) {
      requestAnimationFrame(() => module.afterRender());
    }

    // Update sidebar
    this.renderSidebar();
  },

  // ============================================
  // AUTHENTICATION
  // ============================================
  initAuth() {
    const authScreen = document.getElementById('auth-screen');
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');
    const subtitle = document.getElementById('auth-subtitle');
    
    if (!authScreen) return;
    
    authScreen.classList.remove('hidden');
    
    if (Store.auth.isSetup()) {
      // Show Login
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
      subtitle.textContent = `Olá de volta, ${Store.settings.get().userName || 'Usuário'}!`;
    } else {
      // Show Register
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
      subtitle.textContent = 'Crie sua conta local para começar';
    }
  },
  
  handleRegister() {
    const nameInput = document.getElementById('auth-reg-name').value.trim();
    const emailInput = document.getElementById('auth-reg-email').value.trim();
    const passInput = document.getElementById('auth-reg-pass').value.trim();
    
    if (!nameInput || !emailInput || !passInput) {
      Utils.toast('Preencha todos os campos', 'error');
      return;
    }
    
    Store.settings.save({ userName: nameInput });
    Store.auth.setCredentials(emailInput, passInput);
    
    this.updateProfileUI();
    this.unlockApp();
  },
  
  handleLogin() {
    const emailInput = document.getElementById('auth-login-email').value.trim();
    const passInput = document.getElementById('auth-login-pass').value.trim();
    
    if (!emailInput || !passInput) {
      Utils.toast('Digite seu email e senha', 'error');
      return;
    }
    
    if (Store.auth.verifyCredentials(emailInput, passInput)) {
      this.unlockApp();
    } else {
      Utils.toast('Email ou senha incorretos', 'error');
      document.getElementById('auth-login-pass').value = '';
    }
  },
  
  unlockApp() {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
      authScreen.style.opacity = '0';
      authScreen.style.visibility = 'hidden';
      setTimeout(() => authScreen.remove(), 600);
    }
    Utils.toast(`Bem-vindo, ${Store.settings.get().userName}!`, 'success');
  },

  // ============================================
  // PROFILE & SETTINGS
  // ============================================
  updateProfileUI() {
    const settings = Store.settings.get();
    const name = settings.userName || 'Usuário';
    const avatar = settings.avatarImage;
    
    // Update Sidebar
    const sbName = document.getElementById('sidebar-user-name');
    const sbInitial = document.getElementById('sidebar-avatar-initial');
    const sbImg = document.getElementById('sidebar-avatar-img');
    
    if (sbName) sbName.textContent = name;
    if (sbInitial && sbImg) {
      if (avatar) {
        sbImg.src = avatar;
        sbImg.style.display = 'block';
        sbInitial.style.display = 'none';
      } else {
        sbImg.style.display = 'none';
        sbInitial.style.display = 'block';
        sbInitial.textContent = name.charAt(0).toUpperCase();
      }
    }

    // Update Mobile Drawer Profile
    const mbName = document.getElementById('mobile-user-name');
    const mbInitial = document.getElementById('mobile-avatar-initial');
    const mbImg = document.getElementById('mobile-avatar-img');
    if (mbName) mbName.textContent = name;
    if (mbInitial && mbImg) {
      if (avatar) {
        mbImg.src = avatar;
        mbImg.style.display = 'block';
        mbInitial.style.display = 'none';
      } else {
        mbImg.style.display = 'none';
        mbInitial.style.display = 'block';
        mbInitial.textContent = name.charAt(0).toUpperCase();
      }
    }

    // Update Modal
    const modalInitial = document.getElementById('profile-modal-initial');
    const modalImg = document.getElementById('profile-modal-img');
    const btnRemove = document.getElementById('profile-avatar-remove');
    
    if (modalInitial && modalImg) {
      if (avatar) {
        modalImg.src = avatar;
        modalImg.style.display = 'block';
        modalInitial.style.display = 'none';
        if (btnRemove) btnRemove.style.display = 'inline-block';
      } else {
        modalImg.style.display = 'none';
        modalInitial.style.display = 'block';
        modalInitial.textContent = name.charAt(0).toUpperCase();
        if (btnRemove) btnRemove.style.display = 'none';
      }
    }
  },

  handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      Utils.toast('Por favor, selecione uma imagem válida.', 'error');
      return;
    }
    
    // Check size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      Utils.toast('A imagem deve ter no máximo 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Image = e.target.result;
      Store.settings.save({ avatarImage: base64Image });
      this.updateProfileUI();
      Utils.toast('Foto de perfil atualizada!', 'success');
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // reset input
  },

  removeAvatar() {
    Store.settings.save({ avatarImage: null });
    this.updateProfileUI();
    Utils.toast('Foto de perfil removida.', 'success');
  },

  openProfile() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;
    document.getElementById('profile-name-input').value = Store.settings.get().userName || 'Usuário';
    
    const emailInput = document.getElementById('profile-email-input');
    if (emailInput) {
      emailInput.value = Store._get('auth_email') || '';
    }
    const passInput = document.getElementById('profile-pass-input');
    if (passInput) {
      passInput.value = '';
    }
    
    this.updateProfileUI(); // Ensure it reflects current state
    modal.classList.add('active');
  },

  closeProfile() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.remove('active');
  },

  saveProfile() {
    const name = document.getElementById('profile-name-input').value.trim() || 'Usuário';
    Store.settings.save({ userName: name });
    
    const emailInput = document.getElementById('profile-email-input');
    if (emailInput && emailInput.value.trim()) {
      Store._set('auth_email', emailInput.value.trim());
    }
    
    const passInput = document.getElementById('profile-pass-input');
    if (passInput && passInput.value.trim()) {
      Store.auth.setPassword(passInput.value.trim());
    }

    this.updateProfileUI();
    this.closeProfile();
    Utils.toast('Perfil salvo com sucesso!', 'success');
  },

  exportData() {
    const data = Store.exportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `korhaven_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Utils.toast('Backup exportado com sucesso!', 'success');
  },

  importData(event) {
    let file;
    // If event is provided (from input onchange), use it. Otherwise, create input dynamically.
    if (event && event.target && event.target.files) {
      file = event.target.files[0];
      this._handleFileUpload(file, event.target);
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        this._handleFileUpload(e.target.files[0], null);
      };
      input.click();
    }
  },

  _handleFileUpload(file, inputElement) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Utils.confirm('Isso substituirá todos os dados atuais. Deseja continuar?', () => {
          Store.importAll(data);
          Utils.toast('Dados importados com sucesso! 🎉', 'success');
          setTimeout(() => window.location.reload(), 1500);
        });
      } catch (err) {
        Utils.toast('Erro ao importar: arquivo inválido', 'danger');
      }
      if (inputElement) inputElement.value = ''; // Reset input
    };
    reader.readAsText(file);
  },

  wipeData() {
    Utils.confirm(
      'Tem certeza de que deseja apagar TODOS os seus dados? Esta ação não pode ser desfeita.',
      () => {
        localStorage.clear();
        Utils.toast('Todos os dados foram apagados.', 'success');
        setTimeout(() => window.location.reload(), 1000);
      }
    );
  }
};

// ---- Initialize ----
document.addEventListener('DOMContentLoaded', () => App.init());

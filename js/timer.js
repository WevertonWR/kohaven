/* ============================================
   KORHAVEN — Timer / Productivity Module
   (Revisado: fixes de RAF, persistência, UX)
   ============================================ */

const Timer = {
  _rafId: null,
  _startTime: null,
  _elapsed: 0,
  _state: 'stopped', // stopped, running, paused
  _pausedAt: 0,
  _sessionName: '',
  _sessionCategory: '',
  _sessionHabitId: null,
  _startIso: null,

  render() {
    const stats = Store.timer.getStats();
    const sessions = Store.timer.getSessions();
    const categories = Store.timer.getCategories();
    const habits = Store.habits.getAll();
    const recentSessions = [...sessions].reverse().slice(0, 20);

    const displayTime = Utils.formatDuration(this._elapsed);

    return `
      <div class="animate-fadeIn">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">Cronômetro de Produtividade</h1>
            <p class="page-subtitle">Registre e analise suas horas de trabalho focado</p>
          </div>
        </div>

        <!-- Timer Display -->
        <div class="card card-degrade-escuro" style="margin-bottom: var(--space-8);">
          <div class="timer-display">
            <div class="timer-clock ${this._state}" id="timer-clock">${displayTime}</div>
            <div class="timer-label" id="timer-state-label">
              ${this._state === 'running' ? '● Gravando sessão' : this._state === 'paused' ? '⏸ Pausado' : 'Pronto para começar'}
            </div>

            <input type="text" class="timer-session-input" id="timer-session-name"
                   placeholder="Nome da sessão (opcional)"
                   value="${this._sessionName || ''}"
                   oninput="Timer._sessionName = this.value">
            <div class="custom-select-wrapper" id="timer-category-wrapper" style="margin: 0 auto; max-width: 320px; text-align: left;">
              <div class="custom-select-trigger" onclick="Timer.toggleCategoryDropdown()">
                <span id="timer-category-trigger-text">${this._sessionCategory || 'Selecione uma Categoria ou Hábito...'}</span>
                <span style="opacity: 0.5;">▼</span>
              </div>
              <div class="custom-select-options">
                <div class="custom-select-group">Categorias</div>
                ${categories.map(c => `
                  <div class="custom-select-option" onclick="Timer.selectCategory('${c.replace(/'/g, "\\'")}', null)">${c}</div>
                `).join('')}
                
                ${habits.length > 0 ? `
                  <div class="custom-select-group">Hábitos</div>
                  ${habits.map(h => `
                    <div class="custom-select-option" onclick="Timer.selectCategory('${h.name.replace(/'/g, "\\'")}', '${h.id}')">
                      ${h.name}
                    </div>
                  `).join('')}
                ` : ''}
              </div>
            </div>

            <div class="timer-controls">
              ${this._state === 'stopped' ? `
                <button class="timer-btn timer-btn-primary" onclick="Timer.start()" data-tooltip="Iniciar">
                  ${Utils.icons.play}
                </button>
              ` : this._state === 'running' ? `
                <button class="timer-btn" onclick="Timer.pause()" data-tooltip="Pausar">
                  ${Utils.icons.pause}
                </button>
                <button class="timer-btn timer-btn-primary" onclick="Timer.stop()" data-tooltip="Parar e Salvar"
                        style="background: var(--danger); border-color: var(--danger); box-shadow: 0 0 24px rgba(248,113,113,0.3);">
                  ${Utils.icons.stop}
                </button>
              ` : `
                <button class="timer-btn timer-btn-primary" onclick="Timer.resume()" data-tooltip="Continuar">
                  ${Utils.icons.play}
                </button>
                <button class="timer-btn" onclick="Timer.stop()" data-tooltip="Parar e Salvar"
                        style="border-color: var(--danger); color: var(--danger);">
                  ${Utils.icons.stop}
                </button>
              `}
            </div>
            <div id="timer-manual-container" style="margin-top: var(--space-4); text-align: center; ${this._state !== 'stopped' ? 'display: none;' : ''}">
              <button class="btn btn-ghost sm" onclick="Timer.promptManualTime()" style="font-size: var(--font-xs); color: var(--text-muted); opacity: 0.7;">
                Esqueceu de iniciar? Registrar tempo manual
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid-4 stagger" style="margin-bottom: var(--space-8);">
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Hoje</div>
              <div class="stat-card-value">${Utils.formatHours(stats.today)}</div>
            </div>
            <div class="stat-card-icon accent">${Utils.icon('timer')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Semana</div>
              <div class="stat-card-value">${Utils.formatHours(stats.week)}</div>
            </div>
            <div class="stat-card-icon accent">${Utils.icon('barChart')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Mês</div>
              <div class="stat-card-value">${Utils.formatHours(stats.month)}</div>
            </div>
            <div class="stat-card-icon success">${Utils.icon('trendUp')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Total Geral</div>
              <div class="stat-card-value">${Utils.formatHours(stats.total)}</div>
              <div class="stat-card-change up">${stats.totalSessions} sessões</div>
            </div>
            <div class="stat-card-icon warning">${Utils.icon('zap')}</div>
          </div>
        </div>

        <div class="grid-2" style="margin-bottom: var(--space-8);">
          <!-- Weekly Chart -->
          <div class="card card-degrade-escuro">
            <div class="card-header">
              <h3 class="card-title">Horas por Dia (últimos 14 dias)</h3>
            </div>
            <div class="chart-container">
              <canvas id="timer-weekly-chart"></canvas>
            </div>
          </div>

          <!-- Category Chart -->
          <div class="card card-degrade-escuro">
            <div class="card-header">
              <h3 class="card-title">Horas por Categoria</h3>
            </div>
            <div class="chart-container">
              <canvas id="timer-category-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Extra Stats + Session History -->
        <div class="grid-2-1">
          <!-- Session History -->
          <div class="card card-degrade-azul">
            <div class="card-header">
              <h3 class="card-title">Histórico de Sessões</h3>
              <span class="badge badge-ghost">${sessions.length} sessões</span>
            </div>
            ${recentSessions.length > 0 ? `
              <div>
                ${recentSessions.map(s => `
                  <div class="session-history-item">
                    <div class="session-dot"></div>
                    <div class="session-info">
                      <div class="session-name">${s.name || 'Sessão sem nome'}</div>
                      <div class="session-meta">
                        ${Utils.formatDate(s.date)} • ${s.startTime || ''} — ${s.endTime || ''}
                        ${s.category ? ` • <span class="badge badge-accent" style="font-size:10px;padding:1px 6px;">${s.category}</span>` : ''}
                      </div>
                    </div>
                    <div class="session-duration">${Utils.formatDuration(s.duration)}</div>
                    <button class="btn btn-icon btn-ghost sm session-delete" onclick="Timer.deleteSession('${s.id}')">
                      ${Utils.icons.trash}
                    </button>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="empty-state">
                <img src="assets/timer_icon.jpg" class="empty-state-img" alt="Timer">
                <h3 class="empty-state-title">Nenhuma sessão ainda</h3>
                <p class="empty-state-text">Clique no botão play acima para iniciar sua primeira sessão de foco</p>
              </div>
            `}
          </div>

          <!-- Records -->
          <div class="card card-degrade-escuro">
            <div class="card-header">
              <h3 class="card-title">Recordes</h3>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-4);">
              <div class="achievement-stat" style="padding:var(--space-4);">
                <div class="achievement-stat-label">Maior Sessão</div>
                <div class="achievement-stat-value">
                  ${stats.longestSession.duration ? Utils.formatDuration(stats.longestSession.duration) : '--:--:--'}
                </div>
                ${stats.longestSession.name ? `<div style="font-size:var(--font-xs);color:var(--text-muted);margin-top:4px;">${stats.longestSession.name}</div>` : ''}
              </div>
              <div class="achievement-stat" style="padding:var(--space-4);">
                <div class="achievement-stat-label">Dia Mais Produtivo</div>
                <div class="achievement-stat-value">
                  ${stats.bestDay ? Utils.formatHours(stats.bestDay.duration) : '--'}
                </div>
                ${stats.bestDay ? `<div style="font-size:var(--font-xs);color:var(--text-muted);margin-top:4px;">${Utils.formatDate(stats.bestDay.date)}</div>` : ''}
              </div>
              <div class="achievement-stat" style="padding:var(--space-4);">
                <div class="achievement-stat-label">Média Diária</div>
                <div class="achievement-stat-value">${Utils.formatHours(stats.avgDay)}</div>
              </div>
              <div class="achievement-stat" style="padding:var(--space-4);">
                <div class="achievement-stat-label">Total de Sessões</div>
                <div class="achievement-stat-value">${stats.totalSessions}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  afterRender() {
    this._renderWeeklyChart();
    this._renderCategoryChart();
    // Resume the tick loop if timer is running (e.g. after navigating away and back)
    if (this._state === 'running') {
      this._stopLoop();   // Cancel any orphaned loop first
      this._startLoop();  // Then start a fresh one
    }

    // Close custom select on outside click
    document.addEventListener('click', this._closeSelectOutside);
  },

  _closeSelectOutside: (e) => {
    const wrapper = document.getElementById('timer-category-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      wrapper.classList.remove('open');
    }
  },

  toggleCategoryDropdown() {
    const wrapper = document.getElementById('timer-category-wrapper');
    if (wrapper) wrapper.classList.toggle('open');
  },

  selectCategory(name, habitId) {
    this._sessionCategory = name;
    this._sessionHabitId = habitId || null;
    const trigger = document.getElementById('timer-category-trigger-text');
    if (trigger) trigger.textContent = name;
    this.toggleCategoryDropdown();
  },

  // ===========================================
  // Timer Controls
  // ===========================================
  start() {
    // Read inputs at start time
    this._sessionName = document.getElementById('timer-session-name')?.value || '';
    // _sessionCategory and _sessionHabitId are already set by selectCategory
    this._startTime = Date.now();
    this._startIso = new Date().toISOString();
    this._elapsed = 0;
    this._pausedAt = 0;
    this._totalPaused = 0;
    this._state = 'running';
    this._startLoop();
    this._updateUI();
  },

  pause() {
    // Capture current input values before re-render
    this._captureInputs();
    this._state = 'paused';
    this._pausedAt = Date.now();
    // Freeze elapsed at the exact pause moment
    this._elapsed = Date.now() - this._startTime - this._totalPaused;
    this._stopLoop();
    this._updateUI();
  },

  resume() {
    // Accumulate how long we were paused
    this._totalPaused += Date.now() - this._pausedAt;
    this._pausedAt = 0;
    this._state = 'running';
    this._startLoop();
    this._updateUI();
  },

  stop() {
    this._captureInputs();
    this._stopLoop();

    // Calculate final elapsed: if paused, use the frozen value; if running, compute now
    let duration;
    if (this._state === 'paused') {
      duration = this._elapsed; // Already frozen at pause time
    } else {
      duration = Date.now() - this._startTime - this._totalPaused;
    }

    // Ignore sessions shorter than 1 second
    if (duration < 1000) {
      this._resetState();
      App.renderCurrentPage();
      return;
    }

    const now = new Date();

    const session = {
      date: Utils.today(),
      startTime: Utils.formatTime(this._startIso),
      endTime: Utils.formatTime(now.toISOString()),
      duration: duration,
      name: this._sessionName || '',
      category: this._sessionCategory || ''
    };
    Store.timer.saveSession(session);
    const savedDuration = duration;
    
    // Auto-complete habit if linked
    if (this._sessionHabitId) {
       const today = Utils.today();
       const habit = Store.habits.getAll().find(h => h.id === this._sessionHabitId);
       
       if (habit) {
          if (habit.type === 'time') {
             // Calculate total time for this habit today (in milliseconds)
             const allSessions = Store.timer.getSessions();
             const timeToday = allSessions
                 .filter(s => s.date === today && s.category === this._sessionCategory)
                 .reduce((acc, s) => acc + (s.duration || 0), 0);
             
             // habit.durationTarget is in minutes, convert to ms
             const targetMs = (habit.durationTarget || 0) * 60000;
             
             // Only mark as complete if time is reached and it's not already checked
             if (timeToday >= targetMs && (!habit.checks || !habit.checks[today])) {
                Store.habits.toggleCheck(this._sessionHabitId, today, true);
                setTimeout(() => Utils.toast(`Hábito de tempo '${habit.name}' concluído! 🎉`, 'success'), 400);
             }
          } else {
             // Normal habit, mark complete immediately if not already
             if (!habit.checks || !habit.checks[today]) {
                Store.habits.toggleCheck(this._sessionHabitId, today);
                setTimeout(() => Utils.toast(`Hábito '${habit.name}' concluído! 🎉`, 'success'), 400);
             }
          }
       }
    }

    this._resetState();

    Utils.toast(`Sessão salva: ${Utils.formatDuration(savedDuration)} ✅`, 'success');
    App.renderCurrentPage();
  },

  deleteSession(id) {
    Utils.confirm('Excluir esta sessão?', () => {
      Store.timer.deleteSession(id);
      Utils.toast('Sessão excluída', 'danger');
      App.renderCurrentPage();
    });
  },

  promptManualTime() {
    Utils.prompt('Quantos minutos você já trabalhou? (ex: 90 para 1h30m)', '60', (value) => {
      const mins = parseInt(value, 10);
      if (isNaN(mins) || mins <= 0) {
        Utils.toast('Valor inválido. Insira os minutos.', 'error');
        return;
      }
      this._sessionName = document.getElementById('timer-session-name')?.value || 'Sessão Manual';
      const durationMs = mins * 60000;
      
      const now = new Date();
      const past = new Date(now.getTime() - durationMs);

      const session = {
        date: Utils.today(),
        startTime: Utils.formatTime(past.toISOString()),
        endTime: Utils.formatTime(now.toISOString()),
        duration: durationMs,
        name: this._sessionName,
        category: this._sessionCategory || 'Outro'
      };
      
      Store.timer.saveSession(session);
      
      if (this._sessionHabitId) {
         const today = Utils.today();
         const habit = Store.habits.getAll().find(h => h.id === this._sessionHabitId);
         if (habit) {
            if (habit.type === 'time') {
               const allSessions = Store.timer.getSessions();
               const timeToday = allSessions
                   .filter(s => s.date === today && s.category === this._sessionCategory)
                   .reduce((acc, s) => acc + (s.duration || 0), 0);
               const targetMs = (habit.durationTarget || 0) * 60000;
               if (timeToday >= targetMs && (!habit.checks || !habit.checks[today])) {
                  Store.habits.toggleCheck(this._sessionHabitId, today, true);
                  setTimeout(() => Utils.toast(`Hábito de tempo '${habit.name}' concluído! 🎉`, 'success'), 400);
               }
            } else {
               if (!habit.checks || !habit.checks[today]) {
                  Store.habits.toggleCheck(this._sessionHabitId, today);
                  setTimeout(() => Utils.toast(`Hábito '${habit.name}' concluído! 🎉`, 'success'), 400);
               }
            }
         }
      }

      Utils.toast(`Tempo manual registrado: ${Utils.formatDurationShort(durationMs)} ✅`, 'success');
      App.renderCurrentPage();
    });
  },

  // ===========================================
  // Internal loop management
  // ===========================================
  _startLoop() {
    this._stopLoop(); // Always clean up first
    const tick = () => {
      if (this._state !== 'running') return;
      this._elapsed = Date.now() - this._startTime - this._totalPaused;
      const clockEl = document.getElementById('timer-clock');
      if (clockEl) {
        clockEl.textContent = Utils.formatDuration(this._elapsed);
      }
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  },

  _stopLoop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  },

  _resetState() {
    this._state = 'stopped';
    this._elapsed = 0;
    this._startTime = null;
    this._startIso = null;
    this._pausedAt = 0;
    this._totalPaused = 0;
    this._sessionName = '';
    this._sessionCategory = '';
    this._sessionHabitId = null;
  },

  _captureInputs() {
    const nameEl = document.getElementById('timer-session-name');
    if (nameEl) this._sessionName = nameEl.value;
  },

  _updateUI() {
    const clockEl = document.getElementById('timer-clock');
    const labelEl = document.getElementById('timer-state-label');
    const controlsEl = document.querySelector('.timer-controls');

    if (clockEl) {
      clockEl.className = `timer-clock ${this._state}`;
      clockEl.textContent = Utils.formatDuration(this._elapsed);
    }
    if (labelEl) {
      labelEl.textContent =
        this._state === 'running' ? '● Gravando sessão' :
        this._state === 'paused'  ? '⏸ Pausado' :
                                    'Pronto para começar';
    }
    if (controlsEl) {
      controlsEl.innerHTML = this._state === 'stopped' ? `
        <button class="timer-btn timer-btn-primary" onclick="Timer.start()" data-tooltip="Iniciar">
          ${Utils.icons.play}
        </button>
      ` : this._state === 'running' ? `
        <button class="timer-btn" onclick="Timer.pause()" data-tooltip="Pausar">
          ${Utils.icons.pause}
        </button>
        <button class="timer-btn timer-btn-primary" onclick="Timer.stop()" data-tooltip="Parar e Salvar"
                style="background: var(--danger); border-color: var(--danger); box-shadow: 0 0 24px rgba(248,113,113,0.3);">
          ${Utils.icons.stop}
        </button>
      ` : `
        <button class="timer-btn timer-btn-primary" onclick="Timer.resume()" data-tooltip="Continuar">
          ${Utils.icons.play}
        </button>
        <button class="timer-btn" onclick="Timer.stop()" data-tooltip="Parar e Salvar"
                style="border-color: var(--danger); color: var(--danger);">
          ${Utils.icons.stop}
        </button>
      `;
    }
    
    const manualContainer = document.getElementById('timer-manual-container');
    if (manualContainer) {
      manualContainer.style.display = this._state === 'stopped' ? 'block' : 'none';
    }
  },

  // ===========================================
  // Charts
  // ===========================================
  _renderWeeklyChart() {
    const canvas = document.getElementById('timer-weekly-chart');
    if (!canvas) return;

    const sessions = Store.timer.getSessions();
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const data = days.map(date => {
      const daySessions = sessions.filter(s => s.date === date);
      return Math.round(daySessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60000); // em minutos
    });

    const labels = days.map(d => {
      const date = new Date(d + 'T12:00:00');
      return `${date.getDate()}/${date.getMonth()+1}`;
    });

    const ctx = canvas.getContext('2d');
    const blueGrad = ctx.createLinearGradient(0, 0, 0, 300);
    blueGrad.addColorStop(0, 'rgba(83, 109, 255, 0.9)');
    blueGrad.addColorStop(1, 'rgba(0, 210, 255, 0.1)');

    if (window._timerWeeklyChart) window._timerWeeklyChart.destroy();

    window._timerWeeklyChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Horas',
          data,
          backgroundColor: 'rgba(2, 62, 138, 0.9)',
          borderColor: 'rgba(144, 224, 239, 0.15)',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(21, 24, 32, 0.9)',
            titleColor: '#F4F6F8',
            bodyColor: '#D9D9D3',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y; // in minutes
                if (val < 60) return `${val} min`;
                const h = Math.floor(val / 60);
                const m = val % 60;
                return m > 0 ? `${h}h ${m}m` : `${h}h`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: 'rgba(255, 255, 255, 0.9)', font: { family: 'Inter', size: 11 }, maxRotation: 45 }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(144, 224, 239, 0.05)', borderDash: [5, 5] },
            ticks: { 
              color: 'rgba(255, 255, 255, 0.9)', 
              font: { family: 'Inter', size: 11 }, 
              callback: (v) => {
                if (v === 0) return '0h';
                if (v < 60) return v + 'm';
                const h = Math.floor(v / 60);
                const m = v % 60;
                return m > 0 ? `${h}h ${m}m` : `${h}h`;
              }, 
              padding: 10 
            },
            border: { display: false }
          }
        }
      }
    });
  },

  _renderCategoryChart() {
    const canvas = document.getElementById('timer-category-chart');
    if (!canvas) return;

    const stats = Store.timer.getStats();
    const categories = Object.entries(stats.categoryTotals).map(([name, totalDuration]) => ({ name, totalDuration }));

    if (categories.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('Sem dados de categoria', canvas.width / 2, canvas.height / 2);
      return;
    }

    const colors = ['#00B4D8', '#48CAE4', '#90E0EF', '#0077B6', '#023E8A', '#CAF0F8', '#0096C7'];

    if (window._timerCategoryChart) window._timerCategoryChart.destroy();

    window._timerCategoryChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: categories.map(c => c.name),
        datasets: [{
          data: categories.map(c => c.totalDuration),
          backgroundColor: colors.slice(0, categories.length),
          borderWidth: 2,
          borderColor: '#03045E',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#90E0EF', font: { family: 'Inter', size: 11 }, padding: 12, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: 'rgba(3, 4, 94, 0.95)',
            titleColor: '#CAF0F8', 
            bodyColor: '#90E0EF',
            borderColor: 'rgba(144, 224, 239, 0.2)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw; // in ms
                return ' ' + Utils.formatDurationShort(val);
              }
            }
          }
        }
      },
      plugins: [{
        id: 'centerText',
        beforeDraw: function(chart) {
          if (chart.config.type !== 'doughnut') return;
          const ctx = chart.ctx;
          ctx.restore();
          
          const meta = chart.getDatasetMeta(0);
          if (!meta.data || !meta.data.length) return;
          
          const centerX = meta.data[0].x;
          const centerY = meta.data[0].y;
          
          ctx.textBaseline = 'middle';
          
          const totalMs = categories.reduce((sum, c) => sum + c.totalDuration, 0);
          const text = Utils.formatHours(totalMs);
          
          ctx.font = 'bold 26px Inter';
          ctx.fillStyle = '#CAF0F8';
          ctx.fillText(text, centerX - ctx.measureText(text).width / 2, centerY - 6);
          
          const subText = 'Total';
          ctx.font = '500 13px Inter';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillText(subText, centerX - ctx.measureText(subText).width / 2, centerY + 18);
          
          ctx.save();
        }
      }]
    });
  }
};

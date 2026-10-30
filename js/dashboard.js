/* ============================================
   KORHAVEN — Dashboard (Home)
   ============================================ */

const Dashboard = {
  render() {
    Store.goals.evaluateSmartMilestones();
    const settings = Store.settings.get();
    const greeting = Utils.getGreeting();
    const now = new Date();
    const dateStr = Utils.formatDate(now.toISOString(), 'weekday');

    // Get data for summary
    const achievements = Store.achievements.getAll();
    const timerStats = Store.timer.getStats();
    const allHabits = Store.habits.getAll();
    const goals = Store.goals.getAll();
    // Always show a random quote on the dashboard for dynamic feel
    const quote = Store.quotes.getRandomQuote();

    // Calculate habit completion rate for today
    const today = Utils.today();
    const currentDayOfWeek = new Date().getDay();
    
    // Filter habits that should appear today
    const habits = allHabits.filter(h => {
      if (h.frequency === 'specific' && Array.isArray(h.specificDays)) {
        return h.specificDays.includes(currentDayOfWeek);
      }
      return true;
    });

    const todayChecked = habits.filter(h => h.checks && h.checks[today]).length;
    const habitRate = habits.length > 0 ? Math.round((todayChecked / habits.length) * 100) : 0;

    // Active goals progress
    const activeGoals = goals.filter(g => (g.progress || 0) < 100);
    const avgGoalProgress = activeGoals.length > 0
      ? Math.round(activeGoals.reduce((s, g) => s + (g.progress || 0), 0) / activeGoals.length)
      : 0;

    return `
      <div class="animate-fadeIn">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header-left">
            <p class="page-greeting">${greeting} 👋</p>
            <h1 class="page-title">Dashboard</h1>
            <p class="page-subtitle">Sua visão consolidada de progresso e evolução</p>
          </div>
          <div class="page-header-right">
            <div class="page-date">
              ${Utils.icon('calendar')}
              <span>${dateStr}</span>
            </div>
          </div>
        </div>

        <!-- Quote of the Day -->
        ${quote ? `
          <div class="dashboard-quote animate-slideUp">
            <p class="dashboard-quote-text">${quote.text}</p>
            ${quote.author ? `<p class="dashboard-quote-author">— ${quote.author}</p>` : ''}
          </div>
        ` : `
          <div class="dashboard-quote animate-slideUp">
            <p class="dashboard-quote-text">Adicione frases motivacionais no Mural de Frases para vê-las aqui.</p>
            <p class="dashboard-quote-author" style="cursor:pointer" onclick="App.navigate('quotes')">→ Ir para o Mural</p>
          </div>
        `}

        <!-- Stat Cards -->
        <div class="grid-4 stagger" style="margin-bottom: var(--space-8);">
          <div class="stat-card card-degrade-azul" onclick="App.navigate('achievements')" style="cursor:pointer">
            <div class="stat-card-info">
              <div class="stat-card-label">Conquistas Ativas</div>
              <div class="stat-card-value">${achievements.length}</div>
              ${achievements.length > 0 ? `
                <div class="stat-card-change up">
                  ↑ ${this._getLongestStreak(achievements)}
                </div>
              ` : ''}
            </div>
            <div class="stat-card-icon accent">${Utils.icon('trophy')}</div>
          </div>

          <div class="stat-card card-degrade-azul" onclick="App.navigate('timer')" style="cursor:pointer">
            <div class="stat-card-info">
              <div class="stat-card-label">Horas Hoje</div>
              <div class="stat-card-value">${Utils.formatHours(timerStats.today)}</div>
              <div class="stat-card-change ${timerStats.week > 0 ? 'up' : ''}">
                ${Utils.formatDurationShort(timerStats.week)} na semana
              </div>
            </div>
            <div class="stat-card-icon accent">${Utils.icon('timer')}</div>
          </div>

          <div class="stat-card card-degrade-azul" onclick="App.navigate('habits')" style="cursor:pointer">
            <div class="stat-card-info">
              <div class="stat-card-label">Hábitos Hoje</div>
              <div class="stat-card-value">${habitRate}%</div>
              <div class="stat-card-change ${habitRate >= 80 ? 'up' : ''}">
                ${todayChecked}/${habits.length} concluídos
              </div>
            </div>
            <div class="stat-card-icon success">${Utils.icon('habits')}</div>
          </div>

          <div class="stat-card card-degrade-azul" onclick="App.navigate('goals')" style="cursor:pointer">
            <div class="stat-card-info">
              <div class="stat-card-label">Progresso Metas</div>
              <div class="stat-card-value">${avgGoalProgress}%</div>
              <div class="stat-card-change ${avgGoalProgress > 0 ? 'up' : ''}">
                ${activeGoals.length} meta${activeGoals.length !== 1 ? 's' : ''} ativa${activeGoals.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div class="stat-card-icon warning">${Utils.icon('goals')}</div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid-2-1" style="margin-bottom: var(--space-8);">
          <!-- Timer Chart -->
          <div class="card card-degrade-escuro">
            <div class="card-header">
              <h3 class="card-title">Horas Produtivas</h3>
              <span class="section-action" onclick="App.navigate('timer')">Ver tudo →</span>
            </div>
            <div class="chart-container">
              <canvas id="dashboard-timer-chart"></canvas>
            </div>
          </div>

          <!-- Active Achievements -->
          <div class="card card-degrade-escuro">
            <div class="card-header">
              <h3 class="card-title">Conquistas Ativas</h3>
              <span class="section-action" onclick="App.navigate('achievements')">Ver tudo →</span>
            </div>
            <div class="dashboard-achievements-mini">
              ${achievements.length > 0
                ? achievements.slice(0, 5).map(a => {
                    const days = Utils.daysBetween(a.startDate);
                    const dur = Utils.formatDaysDuration(days);
                    return `
                      <div class="achievement-mini-card">
                        <div class="achievement-mini-icon">${a.icon || '🏆'}</div>
                        <div class="achievement-mini-info">
                          <div class="achievement-mini-name">${a.name}</div>
                          <div class="achievement-mini-time">${dur.value} ${dur.unit}</div>
                        </div>
                      </div>
                    `;
                  }).join('')
                : `
                  <div class="empty-state" style="padding: var(--space-6);">
                    <img src="assets/trophy_icon.jpg" class="empty-state-img" alt="Trophy">
                    <p class="empty-state-text">Nenhuma conquista registrada</p>
                    <button class="btn btn-primary btn-sm" onclick="App.navigate('achievements')">
                      ${Utils.icon('plus')} Criar Conquista
                    </button>
                  </div>
                `
              }
            </div>
          </div>
        </div>

        <!-- Bottom Grid -->
        <div class="grid-3 stagger">
          <!-- Today's Habits -->
          <div class="card card-degrade-escuro">
            <div class="card-header">
              <h3 class="card-title">Hábitos de Hoje</h3>
              <span class="section-action" onclick="App.navigate('habits')">Ver tudo →</span>
            </div>
            <div class="dashboard-habits-list">
              ${habits.length > 0 ? habits.slice(0, 6).map(h => {
                const isChecked = h.checks && h.checks[today];
                return `
                <div class="dash-habit-card ${isChecked ? 'completed' : ''}" onclick="Dashboard.toggleHabit('${h.id}')">
                  <div class="dash-habit-check ${isChecked ? 'checked' : ''}">
                    ${isChecked ? Utils.icons.check : ''}
                  </div>
                  <div class="dash-habit-info">
                    <span class="dash-habit-name">${h.name}</span>
                    ${h.category && h.category !== 'todos' ? `<span class="dash-habit-category">${h.category}</span>` : ''}
                  </div>
                  ${isChecked ? `<div class="dash-habit-streak" style="width:16px; height:16px; color:var(--accent); display:flex; align-items:center; justify-content:center;">${Utils.icons.flame}</div>` : ''}
                </div>
                `;
              }).join('') : `
                <div class="empty-state" style="padding: var(--space-6);">
                  <img src="assets/check_icon.jpg" class="empty-state-img" alt="Check">
                  <p class="empty-state-text">Nenhum hábito cadastrado</p>
                  <button class="btn btn-primary btn-sm" onclick="App.navigate('habits')">
                    ${Utils.icon('plus')} Criar Hábito
                  </button>
                </div>
              `}
            </div>
          </div>

          <!-- Recent Timer Sessions -->
          <div class="card card-degrade-escuro">
            <div class="card-header">
              <h3 class="card-title">Sessões Recentes</h3>
              <span class="section-action" onclick="App.navigate('timer')">Ver tudo →</span>
            </div>
            ${Store.timer.getSessions().length > 0
              ? Store.timer.getSessions().slice(-5).reverse().map(s => `
                <div class="session-history-item" style="padding: var(--space-2) 0;">
                  <div class="session-dot"></div>
                  <div class="session-info">
                    <div class="session-name">${s.name || 'Sessão'}</div>
                    <div class="session-meta">${Utils.formatDate(s.date)}</div>
                  </div>
                  <div class="session-duration">${Utils.formatDuration(s.duration)}</div>
                </div>
              `).join('')
              : `
                <div class="empty-state" style="padding: var(--space-6);">
                  <img src="assets/timer_icon.jpg" class="empty-state-img" alt="Timer">
                  <p class="empty-state-text">Nenhuma sessão registrada</p>
                  <button class="btn btn-primary btn-sm" onclick="App.navigate('timer')">
                    ${Utils.icon('play')} Iniciar Timer
                  </button>
                </div>
              `
            }
          </div>

          <!-- Goals Progress -->
          <div class="card card-degrade-azul">
            <div class="card-header">
              <h3 class="card-title">Progresso de Metas</h3>
              <span class="section-action" onclick="App.navigate('goals')">Ver tudo →</span>
            </div>
            ${goals.length > 0 ? goals.slice(0, 4).map(g => `
              <div style="margin-bottom: var(--space-4);">
                <div class="progress-info">
                  <span class="progress-label">${g.name}</span>
                  <span class="progress-value">${g.progress || 0}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-bar-fill" style="width: ${g.progress || 0}%"></div>
                </div>
              </div>
            `).join('') : `
              <div class="empty-state" style="padding: var(--space-6);">
                <img src="assets/target_icon.jpg" class="empty-state-img" alt="Target">
                <p class="empty-state-text">Nenhuma meta definida</p>
                <button class="btn btn-primary btn-sm" onclick="App.navigate('goals')">
                  ${Utils.icon('plus')} Criar Meta
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  },

  afterRender() {
    this._renderTimerChart();
  },

  toggleHabit(habitId) {
    Store.habits.toggleCheck(habitId, Utils.today());
    App.renderCurrentPage();
  },

  _getLongestStreak(achievements) {
    if (achievements.length === 0) return '';
    const longest = achievements.reduce((max, a) => {
      const days = Utils.daysBetween(a.startDate);
      return days > max.days ? { days, name: a.name } : max;
    }, { days: 0, name: '' });
    const dur = Utils.formatDaysDuration(longest.days);
    return `Maior: ${dur.value} ${dur.unit}`;
  },

  _renderTimerChart() {
    const canvas = document.getElementById('dashboard-timer-chart');
    if (!canvas) return;

    const sessions = Store.timer.getSessions();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }

    const data = last7Days.map(date => {
      const daySessions = sessions.filter(s => s.date === date);
      return Math.round(daySessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60000); // em minutos
    });

    const labels = last7Days.map(d => {
      const date = new Date(d + 'T12:00:00');
      return Utils.weekDays[date.getDay()];
    });

    const ctx = canvas.getContext('2d');
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const chartColor = '#00E5FF';
    const chartColorFade = isLight ? 'rgba(0, 150, 199, 0.1)' : 'rgba(0, 229, 255, 0.05)';
    const textColor = isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)';
    const gridColor = isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.05)';

    const blueGrad = ctx.createLinearGradient(0, 0, 0, 300);
    blueGrad.addColorStop(0, chartColor);
    blueGrad.addColorStop(1, isLight ? '#0077B6' : '#7E57C2');

    if (window._dashChart) window._dashChart.destroy();
    window._dashChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Horas',
          data,
          backgroundColor: data.map(v => v > 0 ? blueGrad : chartColorFade),
          hoverBackgroundColor: chartColor,
          borderColor: 'transparent',
          borderWidth: 0,
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
            backgroundColor: isLight ? '#0f172a' : 'rgba(3, 4, 94, 0.95)',
            titleColor: '#ffffff',
            bodyColor: 'rgba(255, 255, 255, 0.8)',
            borderColor: isLight ? 'rgba(255,255,255,0.1)' : 'rgba(144, 224, 239, 0.2)',
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
            grid: {
              color: gridColor,
              drawBorder: false
            },
            ticks: { color: textColor, font: { family: 'Inter', size: 12 } }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor,
              drawBorder: false
            },
            ticks: {
              color: textColor,
              font: { family: 'Inter', size: 12 },
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
  }
};

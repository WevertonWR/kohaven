/* ============================================
   KORHAVEN — Goals & Systems Module (v2)
   Suporte para metas de marcos, streaks e atividades
   ============================================ */

const Goals = {
  _view: 'active', // active, streaks, completed

  render() {
    Store.goals.evaluateSmartMilestones();
    const goals = Store.goals.getAll();
    
    // Separate goal types
    const streakGoals = goals.filter(g => g.goalType === 'streak');
    const milestoneGoals = goals.filter(g => g.goalType !== 'streak');
    
    const activeMS = milestoneGoals.filter(g => (g.progress || 0) < 100);
    const completedMS = milestoneGoals.filter(g => (g.progress || 0) >= 100);
    
    // Streak stats
    const activeStreaks = streakGoals.filter(g => !g.completed);
    const completedStreaks = streakGoals.filter(g => g.completed);
    
    const totalActive = activeMS.length + activeStreaks.length;
    const totalCompleted = completedMS.length + completedStreaks.length;
    
    // Best streak across all streak goals
    const bestStreak = streakGoals.length > 0 
      ? Math.max(0, ...streakGoals.map(g => this._getCurrentStreak(g)))
      : 0;

    return `
      <div class="animate-fadeIn">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">Metas & Sistemas</h1>
            <p class="page-subtitle">Defina objetivos, acompanhe streaks e conquiste suas metas</p>
          </div>
          <div class="page-header-right">
            <button class="btn btn-primary" onclick="Goals.openNewGoalTypeSelector()">
              ${Utils.icon('plus')} Nova Meta
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid-4 stagger" style="margin-bottom: var(--space-8);">
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Metas Ativas</div>
              <div class="stat-card-value">${totalActive}</div>
            </div>
            <div class="stat-card-icon accent">${Utils.icon('goals')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Concluídas</div>
              <div class="stat-card-value">${totalCompleted}</div>
            </div>
            <div class="stat-card-icon success">${Utils.icon('check')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Melhor Streak</div>
              <div class="stat-card-value">${bestStreak} dias</div>
            </div>
            <div class="stat-card-icon warning">${Utils.icon('flame')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Streaks Ativos</div>
              <div class="stat-card-value">${activeStreaks.length}</div>
            </div>
            <div class="stat-card-icon accent">${Utils.icon('zap')}</div>
          </div>
        </div>

        <!-- View Tabs -->
        <div class="tabs" style="margin-bottom: var(--space-6);">
          <div class="tab-item ${this._view === 'active' ? 'active' : ''}" onclick="Goals.setView('active')">Metas Ativas</div>
          <div class="tab-item ${this._view === 'streaks' ? 'active' : ''}" onclick="Goals.setView('streaks')">Streaks</div>
          <div class="tab-item ${this._view === 'completed' ? 'active' : ''}" onclick="Goals.setView('completed')">Concluídas</div>
        </div>

        ${this._view === 'active' ? this._renderActiveView(activeMS, activeStreaks) : ''}
        ${this._view === 'streaks' ? this._renderStreaksView(streakGoals) : ''}
        ${this._view === 'completed' ? this._renderCompletedView(completedMS, completedStreaks) : ''}
      </div>

      <!-- Goal Type Selector Modal -->
      <div class="modal-overlay" id="goal-type-modal">
        <div class="modal" style="max-width: 500px;">
          <div class="modal-header">
            <h3 class="modal-title">Que tipo de meta você quer criar?</h3>
            <button class="modal-close" onclick="Goals.closeTypeModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
              <button class="card card-degrade-escuro" style="padding: var(--space-6); text-align: center; cursor: pointer; border: 2px solid transparent; transition: all 0.3s;" 
                      onclick="Goals.closeTypeModal(); Goals.openModal(null, 'milestone')"
                      onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='transparent'">
                <div style="font-size: 2.5rem; margin-bottom: var(--space-3);">🎯</div>
                <div style="font-size: var(--font-lg); font-weight: var(--fw-bold); color: var(--text-primary); margin-bottom: var(--space-2);">Meta por Marcos</div>
                <div style="font-size: var(--font-sm); color: var(--text-muted); line-height: 1.5;">Defina etapas e acompanhe o progresso. Ex: "Ler 24 livros", "Poupar R$10mil"</div>
              </button>
              <button class="card card-degrade-escuro" style="padding: var(--space-6); text-align: center; cursor: pointer; border: 2px solid transparent; transition: all 0.3s;"
                      onclick="Goals.closeTypeModal(); Goals.openStreakModal()"
                      onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='transparent'">
                <div style="font-size: 2.5rem; margin-bottom: var(--space-3);">🔥</div>
                <div style="font-size: var(--font-lg); font-weight: var(--fw-bold); color: var(--text-primary); margin-bottom: var(--space-2);">Meta por Streak</div>
                <div style="font-size: var(--font-sm); color: var(--text-muted); line-height: 1.5;">Sequência de dias consecutivos. Ex: "5 dias treinando", "30 dias lendo"</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Milestone Goal Modal -->
      <div class="modal-overlay" id="goal-modal">
        <div class="modal" style="max-width:640px;">
          <div class="modal-header">
            <h3 class="modal-title" id="goal-modal-title">Nova Meta</h3>
            <button class="modal-close" onclick="Goals.closeModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="goal-edit-id" value="">
            <div class="form-group">
              <label class="form-label">Nome da Meta</label>
              <input type="text" class="form-input" id="goal-name" placeholder="Ex: Ler 24 livros, Poupar R$10mil...">
            </div>
            <div class="form-group">
              <label class="form-label">Descrição / Sistema</label>
              <textarea class="form-input" id="goal-description" placeholder="O processo/rotina para atingir essa meta..."></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Prazo</label>
                <input type="date" class="form-input" id="goal-deadline">
              </div>
              <div class="form-group">
                <label class="form-label">Categoria</label>
                <div class="custom-select-wrapper" id="goal-category-wrapper">
                  <input type="hidden" id="goal-category" value="pessoal">
                  <div class="custom-select-trigger" onclick="Goals.toggleCategoryDropdown()">
                    <span id="goal-category-trigger-text">🧠 Pessoal</span>
                    <span style="opacity: 0.5;">▼</span>
                  </div>
                  <div class="custom-select-options">
                    <div class="custom-select-option" onclick="Goals.selectCategory('pessoal', '🧠 Pessoal')">🧠 Pessoal</div>
                    <div class="custom-select-option" onclick="Goals.selectCategory('profissional', '💼 Profissional')">💼 Profissional</div>
                    <div class="custom-select-option" onclick="Goals.selectCategory('financeiro', '💰 Financeiro')">💰 Financeiro</div>
                    <div class="custom-select-option" onclick="Goals.selectCategory('saúde', '🏃 Saúde')">🏃 Saúde</div>
                    <div class="custom-select-option" onclick="Goals.selectCategory('educação', '📚 Educação')">📚 Educação</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Marcos / Etapas</label>
              <div id="goal-milestones-list"></div>
              <button class="btn btn-sm btn-secondary" onclick="Goals.addMilestoneInput()" style="margin-top:var(--space-2);">
                ${Utils.icon('plus')} Adicionar Marco
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Goals.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Goals.saveFromModal()">Salvar</button>
          </div>
        </div>
      </div>

      <!-- Streak Goal Modal -->
      <div class="modal-overlay" id="streak-modal">
        <div class="modal" style="max-width: 520px;">
          <div class="modal-header">
            <h3 class="modal-title" id="streak-modal-title">Nova Meta de Streak</h3>
            <button class="modal-close" onclick="Goals.closeStreakModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="streak-edit-id" value="">

            <div class="form-group">
              <label class="form-label">O que é a meta?</label>
              <input type="text" class="form-input" id="streak-name" placeholder="Ex: Treinar, Ler 30 min, Estudar, Meditar...">
            </div>

            <div class="form-group">
              <label class="form-label">Ícone / Emoji</label>
              <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                ${['🏋️','📖','📚','🧘','💻','🏃','🎯','✍️','🎵','💪','🥗','💤'].map(emoji => `
                  <button type="button" class="streak-emoji-btn" onclick="Goals.selectStreakEmoji('${emoji}')"
                          style="font-size: 1.5rem; padding: var(--space-2); border-radius: var(--radius-md); background: var(--bg-surface); border: 2px solid var(--border); cursor: pointer; transition: all 0.2s; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;"
                          onmouseover="this.style.borderColor='var(--accent)'" onmouseout="if(!this.classList.contains('selected'))this.style.borderColor='var(--border)'">${emoji}</button>
                `).join('')}
              </div>
              <input type="hidden" id="streak-emoji" value="🏋️">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Meta de Dias Consecutivos</label>
                <input type="number" class="form-input" id="streak-target-days" placeholder="Ex: 5, 10, 30..." min="1" value="7">
                <div class="form-hint">Quantos dias seguidos você quer completar</div>
              </div>
              <div class="form-group">
                <label class="form-label">Categoria</label>
                <div class="custom-select-wrapper" id="streak-category-wrapper">
                  <input type="hidden" id="streak-category" value="saúde">
                  <div class="custom-select-trigger" onclick="Goals.toggleStreakCategoryDropdown()">
                    <span id="streak-category-display">🏃 Saúde</span>
                    <span style="opacity: 0.5;">▼</span>
                  </div>
                  <div class="custom-select-options">
                    <div class="custom-select-option" onclick="Goals.selectStreakCategory('saúde', '🏃 Saúde')">🏃 Saúde</div>
                    <div class="custom-select-option" onclick="Goals.selectStreakCategory('educação', '📚 Educação')">📚 Educação</div>
                    <div class="custom-select-option" onclick="Goals.selectStreakCategory('pessoal', '🧠 Pessoal')">🧠 Pessoal</div>
                    <div class="custom-select-option" onclick="Goals.selectStreakCategory('profissional', '💼 Profissional')">💼 Profissional</div>
                    <div class="custom-select-option" onclick="Goals.selectStreakCategory('financeiro', '💰 Financeiro')">💰 Financeiro</div>
                    <div class="custom-select-option" onclick="Goals.selectStreakCategory('hábito', '🔄 Hábito')">🔄 Hábito</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Descrição (opcional)</label>
              <textarea class="form-input" id="streak-description" rows="2" placeholder="Descreva detalhes da meta..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Goals.closeStreakModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Goals.saveStreakFromModal()">Salvar</button>
          </div>
        </div>
      </div>
    `;
  },

  afterRender() {
    document.addEventListener('click', this._closeSelectOutside);
  },

  _closeSelectOutside: (e) => {
    // Close category dropdown
    const wrapper = document.getElementById('goal-category-wrapper');
    if (wrapper && !wrapper.contains(e.target)) wrapper.classList.remove('open');
    
    // Close metric dropdowns
    document.querySelectorAll('.ms-metric-wrapper').forEach(w => {
      if (!w.contains(e.target)) w.classList.remove('open');
    });

    // Close streak category dropdown
    const sw = document.getElementById('streak-category-wrapper');
    if (sw && !sw.contains(e.target)) sw.classList.remove('open');
  },

  setView(view) {
    this._view = view;
    App.renderCurrentPage();
  },

  // ============================================
  // VIEW RENDERERS
  // ============================================
  _renderActiveView(activeMS, activeStreaks) {
    if (activeMS.length === 0 && activeStreaks.length === 0) {
      return `
        <div class="card">
          <div class="empty-state">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🎯</div>
            <h3 class="empty-state-title">Nenhuma meta ativa</h3>
            <p class="empty-state-text">Crie metas de marcos ou streaks para acompanhar seu progresso!</p>
            <button class="btn btn-primary" onclick="Goals.openNewGoalTypeSelector()">
              ${Utils.icon('plus')} Criar Meta
            </button>
          </div>
        </div>
      `;
    }

    let html = '';

    // Streak Goals in active view
    if (activeStreaks.length > 0) {
      html += `
        <div class="section" style="margin-bottom: var(--space-8);">
          <div class="section-header">
            <h2 class="section-title">🔥 Streaks Ativos</h2>
          </div>
          <div class="grid-2 stagger">
            ${activeStreaks.map(g => this._renderStreakCard(g)).join('')}
          </div>
        </div>
      `;
    }

    // Milestone Goals in active view
    if (activeMS.length > 0) {
      html += `
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">🎯 Metas por Marcos</h2>
          </div>
          <div class="grid-2 stagger">
            ${activeMS.map(g => this._renderGoalCard(g)).join('')}
          </div>
        </div>
      `;
    }

    return html;
  },

  _renderStreaksView(streakGoals) {
    if (streakGoals.length === 0) {
      return `
        <div class="card">
          <div class="empty-state">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🔥</div>
            <h3 class="empty-state-title">Nenhum streak criado</h3>
            <p class="empty-state-text">Crie uma meta de sequência — tipo "5 dias treinando" ou "30 dias lendo".</p>
            <button class="btn btn-primary" onclick="Goals.openStreakModal()">
              ${Utils.icon('plus')} Criar Streak
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="grid-2 stagger">
        ${streakGoals.map(g => this._renderStreakCard(g)).join('')}
      </div>
    `;
  },

  _renderCompletedView(completedMS, completedStreaks) {
    const total = completedMS.length + completedStreaks.length;
    if (total === 0) {
      return `
        <div class="card">
          <div class="empty-state">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🏆</div>
            <h3 class="empty-state-title">Nenhuma meta concluída ainda</h3>
            <p class="empty-state-text">Continue trabalhando nas suas metas ativas!</p>
          </div>
        </div>
      `;
    }

    let html = '';

    if (completedStreaks.length > 0) {
      html += `
        <div class="section" style="margin-bottom: var(--space-8);">
          <div class="section-header">
            <h2 class="section-title">🏆 Streaks Concluídos</h2>
          </div>
          <div class="grid-2 stagger">
            ${completedStreaks.map(g => this._renderStreakCard(g)).join('')}
          </div>
        </div>
      `;
    }

    if (completedMS.length > 0) {
      html += `
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">✅ Metas por Marcos Concluídas</h2>
          </div>
          <div class="grid-2 stagger">
            ${completedMS.map(g => this._renderGoalCard(g)).join('')}
          </div>
        </div>
      `;
    }

    return html;
  },

  // ============================================
  // STREAK CARD RENDERER
  // ============================================
  _getCurrentStreak(g) {
    if (!g.checkDates || !Array.isArray(g.checkDates)) return 0;
    
    const sorted = [...g.checkDates].sort().reverse();
    if (sorted.length === 0) return 0;
    
    const today = Utils.today();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Streak must start from today or yesterday
    if (sorted[0] !== today && sorted[0] !== yesterdayStr) return 0;
    
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1] + 'T12:00:00');
      const currDate = new Date(sorted[i] + 'T12:00:00');
      const diff = (prevDate - currDate) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  _getBestStreak(g) {
    if (!g.checkDates || !Array.isArray(g.checkDates) || g.checkDates.length === 0) return 0;
    
    const sorted = [...g.checkDates].sort();
    let best = 1;
    let current = 1;
    
    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1] + 'T12:00:00');
      const currDate = new Date(sorted[i] + 'T12:00:00');
      const diff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        current++;
        if (current > best) best = current;
      } else if (diff > 1) {
        current = 1;
      }
    }
    return best;
  },

  _renderStreakCard(g) {
    const currentStreak = this._getCurrentStreak(g);
    const bestStreak = this._getBestStreak(g);
    const target = g.targetDays || 7;
    const progress = Math.min(100, Math.round((currentStreak / target) * 100));
    const totalChecked = (g.checkDates || []).length;
    const todayStr = Utils.today();
    const checkedToday = (g.checkDates || []).includes(todayStr);
    const emoji = g.emoji || '🎯';
    const isCompleted = g.completed;
    
    const catEmojis = { pessoal: '🧠', profissional: '💼', financeiro: '💰', saúde: '🏃', educação: '📚', 'hábito': '🔄' };

    // Build mini calendar (last 14 days)
    let miniCalendar = '';
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const isChecked = (g.checkDates || []).includes(dateStr);
      const isToday = dateStr === todayStr;
      const dayName = d.toLocaleString('pt-BR', { weekday: 'short' }).substring(0, 3);
      const dayNum = d.getDate();
      
      miniCalendar += `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 32px;">
          <div style="font-size: 9px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">${dayName}</div>
          <div style="width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600;
                       background: ${isChecked ? 'var(--accent)' : 'rgba(255,255,255,0.04)'}; 
                       color: ${isChecked ? '#03045E' : 'var(--text-muted)'};
                       border: ${isToday && !isChecked ? '2px solid var(--accent)' : '1px solid ' + (isChecked ? 'transparent' : 'var(--border)')};
                       box-shadow: ${isChecked ? '0 0 10px var(--accent-glow)' : 'none'};
                       transition: all 0.2s;">${dayNum}</div>
        </div>
      `;
    }

    return `
      <div class="card card-degrade-escuro" style="position: relative; overflow: hidden;">
        ${isCompleted ? '<div style="position: absolute; top: 12px; right: 12px; background: var(--success); color: #fff; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">✅ Concluída</div>' : ''}
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4);">
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <div style="width: 52px; height: 52px; border-radius: var(--radius-lg); background: linear-gradient(135deg, var(--accent-soft), rgba(0, 229, 255, 0.05)); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border: 1px solid var(--border-accent);">
              ${emoji}
            </div>
            <div>
              <h3 style="font-size: var(--font-lg); font-weight: var(--fw-bold); color: var(--text-primary); margin-bottom: 2px;">${g.name}</h3>
              <div style="display: flex; align-items: center; gap: var(--space-2);">
                <span class="badge badge-ghost" style="font-size: 10px;">${catEmojis[g.category] || '🎯'} ${g.category || 'pessoal'}</span>
                <span style="font-size: var(--font-xs); color: var(--text-muted);">Meta: ${target} dias</span>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-icon btn-ghost sm" onclick="Goals.openStreakModal('${g.id}')" data-tooltip="Editar">
              ${Utils.icons.edit}
            </button>
            <button class="btn btn-icon btn-ghost sm" onclick="Goals.confirmDelete('${g.id}')">
              ${Utils.icons.trash}
            </button>
          </div>
        </div>

        ${g.description ? `<p style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-3); line-height: var(--lh-relaxed);">${g.description}</p>` : ''}

        <!-- Streak Stats Row -->
        <div style="display: flex; gap: var(--space-4); margin-bottom: var(--space-4);">
          <div style="flex: 1; text-align: center; padding: var(--space-3); background: rgba(255,255,255,0.03); border-radius: var(--radius-md); border: 1px solid var(--border);">
            <div style="font-size: var(--font-2xl); font-weight: var(--fw-extrabold); color: ${currentStreak > 0 ? 'var(--accent)' : 'var(--text-muted)'};">${currentStreak}</div>
            <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.5px;">Streak Atual</div>
          </div>
          <div style="flex: 1; text-align: center; padding: var(--space-3); background: rgba(255,255,255,0.03); border-radius: var(--radius-md); border: 1px solid var(--border);">
            <div style="font-size: var(--font-2xl); font-weight: var(--fw-extrabold); color: var(--warning);">${bestStreak}</div>
            <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.5px;">Melhor Streak</div>
          </div>
          <div style="flex: 1; text-align: center; padding: var(--space-3); background: rgba(255,255,255,0.03); border-radius: var(--radius-md); border: 1px solid var(--border);">
            <div style="font-size: var(--font-2xl); font-weight: var(--fw-extrabold); color: var(--text-primary);">${totalChecked}</div>
            <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.5px;">Total de Dias</div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-info">
          <span class="progress-label">${currentStreak}/${target} dias</span>
          <span class="progress-value">${progress}%</span>
        </div>
        <div class="progress-bar ${progress >= 100 ? 'success' : ''}" style="margin-bottom: var(--space-4);">
          <div class="progress-bar-fill" style="width:${progress}%"></div>
        </div>

        <!-- Mini Calendar (last 14 days) -->
        <div style="display: flex; gap: 6px; overflow-x: auto; padding: var(--space-2) 0; margin-bottom: var(--space-4);">
          ${miniCalendar}
        </div>

        <!-- Check-in Button -->
        ${!isCompleted ? `
          <button class="btn ${checkedToday ? 'btn-secondary' : 'btn-primary'}" 
                  onclick="Goals.toggleStreakCheck('${g.id}')" 
                  style="width: 100%; justify-content: center; gap: var(--space-2); padding: var(--space-3); font-weight: var(--fw-bold); ${checkedToday ? 'opacity: 0.7;' : 'background: linear-gradient(135deg, var(--accent), #0077b6);'}">
            ${checkedToday 
              ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Feito Hoje! (desfazer)`
              : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Marcar Hoje como Feito`
            }
          </button>
        ` : ''}
      </div>
    `;
  },

  // ============================================
  // MILESTONE GOAL CARD (Existing)
  // ============================================
  _renderGoalCard(g) {
    const catEmojis = { pessoal: '🧠', profissional: '💼', financeiro: '💰', saúde: '🏃', educação: '📚' };
    const done = (g.milestones || []).filter(m => m.done).length;
    const total = (g.milestones || []).length;

    return `
      <div class="goal-card card-degrade-escuro">
        <div class="goal-card-header">
          <div>
            <span style="margin-right:6px;">${catEmojis[g.category] || '🎯'}</span>
            <span class="goal-card-title">${g.name}</span>
          </div>
          <div style="display:flex;gap:var(--space-1);">
            ${g.deadline ? `<span class="badge badge-ghost">${Utils.formatDate(g.deadline)}</span>` : ''}
            <button class="btn btn-icon btn-ghost sm" onclick="Goals.openModal('${g.id}', 'milestone')">
              ${Utils.icons.edit}
            </button>
            <button class="btn btn-icon btn-ghost sm" onclick="Goals.confirmDelete('${g.id}')">
              ${Utils.icons.trash}
            </button>
          </div>
        </div>
        ${g.description ? `<p style="font-size:var(--font-sm);color:var(--text-muted);margin-bottom:var(--space-3);line-height:var(--lh-relaxed);">${g.description}</p>` : ''}

        <div class="progress-info">
          <span class="progress-label">${done}/${total} marcos</span>
          <span class="progress-value">${g.progress || 0}%</span>
        </div>
        <div class="progress-bar ${g.progress >= 100 ? 'success' : ''}">
          <div class="progress-bar-fill" style="width:${g.progress || 0}%"></div>
        </div>

        ${total > 0 ? `
          <div class="goal-milestones">
            ${g.milestones.map((m, i) => `
              <div class="goal-milestone ${m.done ? 'done' : ''}" onclick="Goals.toggleMilestone('${g.id}', ${i})" style="cursor:pointer;">
                <div class="checkbox-input ${m.done ? 'checked' : ''}" style="width:16px;height:16px;">
                  ${m.done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:10px;height:10px;"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                </div>
                <span>${m.text} ${m.type === 'smart' ? '<span style="font-size:10px; opacity:0.8; margin-left:4px;" title="Marco Inteligente">✨</span>' : ''}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  },

  // ============================================
  // MODAL HANDLERS
  // ============================================
  openNewGoalTypeSelector() {
    document.getElementById('goal-type-modal').classList.add('active');
  },

  closeTypeModal() {
    document.getElementById('goal-type-modal').classList.remove('active');
  },

  toggleCategoryDropdown() {
    const wrapper = document.getElementById('goal-category-wrapper');
    if (wrapper) wrapper.classList.toggle('open');
  },

  selectCategory(val, text) {
    document.getElementById('goal-category').value = val;
    document.getElementById('goal-category-trigger-text').textContent = text;
    this.toggleCategoryDropdown();
  },

  toggleStreakCategoryDropdown() {
    const wrapper = document.getElementById('streak-category-wrapper');
    if (wrapper) wrapper.classList.toggle('open');
  },

  selectStreakCategory(val, text) {
    document.getElementById('streak-category').value = val;
    document.getElementById('streak-category-display').textContent = text;
    this.toggleStreakCategoryDropdown();
  },

  selectStreakEmoji(emoji) {
    document.getElementById('streak-emoji').value = emoji;
    document.querySelectorAll('.streak-emoji-btn').forEach(btn => {
      btn.classList.remove('selected');
      btn.style.borderColor = 'var(--border)';
    });
    event.currentTarget.classList.add('selected');
    event.currentTarget.style.borderColor = 'var(--accent)';
  },

  // --- Milestone Goal Modal ---
  openModal(editId = null, type = 'milestone') {
    const modal = document.getElementById('goal-modal');
    const list = document.getElementById('goal-milestones-list');
    list.innerHTML = '';

    if (editId) {
      const g = Store.goals.getAll().find(g => g.id === editId);
      if (!g) return;
      document.getElementById('goal-modal-title').textContent = 'Editar Meta';
      document.getElementById('goal-edit-id').value = g.id;
      document.getElementById('goal-name').value = g.name;
      document.getElementById('goal-description').value = g.description || '';
      document.getElementById('goal-deadline').value = g.deadline || '';
      
      const catMap = { pessoal: '🧠 Pessoal', profissional: '💼 Profissional', financeiro: '💰 Financeiro', saúde: '🏃 Saúde', educação: '📚 Educação' };
      const catVal = g.category || 'pessoal';
      document.getElementById('goal-category').value = catVal;
      document.getElementById('goal-category-trigger-text').textContent = catMap[catVal] || '🧠 Pessoal';
      
      (g.milestones || []).forEach(m => this.addMilestoneInput(m));
    } else {
      document.getElementById('goal-modal-title').textContent = 'Nova Meta';
      document.getElementById('goal-edit-id').value = '';
      document.getElementById('goal-name').value = '';
      document.getElementById('goal-description').value = '';
      document.getElementById('goal-deadline').value = '';
      document.getElementById('goal-category').value = 'pessoal';
      document.getElementById('goal-category-trigger-text').textContent = '🧠 Pessoal';
    }
    modal.classList.add('active');
  },

  closeModal() {
    document.getElementById('goal-modal').classList.remove('active');
  },

  // --- Streak Goal Modal ---
  openStreakModal(editId = null) {
    const modal = document.getElementById('streak-modal');
    
    const catMap = { saúde: '🏃 Saúde', educação: '📚 Educação', pessoal: '🧠 Pessoal', profissional: '💼 Profissional', financeiro: '💰 Financeiro', 'hábito': '🔄 Hábito' };

    if (editId) {
      const g = Store.goals.getAll().find(g => g.id === editId);
      if (!g) return;
      document.getElementById('streak-modal-title').textContent = 'Editar Meta de Streak';
      document.getElementById('streak-edit-id').value = g.id;
      document.getElementById('streak-name').value = g.name;
      document.getElementById('streak-emoji').value = g.emoji || '🏋️';
      document.getElementById('streak-target-days').value = g.targetDays || 7;
      document.getElementById('streak-description').value = g.description || '';
      document.getElementById('streak-category').value = g.category || 'saúde';
      document.getElementById('streak-category-display').textContent = catMap[g.category] || '🏃 Saúde';
      
      // Highlight selected emoji
      setTimeout(() => {
        document.querySelectorAll('.streak-emoji-btn').forEach(btn => {
          if (btn.textContent.trim() === (g.emoji || '🏋️')) {
            btn.classList.add('selected');
            btn.style.borderColor = 'var(--accent)';
          }
        });
      }, 50);
    } else {
      document.getElementById('streak-modal-title').textContent = 'Nova Meta de Streak';
      document.getElementById('streak-edit-id').value = '';
      document.getElementById('streak-name').value = '';
      document.getElementById('streak-emoji').value = '🏋️';
      document.getElementById('streak-target-days').value = 7;
      document.getElementById('streak-description').value = '';
      document.getElementById('streak-category').value = 'saúde';
      document.getElementById('streak-category-display').textContent = '🏃 Saúde';
      
      // Highlight first emoji
      setTimeout(() => {
        const firstBtn = document.querySelector('.streak-emoji-btn');
        if (firstBtn) {
          firstBtn.classList.add('selected');
          firstBtn.style.borderColor = 'var(--accent)';
        }
      }, 50);
    }
    
    modal.classList.add('active');
  },

  closeStreakModal() {
    document.getElementById('streak-modal').classList.remove('active');
  },

  // ============================================
  // MILESTONE INPUTS
  // ============================================
  _getMetricLabel(val) {
    const map = {
      'finance_profit': '💰 Finanças: Lucro Mensal',
      'finance_income': '💰 Finanças: Receita Mensal'
    };
    return map[val] || map['finance_profit'];
  },

  setMilestoneType(btn, type) {
    const card = btn.closest('.card');
    card.querySelector('.ms-type').value = type;
    
    const isSmart = type === 'smart';
    card.querySelector('.ms-smart-config').style.display = isSmart ? 'block' : 'none';
    
    const btns = card.querySelectorAll('.ms-type-btn');
    btns[0].className = `btn btn-sm ms-type-btn ${!isSmart ? 'btn-primary' : 'btn-ghost'}`;
    btns[1].className = `btn btn-sm ms-type-btn ${isSmart ? 'btn-primary' : 'btn-ghost'}`;
  },

  selectMsMetric(opt, val, text) {
    const wrapper = opt.closest('.custom-select-wrapper');
    wrapper.querySelector('.ms-metric').value = val;
    wrapper.querySelector('.ms-metric-label').textContent = text;
    wrapper.classList.remove('open');
  },

  addMilestoneInput(m = {}) {
    if (typeof m === 'string') m = { text: m }; // Legacy support
    const list = document.getElementById('goal-milestones-list');
    
    const div = document.createElement('div');
    div.className = 'card';
    div.style.padding = 'var(--space-4)';
    div.style.marginBottom = 'var(--space-3)';
    div.style.border = '1px solid rgba(255,255,255,0.05)';
    
    const isSmart = m.type === 'smart';
    
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-3);">
        <div style="display:flex; gap: var(--space-2); align-items:center;">
          <button class="btn btn-sm ms-type-btn ${!isSmart ? 'btn-primary' : 'btn-ghost'}" onclick="Goals.setMilestoneType(this, 'manual')" type="button">Manual</button>
          <button class="btn btn-sm ms-type-btn ${isSmart ? 'btn-primary' : 'btn-ghost'}" onclick="Goals.setMilestoneType(this, 'smart')" type="button">✨ Inteligente</button>
        </div>
        <button class="btn btn-sm btn-icon btn-danger" onclick="this.closest('.card').remove()" type="button">✕</button>
      </div>
      
      <input type="text" class="form-input ms-text" placeholder="Descrição do marco..." value="${m.text || ''}">
      <input type="hidden" class="ms-type" value="${m.type || 'manual'}">
      
      <div class="ms-smart-config" style="display: ${isSmart ? 'block' : 'none'}; margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid rgba(255,255,255,0.05);">
        <p style="font-size:var(--font-xs); color:var(--text-muted); margin-bottom:var(--space-3);">O sistema marcará este marco automaticamente quando a condição for atingida.</p>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" style="font-size:var(--font-xs);">Módulo e Métrica</label>
            <div class="custom-select-wrapper ms-metric-wrapper">
              <input type="hidden" class="ms-metric" value="${m.metric || 'finance_profit'}">
              <div class="custom-select-trigger" onclick="this.parentElement.classList.toggle('open')">
                <span class="ms-metric-label">${this._getMetricLabel(m.metric || 'finance_profit')}</span>
                <span style="opacity:0.5;">▼</span>
              </div>
              <div class="custom-select-options">
                <div class="custom-select-option" onclick="Goals.selectMsMetric(this, 'finance_profit', '💰 Finanças: Lucro Mensal')">💰 Finanças: Lucro Mensal</div>
                <div class="custom-select-option" onclick="Goals.selectMsMetric(this, 'finance_income', '💰 Finanças: Receita Mensal')">💰 Finanças: Receita Mensal</div>
              </div>
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" style="font-size:var(--font-xs);">Alvo Monetário (R$)</label>
            <input type="number" class="form-input ms-target" value="${m.target || ''}" placeholder="Ex: 3000">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:var(--font-xs);">Meses Consecutivos</label>
            <input type="number" class="form-input ms-streak" value="${m.streak || '1'}" placeholder="Ex: 3" min="1">
          </div>
        </div>
      </div>
    `;
    list.appendChild(div);
  },

  // ============================================
  // SAVE HANDLERS
  // ============================================
  saveFromModal() {
    const name = document.getElementById('goal-name').value.trim();
    if (!name) { Utils.toast('Digite o nome da meta', 'warning'); return; }

    const editId = document.getElementById('goal-edit-id').value;
    const cards = document.querySelectorAll('#goal-milestones-list .card');
    
    const milestones = Array.from(cards).map(card => {
      const type = card.querySelector('.ms-type').value;
      const text = card.querySelector('.ms-text').value.trim();
      
      const ms = { text, type, done: false };
      
      if (type === 'smart') {
        ms.metric = card.querySelector('.ms-metric').value;
        ms.target = parseFloat(card.querySelector('.ms-target').value) || 0;
        ms.streak = parseInt(card.querySelector('.ms-streak').value, 10) || 1;
      }
      return ms;
    }).filter(m => m.text);

    // Preserve done states if editing
    if (editId) {
      const existing = Store.goals.getAll().find(g => g.id === editId);
      if (existing && existing.milestones) {
        milestones.forEach((m, i) => {
          if (existing.milestones[i] && existing.milestones[i].text === m.text) {
            m.done = existing.milestones[i].done;
          }
        });
      }
    }

    const done = milestones.filter(m => m.done).length;
    const progress = milestones.length > 0 ? Math.round((done / milestones.length) * 100) : 0;

    const data = {
      name,
      goalType: 'milestone',
      description: document.getElementById('goal-description').value.trim(),
      deadline: document.getElementById('goal-deadline').value,
      category: document.getElementById('goal-category').value,
      milestones,
      progress
    };

    if (editId) data.id = editId;

    Store.goals.save(data);
    this.closeModal();
    Utils.toast(editId ? 'Meta atualizada!' : 'Meta criada! 🎯', 'success');
    App.renderCurrentPage();
  },

  saveStreakFromModal() {
    const name = document.getElementById('streak-name').value.trim();
    if (!name) { Utils.toast('Digite o nome da meta', 'warning'); return; }

    const targetDays = parseInt(document.getElementById('streak-target-days').value, 10);
    if (!targetDays || targetDays < 1) { Utils.toast('A meta deve ser de pelo menos 1 dia', 'warning'); return; }

    const editId = document.getElementById('streak-edit-id').value;
    
    const data = {
      name,
      goalType: 'streak',
      emoji: document.getElementById('streak-emoji').value || '🏋️',
      targetDays,
      category: document.getElementById('streak-category').value,
      description: document.getElementById('streak-description').value.trim(),
    };

    if (editId) {
      data.id = editId;
      // Preserve check dates
      const existing = Store.goals.getAll().find(g => g.id === editId);
      if (existing) {
        data.checkDates = existing.checkDates || [];
        data.completed = existing.completed || false;
      }
    } else {
      data.checkDates = [];
      data.completed = false;
    }

    Store.goals.save(data);
    this.closeStreakModal();
    Utils.toast(editId ? 'Meta de streak atualizada!' : 'Meta de streak criada! 🔥', 'success');
    App.renderCurrentPage();
  },

  // ============================================
  // STREAK CHECK-IN
  // ============================================
  toggleStreakCheck(goalId) {
    const all = Store.goals.getAll();
    const goal = all.find(g => g.id === goalId);
    if (!goal) return;

    const todayStr = Utils.today();
    if (!goal.checkDates) goal.checkDates = [];

    const idx = goal.checkDates.indexOf(todayStr);
    if (idx !== -1) {
      // Uncheck today
      goal.checkDates.splice(idx, 1);
      goal.completed = false;
    } else {
      // Check today
      goal.checkDates.push(todayStr);
      
      // Check if streak target is reached
      const currentStreak = this._getCurrentStreakFromDates(goal.checkDates);
      if (currentStreak >= (goal.targetDays || 7)) {
        goal.completed = true;
        Utils.toast(`🏆 Parabéns! Você completou a meta "${goal.name}"! 🎉`, 'success');
      }
    }

    Store.goals.save(goal);
    App.renderCurrentPage();
  },

  _getCurrentStreakFromDates(checkDates) {
    if (!checkDates || checkDates.length === 0) return 0;
    
    const sorted = [...checkDates].sort().reverse();
    const today = Utils.today();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (sorted[0] !== today && sorted[0] !== yesterdayStr) return 0;
    
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1] + 'T12:00:00');
      const currDate = new Date(sorted[i] + 'T12:00:00');
      const diff = (prevDate - currDate) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  // ============================================
  // SHARED ACTIONS
  // ============================================
  toggleMilestone(goalId, idx) {
    Store.goals.toggleMilestone(goalId, idx);
    App.renderCurrentPage();
  },

  confirmDelete(id) {
    Utils.confirm('Excluir esta meta?', () => {
      Store.goals.delete(id);
      Utils.toast('Meta removida', 'danger');
      App.renderCurrentPage();
    });
  }
};

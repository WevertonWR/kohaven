/* ============================================
   KORHAVEN — Achievements Module
   (Revisado: progress bar, notas com data, auto-recorde)
   ============================================ */

const Achievements = {
  render() {
    const achievements = Store.achievements.getAll();

    // Auto-update records on render (check if current streak > saved record)
    achievements.forEach(a => {
      const days = Utils.daysBetween(a.startDate);
      if (days > (a.record || 0)) {
        a.record = days;
        Store.achievements.save(a);
      }
    });

    return `
      <div class="animate-fadeIn">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">Painel de Conquistas</h1>
            <p class="page-subtitle">Acompanhe seus marcos, streaks e evolução contínua</p>
          </div>
          <div class="page-header-right">
            <button class="btn btn-primary" onclick="Achievements.openModal()">
              ${Utils.icon('plus')} Nova Conquista
            </button>
          </div>
        </div>

        <!-- Stats Summary -->
        <div class="grid-4 stagger" style="margin-bottom: var(--space-8);">
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Total de Conquistas</div>
              <div class="stat-card-value">${achievements.length}</div>
            </div>
            <div class="stat-card-icon accent">${Utils.icon('trophy')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Maior Streak</div>
              <div class="stat-card-value">${this._getLongestStreakDays(achievements)} dias</div>
            </div>
            <div class="stat-card-icon success">${Utils.icon('flame')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Marcos Atingidos</div>
              <div class="stat-card-value">${this._getTotalMilestones(achievements)}</div>
            </div>
            <div class="stat-card-icon warning">${Utils.icon('zap')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Economia Total</div>
              <div class="stat-card-value">${Utils.formatCurrency(this._getTotalSavings(achievements))}</div>
            </div>
            <div class="stat-card-icon success">${Utils.icon('trendUp')}</div>
          </div>
        </div>

        <!-- Achievement Cards Grid -->
        ${achievements.length > 0 ? `
          <div class="achievements-grid stagger">
            ${achievements.map(a => this._renderCard(a)).join('')}
          </div>
        ` : `
          <div class="card">
            <div class="empty-state">
              <img src="assets/trophy_icon.jpg" class="empty-state-img" alt="Trophy">
              <h3 class="empty-state-title">Comece sua jornada de conquistas</h3>
              <p class="empty-state-text">
                Registre hábitos que está deixando, como parar de fumar ou beber.
                Acompanhe dias, marcos e a economia gerada.
              </p>
              <button class="btn btn-primary" onclick="Achievements.openModal()">
                ${Utils.icon('plus')} Criar Primeira Conquista
              </button>
            </div>
          </div>
        `}
      </div>

      <!-- Create/Edit Modal -->
      <div class="modal-overlay" id="achievement-modal">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title" id="achievement-modal-title">Nova Conquista</h3>
            <button class="modal-close" onclick="Achievements.closeModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="achievement-edit-id" value="">
            <div class="form-group">
              <label class="form-label">Ícone</label>
              <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;" id="achievement-emoji-grid">
                ${Utils.achievementEmojis.map((e, i) => `
                  <button class="mood-btn ${i === 0 ? 'selected' : ''}" data-emoji="${e}" onclick="Achievements.selectEmoji(this)">${e}</button>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Nome da Conquista</label>
              <input type="text" class="form-input" id="achievement-name" placeholder="Ex: Sem fumar, Sem beber, Sem açúcar...">
            </div>
            <div class="form-group">
              <label class="form-label">Por que começou? (Motivação)</label>
              <textarea class="form-input" id="achievement-reason" placeholder="Escreva seu motivo para manter essa conquista..."></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Data de Início</label>
                <input type="date" class="form-input" id="achievement-start" value="${Utils.today()}">
              </div>
              <div class="form-group">
                <label class="form-label">Gasto anterior (R$)</label>
                <div style="display: flex; gap: var(--space-2);">
                  <input type="number" class="form-input" id="achievement-cost" placeholder="0.00" step="0.01" min="0" style="flex:2;">
                  <select class="form-input" id="achievement-cost-frequency" style="flex:1;">
                    <option value="daily">/ Dia</option>
                    <option value="weekly">/ Semana</option>
                    <option value="monthly">/ Mês</option>
                  </select>
                </div>
                <span class="form-hint">Quanto gastava com isso?</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Gatilhos e estratégias (fixo)</label>
              <textarea class="form-input" id="achievement-triggers" placeholder="O que te leva a recair? Como lidar? Esse campo fica sempre visível no card."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Achievements.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Achievements.saveFromModal()">Salvar Conquista</button>
          </div>
        </div>
      </div>

      <!-- Notes Modal (per achievement) -->
      <div class="modal-overlay" id="achievement-notes-modal">
        <div class="modal" style="max-width:560px;">
          <div class="modal-header">
            <h3 class="modal-title" id="notes-modal-title">Anotações</h3>
            <button class="modal-close" onclick="Achievements.closeNotesModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="notes-achievement-id" value="">
            <!-- Add new note -->
            <div class="form-group">
              <label class="form-label">Nova anotação (gatilhos, reflexões, como lidou...)</label>
              <textarea class="form-input" id="note-text" rows="3" placeholder="Escreva aqui..."></textarea>
            </div>
            <button class="btn btn-primary btn-sm" onclick="Achievements.addNote()" style="margin-bottom:var(--space-5);">
              ${Utils.icon('plus')} Adicionar Nota
            </button>
            <!-- Notes list -->
            <div id="notes-list-container">
              <!-- Rendered dynamically -->
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Achievements.closeNotesModal()">Fechar</button>
          </div>
        </div>
      </div>
    `;
  },

  afterRender() {},

  // ===========================================
  // Render individual achievement card
  // ===========================================
  _renderCard(a) {
    const days = Utils.daysBetween(a.startDate);
    const dur = Utils.formatDaysDuration(days);
    const milestones = Utils.getMilestones();
    const savings = (a.dailyCost || 0) * days;
    const record = a.record || days;
    const notes = a.notes || [];

    // Find the NEXT milestone (first one not yet achieved)
    const nextMilestone = milestones.find(m => days < m.days);
    // Find the PREVIOUS milestone (last one achieved) for progress calculation
    const prevMilestone = [...milestones].reverse().find(m => days >= m.days);
    const prevDays = prevMilestone ? prevMilestone.days : 0;
    const nextDays = nextMilestone ? nextMilestone.days : (prevMilestone ? prevMilestone.days : 1);
    const progressToNext = nextMilestone
      ? Math.min(100, Math.round(((days - prevDays) / (nextDays - prevDays)) * 100))
      : 100;

    return `
      <div class="achievement-card">
        <div class="achievement-card-header">
          <div class="achievement-card-icon">${Utils.getSvgForEmoji(a.icon || '🏆')}</div>
          <div class="achievement-card-actions">
            <button class="btn btn-icon btn-ghost sm" onclick="Achievements.openNotesModal('${a.id}')" data-tooltip="Notas">
              ${Utils.icons.edit}
            </button>
            <button class="btn btn-icon btn-ghost sm" onclick="Achievements.openModal('${a.id}')" data-tooltip="Editar">
              ${Utils.icons.settings}
            </button>
            <button class="btn btn-icon btn-ghost sm" onclick="Achievements.confirmReset('${a.id}')" data-tooltip="Reiniciar">
              ${Utils.icons.refresh}
            </button>
            <button class="btn btn-icon btn-ghost sm" onclick="Achievements.confirmDelete('${a.id}')" data-tooltip="Excluir">
              ${Utils.icons.trash}
            </button>
          </div>
        </div>

        <h3 class="achievement-card-name">${a.name}</h3>
        ${a.reason ? `<p class="achievement-card-reason">"${a.reason}"</p>` : ''}

        <!-- Counter -->
        <div class="achievement-counter">
          <div class="achievement-counter-value">${dur.value}</div>
          <div class="achievement-counter-unit">${dur.unit}</div>
          ${dur.extra ? `<div class="achievement-counter-detail">${dur.extra}</div>` : ''}
        </div>

        <!-- Progress to next milestone -->
        ${nextMilestone ? `
          <div style="margin-bottom: var(--space-4);">
            <div class="progress-info">
              <span class="progress-label">Próximo marco: ${nextMilestone.label}</span>
              <span class="progress-value">${progressToNext}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar-fill" style="width: ${progressToNext}%"></div>
            </div>
            <div style="font-size:var(--font-xs);color:var(--text-muted);margin-top:4px;">
              Faltam ${nextMilestone.days - days} dia${nextMilestone.days - days !== 1 ? 's' : ''}
            </div>
          </div>
        ` : `
          <div style="margin-bottom: var(--space-4);">
            <div class="progress-info">
              <span class="progress-label">Todos os marcos atingidos! 🎉</span>
              <span class="progress-value">100%</span>
            </div>
            <div class="progress-bar success">
              <div class="progress-bar-fill" style="width: 100%"></div>
            </div>
          </div>
        `}

        <!-- Milestone Badges -->
        <div class="achievement-milestones">
          ${milestones.map(m => {
            const achieved = days >= m.days;
            const isNext = nextMilestone && m.days === nextMilestone.days;
            return `<span class="milestone ${achieved ? 'achieved' : ''} ${isNext ? 'next' : ''}">${achieved ? '✓ ' : ''}${m.label}</span>`;
          }).join('')}
        </div>

        <!-- Stats -->
        <div class="achievement-stats">
          <div class="achievement-stat">
            <div class="achievement-stat-label">Recorde Pessoal</div>
            <div class="achievement-stat-value">${record} dias</div>
          </div>
          <div class="achievement-stat">
            <div class="achievement-stat-label">Recaídas</div>
            <div class="achievement-stat-value">${a.relapses || 0}</div>
          </div>
        </div>

        <!-- Savings -->
        ${a.dailyCost > 0 ? `
          <div class="achievement-savings">
            <span class="achievement-savings-icon">💰</span>
            <div>
              <div class="achievement-savings-label">Economia acumulada</div>
              <div class="achievement-savings-value">${Utils.formatCurrency(savings)}</div>
            </div>
          </div>
        ` : ''}

        <!-- Triggers (fixed text) -->
        ${a.triggers ? `
          <div class="achievement-triggers">
            <div class="achievement-triggers-title">Gatilhos & Estratégias</div>
            <div class="achievement-triggers-text">${a.triggers}</div>
          </div>
        ` : ''}

        <!-- Recent Notes Preview -->
        ${notes.length > 0 ? `
          <div style="margin-top:var(--space-4);border-top:1px solid var(--border);padding-top:var(--space-3);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">
              <span class="achievement-triggers-title">Anotações (${notes.length})</span>
              <span class="section-action" onclick="Achievements.openNotesModal('${a.id}')">Ver todas →</span>
            </div>
            ${notes.slice(-2).reverse().map(n => `
              <div style="padding:var(--space-2) 0;border-bottom:1px solid var(--border-subtle);">
                <div style="font-size:var(--font-xs);color:var(--text-muted);">${Utils.formatDate(n.date, 'full')}</div>
                <div style="font-size:var(--font-sm);color:var(--text-secondary);margin-top:2px;">${n.text}</div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="margin-top:var(--space-4);text-align:center;">
            <button class="btn btn-sm btn-ghost" onclick="Achievements.openNotesModal('${a.id}')">
              ${Utils.icon('edit')} Adicionar nota
            </button>
          </div>
        `}

        <!-- Timeline -->
        ${a.timeline && a.timeline.length > 1 ? `
          <div class="achievement-timeline">
            <div class="achievement-triggers-title" style="margin-bottom: var(--space-2);">Histórico</div>
            ${a.timeline.slice(-4).reverse().map(t => `
              <div class="timeline-item">
                <div class="timeline-dot ${t.type}"></div>
                <div class="timeline-content">
                  <div class="timeline-date">${Utils.formatDate(t.date, 'full')}</div>
                  <div class="timeline-text">${t.type === 'relapse' ? '🔴 Recaída' : t.type === 'restart' ? '🔵 Recomeço' : '🟢 Início'}${t.note ? ' — ' + t.note : ''}</div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  },

  // ===========================================
  // Modal Operations
  // ===========================================
  openModal(editId = null) {
    const modal = document.getElementById('achievement-modal');
    const titleEl = document.getElementById('achievement-modal-title');

    if (editId) {
      const a = Store.achievements.get(editId);
      if (!a) return;
      titleEl.textContent = 'Editar Conquista';
      document.getElementById('achievement-edit-id').value = a.id;
      document.getElementById('achievement-name').value = a.name;
      document.getElementById('achievement-reason').value = a.reason;
      document.getElementById('achievement-start').value = a.startDate ? a.startDate.split('T')[0] : '';
      document.getElementById('achievement-cost').value = a.costValue !== undefined ? a.costValue : (a.dailyCost || '');
      document.getElementById('achievement-cost-frequency').value = a.costFrequency || 'daily';
      document.getElementById('achievement-triggers').value = a.triggers || '';
      document.querySelectorAll('#achievement-emoji-grid .mood-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.emoji === a.icon);
      });
    } else {
      titleEl.textContent = 'Nova Conquista';
      document.getElementById('achievement-edit-id').value = '';
      document.getElementById('achievement-name').value = '';
      document.getElementById('achievement-reason').value = '';
      document.getElementById('achievement-start').value = Utils.today();
      document.getElementById('achievement-cost').value = '';
      document.getElementById('achievement-triggers').value = '';
      document.querySelectorAll('#achievement-emoji-grid .mood-btn').forEach((btn, i) => {
        btn.classList.toggle('selected', i === 0);
      });
    }

    modal.classList.add('active');
  },

  closeModal() {
    document.getElementById('achievement-modal').classList.remove('active');
  },

  selectEmoji(btn) {
    document.querySelectorAll('#achievement-emoji-grid .mood-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  },

  saveFromModal() {
    const name = document.getElementById('achievement-name').value.trim();
    if (!name) {
      Utils.toast('Digite o nome da conquista', 'warning');
      return;
    }

    const editId = document.getElementById('achievement-edit-id').value;
    const selectedEmoji = document.querySelector('#achievement-emoji-grid .mood-btn.selected');

    const costValue = parseFloat(document.getElementById('achievement-cost').value) || 0;
    const costFrequency = document.getElementById('achievement-cost-frequency').value;
    let dailyCost = costValue;
    if (costFrequency === 'weekly') dailyCost = costValue / 7;
    if (costFrequency === 'monthly') dailyCost = costValue / 30;

    const data = {
      name,
      icon: selectedEmoji ? selectedEmoji.dataset.emoji : '🏆',
      reason: document.getElementById('achievement-reason').value.trim(),
      startDate: document.getElementById('achievement-start').value || Utils.today(),
      costValue,
      costFrequency,
      dailyCost,
      triggers: document.getElementById('achievement-triggers').value.trim()
    };

    if (editId) {
      data.id = editId;
      const existing = Store.achievements.get(editId);
      if (existing) {
        data.timeline = existing.timeline;
        data.relapses = existing.relapses;
        data.record = existing.record;
        data.notes = existing.notes; // Preserve notes
      }
    } else {
      data.timeline = [{ type: 'start', date: new Date().toISOString(), note: 'Início da jornada' }];
      data.relapses = 0;
      data.record = 0;
      data.notes = [];
    }

    Store.achievements.save(data);
    this.closeModal();
    Utils.toast(editId ? 'Conquista atualizada!' : 'Conquista criada! 🎉', 'success');
    App.renderCurrentPage();
  },

  // ===========================================
  // Notes Modal (per achievement)
  // ===========================================
  openNotesModal(achievementId) {
    const modal = document.getElementById('achievement-notes-modal');
    const a = Store.achievements.get(achievementId);
    if (!a) return;

    document.getElementById('notes-achievement-id').value = achievementId;
    document.getElementById('notes-modal-title').textContent = `Notas — ${a.name}`;
    document.getElementById('note-text').value = '';

    this._renderNotesList(a);
    modal.classList.add('active');
  },

  closeNotesModal() {
    document.getElementById('achievement-notes-modal').classList.remove('active');
    // Refresh the main page to show updated notes previews
    App.renderCurrentPage();
  },

  _renderNotesList(a) {
    const container = document.getElementById('notes-list-container');
    const notes = a.notes || [];

    if (notes.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:var(--space-6);color:var(--text-muted);">
          <div style="font-size:24px;margin-bottom:var(--space-2);">📝</div>
          <p style="font-size:var(--font-sm);">Nenhuma nota ainda. Registre gatilhos, reflexões ou vitórias.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = [...notes].reverse().map(n => `
      <div style="padding:var(--space-3) 0;border-bottom:1px solid var(--border-subtle);display:flex;align-items:flex-start;gap:var(--space-3);">
        <div style="flex:1;">
          <div style="font-size:var(--font-xs);color:var(--text-muted);">${Utils.formatDate(n.date, 'full')}</div>
          <div style="font-size:var(--font-sm);color:var(--text-secondary);margin-top:4px;line-height:var(--lh-relaxed);">${n.text}</div>
        </div>
        <button class="btn btn-icon btn-ghost sm" onclick="Achievements.deleteNote('${a.id}', '${n.id}')" style="flex-shrink:0;opacity:0.5;">
          ${Utils.icons.trash}
        </button>
      </div>
    `).join('');
  },

  addNote() {
    const achievementId = document.getElementById('notes-achievement-id').value;
    const text = document.getElementById('note-text').value.trim();
    if (!text) {
      Utils.toast('Escreva algo na nota', 'warning');
      return;
    }

    const a = Store.achievements.get(achievementId);
    if (!a) return;

    if (!a.notes) a.notes = [];
    a.notes.push({
      id: Store._generateId(),
      date: new Date().toISOString(),
      text: text
    });

    Store.achievements.save(a);
    document.getElementById('note-text').value = '';
    this._renderNotesList(a);
    Utils.toast('Nota adicionada 📝', 'success');
  },

  deleteNote(achievementId, noteId) {
    const a = Store.achievements.get(achievementId);
    if (!a || !a.notes) return;

    a.notes = a.notes.filter(n => n.id !== noteId);
    Store.achievements.save(a);
    this._renderNotesList(a);
  },

  // ===========================================
  // Reset & Delete
  // ===========================================
  confirmReset(id) {
    const a = Store.achievements.get(id);
    if (!a) return;
    Utils.confirm(`Deseja reiniciar o contador de "${a.name}"?\n\nIsso registrará uma recaída no histórico e o contador voltará a zero.\nSem julgamento — o importante é recomeçar. 💪`, () => {
      // Update record if current streak is the best ever
      const currentDays = Utils.daysBetween(a.startDate);
      if (currentDays > (a.record || 0)) {
        a.record = currentDays;
      }
      // Add relapse to timeline
      if (!a.timeline) a.timeline = [];
      a.timeline.push({
        type: 'relapse',
        date: new Date().toISOString(),
        note: `Streak anterior: ${currentDays} dias`,
        previousStart: a.startDate
      });
      // Reset counter
      a.startDate = new Date().toISOString();
      if (!a.relapses) a.relapses = 0;
      a.relapses++;
      // Add restart entry
      a.timeline.push({
        type: 'restart',
        date: new Date().toISOString(),
        note: 'Recomeço'
      });

      Store.achievements.save(a);
      Utils.toast('Contador reiniciado. Bora de novo! 💪', 'info');
      App.renderCurrentPage();
    });
  },

  confirmDelete(id) {
    Utils.confirm('Tem certeza que deseja excluir esta conquista? Essa ação não pode ser desfeita.', () => {
      Store.achievements.delete(id);
      Utils.toast('Conquista removida', 'danger');
      App.renderCurrentPage();
    });
  },

  // ===========================================
  // Helpers
  // ===========================================
  _getLongestStreakDays(achievements) {
    if (achievements.length === 0) return 0;
    return Math.max(...achievements.map(a => {
      const current = Utils.daysBetween(a.startDate);
      return Math.max(current, a.record || 0);
    }));
  },

  _getTotalMilestones(achievements) {
    const milestones = Utils.getMilestones();
    let total = 0;
    achievements.forEach(a => {
      const days = Utils.daysBetween(a.startDate);
      total += milestones.filter(m => days >= m.days).length;
    });
    return total;
  },

  _getTotalSavings(achievements) {
    return achievements.reduce((sum, a) => {
      const days = Utils.daysBetween(a.startDate);
      return sum + (a.dailyCost || 0) * days;
    }, 0);
  }
};

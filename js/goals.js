/* ============================================
   KORHAVEN — Goals & Systems Module
   ============================================ */

const Goals = {
  render() {
    Store.goals.evaluateSmartMilestones();
    const goals = Store.goals.getAll();
    const active = goals.filter(g => (g.progress || 0) < 100);
    const completed = goals.filter(g => (g.progress || 0) >= 100);

    return `
      <div class="animate-fadeIn">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">Metas & Sistemas</h1>
            <p class="page-subtitle">Defina objetivos claros e o sistema para alcançá-los</p>
          </div>
          <div class="page-header-right">
            <button class="btn btn-primary" onclick="Goals.openModal()">
              ${Utils.icon('plus')} Nova Meta
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid-3 stagger" style="margin-bottom: var(--space-8);">
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Metas Ativas</div>
              <div class="stat-card-value">${active.length}</div>
            </div>
            <div class="stat-card-icon accent">${Utils.icon('goals')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Concluídas</div>
              <div class="stat-card-value">${completed.length}</div>
            </div>
            <div class="stat-card-icon success">${Utils.icon('check')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Progresso Médio</div>
              <div class="stat-card-value">${active.length > 0 ? Math.round(active.reduce((s,g) => s + (g.progress||0), 0) / active.length) : 0}%</div>
            </div>
            <div class="stat-card-icon warning">${Utils.icon('barChart')}</div>
          </div>
        </div>

        <!-- Active Goals -->
        ${active.length > 0 ? `
          <div class="section">
            <div class="section-header">
              <h2 class="section-title">Metas Ativas</h2>
            </div>
            <div class="grid-2 stagger">
              ${active.map(g => this._renderGoalCard(g)).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Completed Goals -->
        ${completed.length > 0 ? `
          <div class="section">
            <div class="section-header">
              <h2 class="section-title">✅ Concluídas</h2>
            </div>
            <div class="grid-2 stagger">
              ${completed.map(g => this._renderGoalCard(g)).join('')}
            </div>
          </div>
        ` : ''}

        ${goals.length === 0 ? `
          <div class="card">
            <div class="empty-state">
              <img src="assets/target_icon.jpg" class="empty-state-img" alt="Target">
              <h3 class="empty-state-title">Defina suas metas</h3>
              <p class="empty-state-text">Crie metas com marcos menores, prazos e o sistema/rotina para alcançá-las.</p>
              <button class="btn btn-primary" onclick="Goals.openModal()">
                ${Utils.icon('plus')} Criar Primeira Meta
              </button>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Modal -->
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

  openModal(editId = null) {
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

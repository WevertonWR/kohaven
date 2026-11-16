/* ============================================
   KORHAVEN — Notes / Anotações
   Suporte a 3 Tipos:
   1. Anotação Fixa (imagem em destaque, lembrete, título e descrição)
   2. Anotação Diária (importância Normal/Importante/Super Importante, prazo com auto-expiração, mensagem do app)
   3. Anotação Prolongada (ofertas FB Ads, links, ticket, formato, observação)
   + Fichário de Detalhes Completo com redirecionamento de Notificações
   ============================================ */

const Notes = {
  _typeFilter: 'all', // 'all', 'fixa', 'diaria', 'prolongada', 'expiradas'
  _categoryFilter: 'all',
  _searchQuery: '',
  _modalSelectedType: 'prolongada', // 'fixa', 'diaria', 'prolongada'
  _modalImportance: 'normal', // 'normal', 'importante', 'super'
  _tempUploadedImage: '', // base64 data url from file upload

  // Helper: Verifica e move anotações com prazos vencidos para 'Expiradas'
  checkExpirations() {
    if (typeof Store !== 'undefined' && Store.notes && typeof Store.notes.checkExpirations === 'function') {
      return Store.notes.checkExpirations();
    }
    return false;
  },

  render() {
    this.checkExpirations();
    const allNotes = Store.notes.getAll();
    const categories = Store.notes.getCategories();

    // Contadores para as abas de tipo
    const counts = {
      all: allNotes.filter(n => !n.expired && n.category !== 'Expiradas').length,
      fixa: allNotes.filter(n => n.type === 'fixa' && !n.expired && n.category !== 'Expiradas').length,
      diaria: allNotes.filter(n => n.type === 'diaria' && !n.expired && n.category !== 'Expiradas').length,
      prolongada: allNotes.filter(n => (n.type === 'prolongada' || !n.type) && !n.expired && n.category !== 'Expiradas').length,
      expiradas: allNotes.filter(n => n.expired || n.category === 'Expiradas').length
    };

    // Filtragem principal por Tipo
    let filtered = allNotes.filter(n => {
      const isExpired = !!n.expired || n.category === 'Expiradas';
      if (this._typeFilter === 'all') return !isExpired;
      if (this._typeFilter === 'fixa') return n.type === 'fixa' && !isExpired;
      if (this._typeFilter === 'diaria') return n.type === 'diaria' && !isExpired;
      if (this._typeFilter === 'prolongada') return (n.type === 'prolongada' || !n.type) && !isExpired;
      if (this._typeFilter === 'expiradas') return isExpired;
      return true;
    });

    // Filtragem secundária por Categoria
    if (this._categoryFilter !== 'all') {
      filtered = filtered.filter(n => n.category === this._categoryFilter);
    }

    // Filtragem por busca
    if (this._searchQuery.trim()) {
      const q = this._searchQuery.toLowerCase().trim();
      filtered = filtered.filter(n => 
        (n.title && n.title.toLowerCase().includes(q)) || 
        (n.content && n.content.toLowerCase().includes(q)) ||
        (n.category && n.category.toLowerCase().includes(q)) ||
        (n.notifyMessage && n.notifyMessage.toLowerCase().includes(q))
      );
    }

    return `
      <div class="animate-fadeIn">
        <!-- Header da Página -->
        <div class="page-header" style="flex-wrap: wrap; gap: var(--space-4);">
          <div class="page-header-left">
            <h1 class="page-title" style="display: flex; align-items: center; gap: 10px;">
              <span>Anotações</span>
              <span style="font-size: 0.8rem; padding: 2px 8px; border-radius: 12px; background: var(--accent-soft); color: var(--accent); font-weight: 700;">Korhaven 2.0</span>
            </h1>
            <p class="page-subtitle">Anotações Fixas, Diárias com Prazos e Ofertas Prolongadas</p>
          </div>
          <div class="page-header-right" style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="Picker.openDemo()" style="gap: 6px; border-color: rgba(0, 229, 255, 0.4); box-shadow: 0 0 12px rgba(0, 229, 255, 0.12);" title="Ver e Testar Protótipo">
              <span style="font-size: 1.1rem;">🗓️</span>
              <span>Protótipo Calendário & Relógio</span>
            </button>
            <button class="btn btn-primary" onclick="Notes.openModal()" style="box-shadow: 0 4px 15px var(--accent-glow);">
              ${Utils.icon('plus')} Nova Anotação
            </button>
          </div>
        </div>

        <!-- Abas por Tipo de Anotação (Segmented Pills) -->
        <div style="margin-bottom: var(--space-4);">
          <div class="notes-type-tabs">
            <div class="notes-type-tab-item ${this._typeFilter === 'all' ? 'active' : ''}" onclick="Notes.setTypeFilter('all')">
              <span>Todas</span>
              <span class="tab-counter">${counts.all}</span>
            </div>
            <div class="notes-type-tab-item ${this._typeFilter === 'fixa' ? 'active' : ''}" onclick="Notes.setTypeFilter('fixa')">
              <span>📌 Anotação Fixa</span>
              <span class="tab-counter">${counts.fixa}</span>
            </div>
            <div class="notes-type-tab-item ${this._typeFilter === 'diaria' ? 'active' : ''}" onclick="Notes.setTypeFilter('diaria')">
              <span>📅 Anotação Diária</span>
              <span class="tab-counter">${counts.diaria}</span>
            </div>
            <div class="notes-type-tab-item ${this._typeFilter === 'prolongada' ? 'active' : ''}" onclick="Notes.setTypeFilter('prolongada')">
              <span>📈 Anotação Prolongada</span>
              <span class="tab-counter">${counts.prolongada}</span>
            </div>
            <div class="notes-type-tab-item ${this._typeFilter === 'expiradas' ? 'active' : ''}" onclick="Notes.setTypeFilter('expiradas')">
              <span>📁 Expiradas / Histórico</span>
              <span class="tab-counter">${counts.expiradas}</span>
            </div>
          </div>
        </div>

        <!-- Barra Secundária: Categorias & Busca Rápida -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-6); flex-wrap: wrap;">
          <div class="tabs" style="overflow-x: auto; max-width: 100%; white-space: nowrap; scrollbar-width: none;">
            <div class="tab-item ${this._categoryFilter === 'all' ? 'active' : ''}" onclick="Notes.setCategoryFilter('all')">Todas Categorias</div>
            ${categories.map(cat => `
              <div class="tab-item ${this._categoryFilter === cat ? 'active' : ''}" onclick="Notes.setCategoryFilter('${cat}')">${cat}</div>
            `).join('')}
            <div class="tab-item" onclick="Notes.promptAddCategory()" style="color: var(--accent); font-weight: 600;">+ Nova Categoria</div>
          </div>
          
          <div style="position: relative; min-width: 220px; flex-grow: 1; max-width: 320px;">
            <input type="text" class="form-input" style="padding-left: 36px; padding-top: 6px; padding-bottom: 6px; font-size: 0.85rem;" 
                   placeholder="Buscar anotação..." value="${this._searchQuery}" oninput="Notes.handleSearch(this.value)">
            <svg style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted);" 
                 width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>

        <!-- Grid de Anotações -->
        ${filtered.length > 0 ? `
          <div class="notes-grid stagger">
            ${filtered.map(n => this.renderNoteCard(n)).join('')}
          </div>
        ` : `
          <div class="card" style="padding: var(--space-12) var(--space-6);">
            <div class="empty-state">
              <div style="font-size: 3.5rem; margin-bottom: 1rem;">
                ${this._typeFilter === 'fixa' ? '📌' : this._typeFilter === 'diaria' ? '📅' : this._typeFilter === 'expiradas' ? '📁' : '📝'}
              </div>
              <h3 class="empty-state-title">
                ${this._typeFilter === 'expiradas' ? 'Nenhuma anotação expirada' : 'Nenhuma anotação encontrada'}
              </h3>
              <p class="empty-state-text" style="max-width: 440px; margin: 0 auto var(--space-4);">
                ${this._typeFilter === 'expiradas' 
                  ? 'Anotações diárias cujo prazo vencer aparecerão automaticamente nesta categoria.' 
                  : 'Crie uma nova anotação fixa, diária ou prolongada para começar a organizar suas ideias e metas.'}
              </p>
              ${this._typeFilter !== 'expiradas' ? `
                <button class="btn btn-primary" onclick="Notes.openModal()">
                  ${Utils.icon('plus')} Criar Anotação Agora
                </button>
              ` : ''}
            </div>
          </div>
        `}
      </div>

      <!-- ============================================ -->
      <!-- MODAL DE CRIAÇÃO / EDIÇÃO DE ANOTAÇÃO        -->
      <!-- ============================================ -->
      <div class="modal-overlay" id="note-modal">
        <div class="modal" style="max-width: 640px;">
          <div class="modal-header">
            <h3 class="modal-title" id="note-modal-title">Nova Anotação</h3>
            <button class="modal-close" onclick="Notes.closeModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="note-edit-id" value="">

            <!-- Seletor dos 3 Tipos de Anotação -->
            <label class="form-label" style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent);">
              Escolha o Tipo de Anotação:
            </label>
            <div class="modal-note-type-selector">
              <button type="button" class="modal-type-btn ${this._modalSelectedType === 'fixa' ? 'active' : ''}" 
                      id="type-btn-fixa" onclick="Notes.setModalType('fixa')">
                <span style="font-size: 1.2rem;">📌</span>
                <span>Anotação Fixa</span>
              </button>
              <button type="button" class="modal-type-btn ${this._modalSelectedType === 'diaria' ? 'active' : ''}" 
                      id="type-btn-diaria" onclick="Notes.setModalType('diaria')">
                <span style="font-size: 1.2rem;">📅</span>
                <span>Anotação Diária</span>
              </button>
              <button type="button" class="modal-type-btn ${this._modalSelectedType === 'prolongada' ? 'active' : ''}" 
                      id="type-btn-prolongada" onclick="Notes.setModalType('prolongada')">
                <span style="font-size: 1.2rem;">📈</span>
                <span>Anotação Prolongada</span>
              </button>
            </div>

            <!-- TÍTULO (Comum a todos) -->
            <div class="form-group">
              <label class="form-label">Título da Anotação <span style="color: var(--danger);">*</span></label>
              <input type="text" class="form-input" id="note-title" placeholder="Ex: Regras de Ouro, Fechar Projeto, Oferta X...">
            </div>

            <!-- CATEGORIA (Comum a todos) -->
            <div class="form-group">
              <label class="form-label">Categoria</label>
              <select class="form-input" id="note-category">
                ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
              </select>
            </div>

            <!-- ===================================== -->
            <!-- CAMPOS ESPECÍFICOS: ANOTAÇÃO FIXA     -->
            <!-- ===================================== -->
            <div id="fields-type-fixa" style="display: ${this._modalSelectedType === 'fixa' ? 'block' : 'none'};">
              <!-- Upload de Imagem para Bater o Olho e Entender -->
              <div class="form-group">
                <label class="form-label" style="display: flex; align-items: center; justify-content: space-between;">
                  <span>Imagem de Destaque (Visual rápido)</span>
                  <span style="font-size: 0.75rem; color: var(--accent);">Bata o olho e entenda</span>
                </label>
                
                <div class="image-upload-zone" onclick="document.getElementById('note-file-input').click()">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">
                    Clique para escolher imagem ou tirar foto no celular
                  </div>
                  <div class="form-hint" style="margin-top: 0;">JPG, PNG, WebP do seu computador ou smartphone</div>
                </div>
                <input type="file" id="note-file-input" accept="image/*" style="display: none;" onchange="Notes.handleFileSelect(event)">

                <div id="note-img-preview-container" class="image-upload-preview-box" style="display: none;">
                  <img id="note-img-preview-element" src="" alt="Preview">
                  <button type="button" class="remove-btn" title="Remover imagem" onclick="Notes.removeSelectedImage()">✕</button>
                </div>

                <div style="margin-top: var(--space-2);">
                  <input type="url" class="form-input" id="note-image-url-input" placeholder="Ou se preferir, cole o link direto da imagem aqui..." oninput="Notes.handleUrlInput(this.value)">
                </div>
              </div>

              <!-- Descrição -->
              <div class="form-group">
                <label class="form-label">Descrição da Anotação Fixa</label>
                <textarea class="form-input" id="note-content-fixa" rows="5" placeholder="Escreva a descrição, regras ou pontos-chave que você sempre quer ver..."></textarea>
              </div>

              <!-- Notificação da Fixa -->
              <div class="form-group" style="background: rgba(0, 229, 255, 0.04); border: 1px solid rgba(0, 229, 255, 0.2); padding: var(--space-4); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <label class="form-label" style="margin-bottom: 0; cursor: pointer; display: flex; align-items: center; gap: 8px;" onclick="document.getElementById('fixa-notify-toggle').click()">
                    <span style="font-size: 1.2rem;">🔔</span>
                    <span style="font-weight: 700; color: var(--text-primary);">Notificar no celular?</span>
                  </label>
                  <input type="checkbox" id="fixa-notify-toggle" onchange="Notes.toggleFixaNotifyFields(this.checked)" style="width: 20px; height: 20px; accent-color: var(--accent); cursor: pointer;">
                </div>
                
                <div id="fixa-notify-fields" style="display: none; margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid rgba(255,255,255,0.08);">
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Data para Notificação</label>
                      <div class="korhaven-picker-trigger" onclick="Picker.openDate('fixa-notify-date')">
                        <div class="trigger-icon">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </div>
                        <span class="trigger-value" id="fixa-notify-date-display">15/11/2026</span>
                        <input type="hidden" id="fixa-notify-date" value="2026-11-15">
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Horário</label>
                      <div class="korhaven-picker-trigger" onclick="Picker.openTime('fixa-notify-time')">
                        <div class="trigger-icon">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <span class="trigger-value" id="fixa-notify-time-display">09:00</span>
                        <input type="hidden" id="fixa-notify-time" value="09:00">
                      </div>
                    </div>
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Mensagem do Alerta (Opcional)</label>
                    <input type="text" class="form-input" id="fixa-notify-msg" placeholder="Ex: Hora de revisar as anotações fixas!">
                  </div>
                </div>
              </div>
            </div>

            <!-- ===================================== -->
            <!-- CAMPOS ESPECÍFICOS: ANOTAÇÃO DIÁRIA   -->
            <!-- ===================================== -->
            <div id="fields-type-diaria" style="display: ${this._modalSelectedType === 'diaria' ? 'block' : 'none'};">
              <!-- Nível de Importância -->
              <div class="form-group">
                <label class="form-label">Grau de Importância</label>
                <div class="importance-selector-grid">
                  <button type="button" class="importance-opt-btn ${this._modalImportance === 'normal' ? 'active' : ''}" 
                          data-imp="normal" onclick="Notes.setModalImportance('normal')">
                    <span>🟢</span>
                    <span>Normal</span>
                  </button>
                  <button type="button" class="importance-opt-btn ${this._modalImportance === 'importante' ? 'active' : ''}" 
                          data-imp="importante" onclick="Notes.setModalImportance('importante')">
                    <span>🟡</span>
                    <span>Importante</span>
                  </button>
                  <button type="button" class="importance-opt-btn ${this._modalImportance === 'super' ? 'active' : ''}" 
                          data-imp="super" onclick="Notes.setModalImportance('super')">
                    <span>🔴</span>
                    <span>Super Importante</span>
                  </button>
                </div>
              </div>

              <!-- Horário e Data da Anotação Diária -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Horário do Dia</label>
                  <div class="korhaven-picker-trigger" onclick="Picker.openTime('diaria-time')">
                    <div class="trigger-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <span class="trigger-value" id="diaria-time-display">08:00</span>
                    <input type="hidden" id="diaria-time" value="08:00">
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Data de Realização</label>
                  <div class="korhaven-picker-trigger" onclick="Picker.openDate('diaria-date')">
                    <div class="trigger-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                    <span class="trigger-value" id="diaria-date-display">15/11/2026</span>
                    <input type="hidden" id="diaria-date" value="2026-11-15">
                  </div>
                </div>
              </div>

              <!-- PRAZO DA ANOTAÇÃO (Com Auto-Expiração) -->
              <div class="form-group" style="background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.3); padding: var(--space-4); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: var(--space-2);">
                  <span style="font-size: 1.2rem;">⏳</span>
                  <label class="form-label" style="margin-bottom: 0; font-weight: 700; color: #c4b5fd;">
                    Definir Prazo Limite (Auto-Expiração)
                  </label>
                </div>
                <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: var(--space-3); line-height: 1.4;">
                  Ao vencer este prazo, a anotação se apagará da lista ativa e irá automaticamente para a categoria <strong>Expiradas / Histórico</strong>.
                </p>
                <div class="form-row">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Data do Prazo</label>
                    <div class="korhaven-picker-trigger" onclick="Picker.openDate('diaria-deadline-date')">
                      <div class="trigger-icon">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      </div>
                      <span class="trigger-value" id="diaria-deadline-date-display">16/11/2026</span>
                      <input type="hidden" id="diaria-deadline-date" value="2026-11-16">
                    </div>
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Horário Limite</label>
                    <div class="korhaven-picker-trigger" onclick="Picker.openTime('diaria-deadline-time')">
                      <div class="trigger-icon">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      </div>
                      <span class="trigger-value" id="diaria-deadline-time-display">18:00</span>
                      <input type="hidden" id="diaria-deadline-time" value="18:00">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Notificação & Edição de Mensagem do App -->
              <div class="form-group" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); padding: var(--space-4); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2);">
                  <label class="form-label" style="margin-bottom: 0; cursor: pointer; display: flex; align-items: center; gap: 8px;" onclick="document.getElementById('diaria-notify-toggle').click()">
                    <span style="font-size: 1.2rem;">📲</span>
                    <span style="font-weight: 700; color: var(--text-primary);">Notificar no Celular</span>
                  </label>
                  <input type="checkbox" id="diaria-notify-toggle" checked onchange="Notes.toggleDiariaNotifyFields(this.checked)" style="width: 20px; height: 20px; accent-color: var(--accent); cursor: pointer;">
                </div>
                <div class="form-hint">Receba o alerta na tela do smartphone com o texto exato que desejar.</div>

                <div id="diaria-notify-fields" style="margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--border);">
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Data do Alerta</label>
                      <div class="korhaven-picker-trigger" onclick="Picker.openDate('diaria-notify-date')">
                        <div class="trigger-icon">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </div>
                        <span class="trigger-value" id="diaria-notify-date-display">15/11/2026</span>
                        <input type="hidden" id="diaria-notify-date" value="2026-11-15">
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Horário do Alerta</label>
                      <div class="korhaven-picker-trigger" onclick="Picker.openTime('diaria-notify-time')">
                        <div class="trigger-icon">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <span class="trigger-value" id="diaria-notify-time-display">09:00</span>
                        <input type="hidden" id="diaria-notify-time" value="09:00">
                      </div>
                    </div>
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Mensagem da Notificação do App</label>
                    <input type="text" class="form-input" id="diaria-notify-msg" placeholder="Ex: Atenção! Concluir tarefa super importante até o fim do dia!">
                    <div class="form-hint">Este texto aparecerá na barra de notificações do seu celular.</div>
                  </div>
                </div>
              </div>

              <!-- Anotações do Dia -->
              <div class="form-group">
                <label class="form-label">Anotações / Detalhes</label>
                <textarea class="form-input" id="note-content-diaria" rows="5" placeholder="Escreva os detalhes, tarefas ou instruções do dia..."></textarea>
              </div>
            </div>

            <!-- ===================================== -->
            <!-- CAMPOS ESPECÍFICOS: ANOTAÇÃO PROLONGADA -->
            <!-- ===================================== -->
            <div id="fields-type-prolongada" style="display: ${this._modalSelectedType === 'prolongada' ? 'block' : 'none'};">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Link do Anúncio (FB Ads Library) (Opcional)</label>
                  <input type="url" class="form-input" id="prolongada-ad-url" placeholder="https://www.facebook.com/ads/library/...">
                </div>
                <div class="form-group">
                  <label class="form-label">Link do Site / Oferta (Destino) (Opcional)</label>
                  <input type="url" class="form-input" id="prolongada-url" placeholder="https://...">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Data de Observação (Opcional)</label>
                  <div class="korhaven-picker-trigger" onclick="Picker.openDate('prolongada-obs-date')">
                    <div class="trigger-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                    <span class="trigger-value" id="prolongada-obs-date-display">15/11/2026</span>
                    <input type="hidden" id="prolongada-obs-date" value="2026-11-15">
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Ticket (Preço)</label>
                  <select class="form-input" id="prolongada-ticket">
                    <option value="">Não classificar</option>
                    <option value="Low Ticket">Low Ticket</option>
                    <option value="Mid Ticket">Mid Ticket</option>
                    <option value="High Ticket">High Ticket</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Formato</label>
                  <select class="form-input" id="prolongada-format">
                    <option value="">Não classificar</option>
                    <option value="VSL">VSL</option>
                    <option value="Página de Vendas">Página de Vendas</option>
                    <option value="Quiz">Quiz</option>
                    <option value="X1 (WhatsApp)">X1 (WhatsApp)</option>
                    <option value="Advertorial">Advertorial</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Upload de Imagem do Anúncio</label>
                  <button type="button" class="btn btn-secondary" style="width: 100%; justify-content: center; gap: 6px;" onclick="document.getElementById('prolongada-file-input').click()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Subir Imagem do Dispositivo
                  </button>
                  <input type="file" id="prolongada-file-input" accept="image/*" style="display: none;" onchange="Notes.handleFileSelect(event)">
                </div>
              </div>

              <!-- Preview e URL Imagem Prolongada -->
              <div id="prolongada-img-preview-container" class="image-upload-preview-box" style="display: none;">
                <img id="prolongada-img-preview-element" src="" alt="Preview">
                <button type="button" class="remove-btn" title="Remover imagem" onclick="Notes.removeSelectedImage()">✕</button>
              </div>

              <div class="form-group">
                <label class="form-label">Ou Cole a URL da Imagem do Anúncio (Opcional)</label>
                <input type="url" class="form-input" id="prolongada-img-url" placeholder="Cole o link da imagem aqui..." oninput="Notes.handleUrlInput(this.value)">
              </div>

              <div class="form-group">
                <label class="form-label">Anotações / Copy</label>
                <textarea class="form-input" id="note-content-prolongada" rows="6" placeholder="Cole aqui a copy, detalhes da oferta, promessa, ganchos ou suas ideias..."></textarea>
              </div>

              <!-- Lembrete Prolongada -->
              <div class="form-group" style="margin-top: var(--space-4); border-top: 1px solid var(--border); padding-top: var(--space-4);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2);">
                  <label class="form-label" style="margin-bottom: 0; display: flex; align-items: center; gap: var(--space-2); cursor: pointer;" onclick="document.getElementById('prolongada-notify-toggle').click()">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    Lembrete / Notificação (Reunião, Prazo ou Compromisso)
                  </label>
                  <input type="checkbox" id="prolongada-notify-toggle" onchange="Notes.toggleProlongadaNotifyFields(this.checked)" style="width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer;">
                </div>
                <div class="form-hint">Receba um alerta na barra de notificações com data, horário e mensagem personalizada.</div>

                <div id="prolongada-notify-fields" style="display: none; margin-top: var(--space-3); background: rgba(255,255,255,0.03); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border);">
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Data do Alerta</label>
                      <div class="korhaven-picker-trigger" onclick="Picker.openDate('prolongada-notify-date')">
                        <div class="trigger-icon">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </div>
                        <span class="trigger-value" id="prolongada-notify-date-display">15/11/2026</span>
                        <input type="hidden" id="prolongada-notify-date" value="2026-11-15">
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Horário do Alerta</label>
                      <div class="korhaven-picker-trigger" onclick="Picker.openTime('prolongada-notify-time')">
                        <div class="trigger-icon">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <span class="trigger-value" id="prolongada-notify-time-display">14:00</span>
                        <input type="hidden" id="prolongada-notify-time" value="14:00">
                      </div>
                    </div>
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Como a notificação vai aparecer no celular?</label>
                    <input type="text" class="form-input" id="prolongada-notify-message" placeholder="Ex: Analisar métricas desta oferta hoje!">
                  </div>
                </div>
              </div>
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Notes.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Notes.saveFromModal()">Salvar Anotação</button>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- MODAL DO FICHÁRIO (DOSSIÊ COMPLETO)          -->
      <!-- ============================================ -->
      <div class="modal-overlay" id="note-fichario-modal">
        <div class="modal fichario-modal-container" id="fichario-modal-body">
          <!-- Renderizado dinamicamente por openFichario -->
        </div>
      </div>
    `;
  },

  // ============================================
  // RENDERIZAÇÃO DOS CARDS POR TIPO
  // ============================================
  renderNoteCard(n) {
    const isExpired = !!n.expired || n.category === 'Expiradas';
    const type = n.type || 'prolongada';

    // Determina badge do tipo
    let typeBadgeHtml = '';
    let cardClass = 'note-card';

    if (isExpired) {
      cardClass += ' card-expirada';
      typeBadgeHtml = `<span class="badge-note-type badge-note-expirada">⚠️ Expirada</span>`;
    } else if (type === 'fixa') {
      cardClass += ' card-fixa';
      typeBadgeHtml = `<span class="badge-note-type badge-note-fixa">📌 Anotação Fixa</span>`;
    } else if (type === 'diaria') {
      const isSuper = n.importance === 'super';
      cardClass += isSuper ? ' card-diaria card-diaria-super' : ' card-diaria';
      typeBadgeHtml = `<span class="badge-note-type badge-note-diaria">📅 Anotação Diária</span>`;
    } else {
      cardClass += ' card-prolongada';
      typeBadgeHtml = `<span class="badge-note-type badge-note-prolongada">📈 Prolongada</span>`;
    }

    // Importância (para diária)
    let importanceBadge = '';
    if (type === 'diaria') {
      if (n.importance === 'super') {
        importanceBadge = `<span class="importance-tag importance-super">🔴 Super Importante</span>`;
      } else if (n.importance === 'importante') {
        importanceBadge = `<span class="importance-tag importance-importante">🟡 Importante</span>`;
      } else {
        importanceBadge = `<span class="importance-tag importance-normal">🟢 Normal</span>`;
      }
    }

    // Prazo e Horário
    let deadlineHtml = '';
    if (type === 'diaria' && n.deadlineDate) {
      const dlTime = n.deadlineTime || '23:59';
      const deadlineObj = new Date(`${n.deadlineDate}T${dlTime}:00`);
      const now = new Date();
      const diffMs = deadlineObj - now;
      const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));

      if (isExpired || diffMs <= 0) {
        deadlineHtml = `
          <div class="note-deadline-box expired">
            <span>⚠️ Prazo Vencido (${Utils.formatDate(n.deadlineDate)} às ${dlTime})</span>
          </div>
        `;
      } else if (hoursLeft < 12) {
        deadlineHtml = `
          <div class="note-deadline-box urgent">
            <span>⏳ Expira em breve: ${hoursLeft <= 1 ? 'Menos de 1h' : `${hoursLeft} horas`} (${dlTime})</span>
          </div>
        `;
      } else {
        deadlineHtml = `
          <div class="note-deadline-box active-countdown">
            <span>⏳ Prazo: ${Utils.formatDate(n.deadlineDate)} às ${dlTime}</span>
          </div>
        `;
      }
    }

    // Imagem da anotação (especialmente para Fixa onde é destaque)
    const imgUrl = n.imageUrl || '';
    const imageHtml = imgUrl ? `
      <div class="note-card-img-wrap" onclick="Notes.openFichario('${n.id}')" title="Clique para abrir fichário">
        <img src="${imgUrl}" alt="${n.title}" referrerpolicy="no-referrer" loading="lazy">
      </div>
    ` : '';

    return `
      <div class="${cardClass}">
        <!-- Topo do Card: Badges -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${typeBadgeHtml}
            ${importanceBadge}
          </div>
          <span class="tag" style="font-size: 0.7rem; background: rgba(255,255,255,0.05);">${n.category}</span>
        </div>

        <!-- Imagem se houver -->
        ${imageHtml}

        <!-- Título -->
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); cursor: pointer; line-height: 1.3;" 
            onclick="Notes.openFichario('${n.id}')">
          ${n.title}
        </h3>

        <!-- Prazos e Lembretes -->
        ${deadlineHtml}

        ${n.time ? `
          <div style="font-size: 0.8rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 5px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>Horário: <strong>${n.time}</strong></span>
          </div>
        ` : ''}

        ${n.reminder && n.reminder.enabled ? `
          <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.25); border-radius: 8px; font-size: 0.78rem; color: var(--accent);">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span>Alerta: ${Utils.formatDate(n.reminder.date)} às ${n.reminder.time} ${n.reminder.message ? `— "${n.reminder.message}"` : ''}</span>
          </div>
        ` : ''}

        <!-- Detalhes de Oferta FB Ads (se Prolongada) -->
        ${type === 'prolongada' ? `
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem;">
            ${n.url ? `<div><span style="color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; font-weight: bold;">Site:</span> <a href="${n.url}" target="_blank" style="color: var(--accent); text-decoration: underline; word-break: break-all;">${n.url}</a></div>` : ''}
            ${n.adUrl ? `<div><span style="color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; font-weight: bold;">FB Ads:</span> <a href="${n.adUrl}" target="_blank" style="color: var(--accent); text-decoration: underline; word-break: break-all;">${n.adUrl}</a></div>` : ''}
            ${n.observationDate ? `
              <div style="display: inline-flex; align-items: center; gap: 6px; color: var(--warning); font-size: 0.8rem; font-weight: 600;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>${Math.max(0, Math.floor((new Date() - new Date(n.observationDate)) / (1000 * 60 * 60 * 24)))} dias observando</span>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Texto / Descrição (Truncado para visualização agradável) -->
        <p style="font-size: 0.9rem; color: var(--text-secondary); opacity: 0.9; white-space: pre-wrap; flex-grow: 1; line-height: 1.5; margin: var(--space-1) 0; max-height: 120px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;">
          ${n.content}
        </p>

        <!-- Tags e Rodapé com Ações -->
        <div style="margin-top: auto; padding-top: var(--space-3); border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <button class="btn btn-secondary sm" onclick="Notes.openFichario('${n.id}')" style="font-size: 0.78rem; padding: 4px 10px; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Ver Fichário
            </button>
            ${isExpired ? `
              <button class="btn sm" onclick="Notes.promptReactivate('${n.id}')" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; font-size: 0.78rem; padding: 4px 10px;">
                🔄 Reativar
              </button>
            ` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 4px;">
            <button class="btn btn-icon btn-ghost sm" title="Editar" onclick="Notes.openModal('${n.id}')">
              ${Utils.icons.edit}
            </button>
            <button class="btn btn-icon btn-ghost sm" title="Excluir" onclick="Notes.confirmDelete('${n.id}')">
              ${Utils.icons.trash}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ============================================
  // FICHÁRIO COMPLETO (DOSSIÊ DA ANOTAÇÃO)
  // Chamado diretamente ou pelo clique na Notificação Móvel
  // ============================================
  openFichario(noteId) {
    const n = Store.notes.get(noteId) || Store.notes.getAll().find(item => item.id === noteId);
    if (!n) {
      Utils.toast('Anotação não encontrada.', 'warning');
      return;
    }

    const modal = document.getElementById('note-fichario-modal');
    const container = document.getElementById('fichario-modal-body');
    if (!modal || !container) return;

    const isExpired = !!n.expired || n.category === 'Expiradas';
    const type = n.type || 'prolongada';

    let typeTitle = 'Anotação Prolongada';
    let typeIcon = '📈';
    let typeColor = '#10b981';

    if (type === 'fixa') {
      typeTitle = 'Anotação Fixa';
      typeIcon = '📌';
      typeColor = '#00E5FF';
    } else if (type === 'diaria') {
      typeTitle = 'Anotação Diária';
      typeIcon = '📅';
      typeColor = '#8b5cf6';
    }

    let importanceTag = '';
    if (type === 'diaria') {
      if (n.importance === 'super') {
        importanceTag = `<span class="importance-tag importance-super" style="font-size: 0.85rem; padding: 5px 14px;">🔴 SUPER IMPORTANTE</span>`;
      } else if (n.importance === 'importante') {
        importanceTag = `<span class="importance-tag importance-importante" style="font-size: 0.85rem; padding: 5px 14px;">🟡 IMPORTANTE</span>`;
      } else {
        importanceTag = `<span class="importance-tag importance-normal" style="font-size: 0.85rem; padding: 5px 14px;">🟢 NORMAL</span>`;
      }
    }

    // Prazo
    let deadlineDisplay = '';
    if (n.deadlineDate) {
      const dlTime = n.deadlineTime || '18:00';
      deadlineDisplay = `
        <div style="background: rgba(139, 92, 246, 0.12); border: 1px solid rgba(139, 92, 246, 0.35); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); margin-bottom: var(--space-4);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">⏳</span>
              <div>
                <div style="font-size: 0.75rem; color: #c4b5fd; text-transform: uppercase; font-weight: 700;">Prazo Limite da Anotação</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: #fff;">${Utils.formatDate(n.deadlineDate)} às ${dlTime}</div>
              </div>
            </div>
            ${isExpired ? `
              <span class="badge-note-type badge-note-expirada" style="font-size: 0.8rem; padding: 4px 10px;">⚠️ EXPIRADA / ARQUIVADA</span>
            ` : `
              <span style="font-size: 0.8rem; color: #34d399; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #34d399;"></span>
                Dentro do Prazo
              </span>
            `}
          </div>
        </div>
      `;
    }

    // Imagem
    const imgHtml = n.imageUrl ? `
      <div style="margin-bottom: var(--space-5); border-radius: var(--radius-lg); overflow: hidden; max-height: 380px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.5); display: flex; justify-content: center;">
        <img src="${n.imageUrl}" alt="${n.title}" referrerpolicy="no-referrer" style="width: 100%; max-height: 380px; object-fit: contain;">
      </div>
    ` : '';

    // Notificação configurada
    let notifBox = '';
    const rem = n.reminder;
    if (rem && rem.enabled) {
      notifBox = `
        <div style="background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.25); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); margin-bottom: var(--space-4);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--accent)" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span style="font-size: 0.75rem; color: var(--accent); font-weight: 700; text-transform: uppercase;">Notificação Móvel Configurada</span>
          </div>
          <div style="font-size: 0.9rem; color: var(--text-primary); font-weight: 600;">
            Programada para ${Utils.formatDate(rem.date)} às ${rem.time}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; font-style: italic;">
            " ${rem.message || n.title} "
          </div>
        </div>
      `;
    }

    // Links e dados de FB Ads (se Prolongada)
    let linksHtml = '';
    if (type === 'prolongada') {
      linksHtml = `
        <div style="display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); background: rgba(255,255,255,0.03); padding: var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--border);">
          <div style="font-size: 0.75rem; color: var(--accent); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Conexões da Oferta</div>
          <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">
            ${n.adUrl ? `
              <a href="${n.adUrl}" target="_blank" class="btn btn-secondary sm" style="gap: 6px; text-decoration: none; font-size: 0.8rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                Abrir Anúncio FB Ads
              </a>
            ` : ''}
            ${n.url ? `
              <a href="${n.url}" target="_blank" class="btn btn-primary sm" style="gap: 6px; text-decoration: none; font-size: 0.8rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                Acessar Site de Destino
              </a>
            ` : ''}
          </div>
          
          <div style="display: flex; align-items: center; gap: var(--space-3); margin-top: var(--space-2); flex-wrap: wrap; font-size: 0.82rem;">
            ${n.ticket ? `<span class="tag" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border);"><strong>Ticket:</strong> ${n.ticket}</span>` : ''}
            ${n.format ? `<span class="tag" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border);"><strong>Formato:</strong> ${n.format}</span>` : ''}
            ${n.observationDate ? `<span class="tag" style="color: var(--warning); border-color: rgba(251, 191, 36, 0.3);"><strong>Observação:</strong> ${Utils.formatDate(n.observationDate)}</span>` : ''}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <!-- Topo com visual de Fichário -->
      <div class="fichario-top-bar">
        <div class="fichario-brand-tag">
          <span>🗂️ FICHÁRIO KORHAVEN</span>
          <span style="opacity: 0.4;">|</span>
          <span style="color: ${typeColor};">${typeIcon} ${typeTitle}</span>
        </div>
        <button class="modal-close" onclick="Notes.closeFichario()">${Utils.icons.x}</button>
      </div>

      <div class="modal-body" style="padding: var(--space-6);">
        <!-- Cabeçalho do Dossiê -->
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
              <span class="tag tag-accent">${n.category}</span>
              ${importanceTag}
              ${n.time ? `<span class="tag" style="background: rgba(255,255,255,0.06);">⏰ ${n.time}</span>` : ''}
            </div>
            <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary); line-height: 1.25;">${n.title}</h2>
          </div>
        </div>

        ${deadlineDisplay}
        ${notifBox}
        ${imgHtml}
        ${linksHtml}

        <!-- Folha de Conteúdo da Anotação -->
        <div style="margin-bottom: var(--space-5);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2);">
            <label class="form-label" style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent); margin-bottom: 0;">
              Conteúdo & Anotações:
            </label>
            <button class="btn btn-secondary sm" onclick="Notes.copyContent('${n.id}')" style="font-size: 0.75rem; padding: 2px 8px; gap: 4px;">
              📋 Copiar Texto
            </button>
          </div>
          <div class="fichario-content-box" id="fichario-text-${n.id}">
${n.content || 'Nenhuma descrição adicionada.'}
          </div>
        </div>

        <!-- Metadados de Criação -->
        <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; padding-top: var(--space-3); border-top: 1px solid var(--border);">
          <span>Criado em: ${Utils.formatDate(n.createdAt, 'full')}</span>
          ${n.updatedAt ? `<span>Atualizado: ${Utils.formatDate(n.updatedAt, 'full')}</span>` : ''}
        </div>
      </div>

      <!-- Rodapé com Ações do Fichário -->
      <div class="modal-footer" style="background: rgba(0,0,0,0.25);">
        <button class="btn btn-secondary" onclick="Notes.closeFichario()">Fechar</button>
        ${isExpired ? `
          <button class="btn" onclick="Notes.closeFichario(); Notes.promptReactivate('${n.id}')" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b;">
            🔄 Renovar Prazo / Reativar
          </button>
        ` : ''}
        <button class="btn btn-secondary" onclick="Notes.closeFichario(); Notes.openModal('${n.id}')">
          ${Utils.icons.edit} Editar Anotação
        </button>
        <button class="btn btn-primary" onclick="Notes.closeFichario(); Notes.confirmDelete('${n.id}')" style="background: var(--danger); border-color: var(--danger);">
          ${Utils.icons.trash} Excluir
        </button>
      </div>
    `;

    modal.classList.add('active');
  },

  closeFichario() {
    const modal = document.getElementById('note-fichario-modal');
    if (modal) modal.classList.remove('active');
  },

  copyContent(noteId) {
    const n = Store.notes.get(noteId);
    if (!n || !n.content) return;
    navigator.clipboard.writeText(n.content).then(() => {
      Utils.toast('Conteúdo copiado para a área de transferência!', 'success');
    }).catch(() => {
      Utils.toast('Não foi possível copiar automaticamente.', 'warning');
    });
  },

  // ============================================
  // FILTROS & BUSCA
  // ============================================
  setTypeFilter(type) {
    this._typeFilter = type;
    App.renderCurrentPage();
  },

  setCategoryFilter(category) {
    this._categoryFilter = category;
    App.renderCurrentPage();
  },

  handleSearch(query) {
    this._searchQuery = query;
    App.renderCurrentPage();
  },

  promptAddCategory() {
    Utils.prompt('Nome da nova categoria:', (name) => {
      if (!name || !name.trim()) return;
      const cats = Store.notes.getCategories();
      const trimmed = name.trim();
      if (!cats.includes(trimmed)) {
        cats.push(trimmed);
        Store.notes.saveCategories(cats);
        Utils.toast(`Categoria "${trimmed}" criada!`, 'success');
        this.setCategoryFilter(trimmed);
      } else {
        Utils.toast('Esta categoria já existe.', 'warning');
      }
    });
  },

  promptReactivate(id) {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    Utils.confirm('Deseja reativar esta anotação e renovar seu prazo?', () => {
      Store.notes.reactivate(id, tomorrow, '18:00');
      Utils.toast('Anotação reativada com sucesso! Prazo renovado para amanhã.', 'success');
      App.renderCurrentPage();
    });
  },

  // ============================================
  // CONTROLE DO MODAL DE CRIAÇÃO / EDIÇÃO
  // ============================================
  setModalType(type) {
    this._modalSelectedType = type;
    
    // Atualiza botões
    ['fixa', 'diaria', 'prolongada'].forEach(t => {
      const btn = document.getElementById(`type-btn-${t}`);
      if (btn) {
        if (t === type) btn.classList.add('active');
        else btn.classList.remove('active');
      }
      const fieldWrap = document.getElementById(`fields-type-${t}`);
      if (fieldWrap) {
        fieldWrap.style.display = (t === type) ? 'block' : 'none';
      }
    });
  },

  setModalImportance(imp) {
    this._modalImportance = imp;
    document.querySelectorAll('.importance-opt-btn').forEach(btn => {
      if (btn.getAttribute('data-imp') === imp) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  // Helpers de toggle de campos de notificação
  toggleFixaNotifyFields(checked) {
    const el = document.getElementById('fixa-notify-fields');
    if (el) el.style.display = checked ? 'block' : 'none';
  },

  toggleDiariaNotifyFields(checked) {
    const el = document.getElementById('diaria-notify-fields');
    if (el) el.style.display = checked ? 'block' : 'none';
  },

  toggleProlongadaNotifyFields(checked) {
    const el = document.getElementById('prolongada-notify-fields');
    if (el) el.style.display = checked ? 'block' : 'none';
  },

  // Upload e manipulação de Imagens
  handleFileSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Utils.toast('Por favor, selecione um arquivo de imagem válido.', 'warning');
      return;
    }

    this.compressImage(file, 1280, 1280, 0.85).then(base64 => {
      this._tempUploadedImage = base64;
      this.updateImagePreview(base64);
      Utils.toast('Imagem carregada com sucesso!', 'success');
    }).catch(err => {
      console.error('Erro ao processar imagem:', err);
      Utils.toast('Erro ao processar imagem selecionada.', 'error');
    });
  },

  handleUrlInput(url) {
    if (url && url.trim()) {
      this._tempUploadedImage = url.trim();
      this.updateImagePreview(url.trim());
    }
  },

  updateImagePreview(src) {
    const previewFixa = document.getElementById('note-img-preview-container');
    const imgFixa = document.getElementById('note-img-preview-element');
    const previewProl = document.getElementById('prolongada-img-preview-container');
    const imgProl = document.getElementById('prolongada-img-preview-element');

    if (src) {
      if (previewFixa && imgFixa) {
        imgFixa.src = src;
        previewFixa.style.display = 'flex';
      }
      if (previewProl && imgProl) {
        imgProl.src = src;
        previewProl.style.display = 'flex';
      }
    } else {
      if (previewFixa) previewFixa.style.display = 'none';
      if (previewProl) previewProl.style.display = 'none';
    }
  },

  removeSelectedImage() {
    this._tempUploadedImage = '';
    const fileInputFixa = document.getElementById('note-file-input');
    const fileInputProl = document.getElementById('prolongada-file-input');
    const urlInputFixa = document.getElementById('note-image-url-input');
    const urlInputProl = document.getElementById('prolongada-img-url');

    if (fileInputFixa) fileInputFixa.value = '';
    if (fileInputProl) fileInputProl.value = '';
    if (urlInputFixa) urlInputFixa.value = '';
    if (urlInputProl) urlInputProl.value = '';

    this.updateImagePreview('');
  },

  // Helper: Comprime imagens para não exceder armazenamento
  compressImage(file, maxWidth = 1280, maxHeight = 1280, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // ============================================
  // ABERTURA DO MODAL
  // ============================================
  openModal(editId = null) {
    const modal = document.getElementById('note-modal');
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    const tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000) - (offset * 60 * 1000)).toISOString().split('T')[0];

    this._tempUploadedImage = '';
    this.updateImagePreview('');

    if (editId) {
      const n = Store.notes.get(editId) || Store.notes.getAll().find(item => item.id === editId);
      if (!n) return;

      document.getElementById('note-modal-title').textContent = 'Editar Anotação';
      document.getElementById('note-edit-id').value = n.id;
      document.getElementById('note-title').value = n.title || '';
      document.getElementById('note-category').value = n.category || 'Ofertas FB Ads';

      const type = n.type || 'prolongada';
      this.setModalType(type);

      this._tempUploadedImage = n.imageUrl || '';
      this.updateImagePreview(n.imageUrl || '');

      if (type === 'fixa') {
        document.getElementById('note-content-fixa').value = n.content || '';
        document.getElementById('note-image-url-input').value = n.imageUrl && !n.imageUrl.startsWith('data:') ? n.imageUrl : '';
        const rem = n.reminder || {};
        const toggle = document.getElementById('fixa-notify-toggle');
        if (toggle) {
          toggle.checked = !!rem.enabled;
          this.toggleFixaNotifyFields(toggle.checked);
        }
        Picker.setTrigger('fixa-notify-date', rem.date || localToday, 'date');
        Picker.setTrigger('fixa-notify-time', rem.time || '09:00', 'time');
        document.getElementById('fixa-notify-msg').value = rem.message || '';
      } else if (type === 'diaria') {
        this.setModalImportance(n.importance || 'normal');
        Picker.setTrigger('diaria-time', n.time || '08:00', 'time');
        Picker.setTrigger('diaria-date', n.date || localToday, 'date');
        Picker.setTrigger('diaria-deadline-date', n.deadlineDate || tomorrow, 'date');
        Picker.setTrigger('diaria-deadline-time', n.deadlineTime || '18:00', 'time');
        document.getElementById('note-content-diaria').value = n.content || '';

        const rem = n.reminder || {};
        const toggle = document.getElementById('diaria-notify-toggle');
        if (toggle) {
          toggle.checked = rem.enabled !== false;
          this.toggleDiariaNotifyFields(toggle.checked);
        }
        Picker.setTrigger('diaria-notify-date', rem.date || localToday, 'date');
        Picker.setTrigger('diaria-notify-time', rem.time || '09:00', 'time');
        document.getElementById('diaria-notify-msg').value = n.notifyMessage || rem.message || '';
      } else {
        // Prolongada
        document.getElementById('prolongada-ad-url').value = n.adUrl || '';
        document.getElementById('prolongada-url').value = n.url || '';
        Picker.setTrigger('prolongada-obs-date', n.observationDate || localToday, 'date');
        document.getElementById('prolongada-ticket').value = n.ticket || '';
        document.getElementById('prolongada-format').value = n.format || '';
        document.getElementById('prolongada-img-url').value = n.imageUrl && !n.imageUrl.startsWith('data:') ? n.imageUrl : '';
        document.getElementById('note-content-prolongada').value = n.content || '';

        const rem = n.reminder || {};
        const toggle = document.getElementById('prolongada-notify-toggle');
        if (toggle) {
          toggle.checked = !!rem.enabled;
          this.toggleProlongadaNotifyFields(toggle.checked);
        }
        Picker.setTrigger('prolongada-notify-date', rem.date || localToday, 'date');
        Picker.setTrigger('prolongada-notify-time', rem.time || '14:00', 'time');
        document.getElementById('prolongada-notify-message').value = rem.message || '';
      }
    } else {
      document.getElementById('note-modal-title').textContent = 'Nova Anotação';
      document.getElementById('note-edit-id').value = '';
      document.getElementById('note-title').value = '';
      document.getElementById('note-category').value = (this._categoryFilter !== 'all' && this._categoryFilter !== 'Expiradas') 
        ? this._categoryFilter 
        : 'Ofertas FB Ads';

      // Se usuário estiver na aba de um tipo específico, pré-seleciona aquele tipo!
      let defaultType = 'prolongada';
      if (this._typeFilter === 'fixa') defaultType = 'fixa';
      else if (this._typeFilter === 'diaria') defaultType = 'diaria';
      this.setModalType(defaultType);
      this.setModalImportance('normal');

      // Limpar campos
      document.getElementById('note-content-fixa').value = '';
      document.getElementById('note-image-url-input').value = '';
      document.getElementById('fixa-notify-toggle').checked = false;
      this.toggleFixaNotifyFields(false);
      Picker.setTrigger('fixa-notify-date', localToday, 'date');
      Picker.setTrigger('fixa-notify-time', '09:00', 'time');
      document.getElementById('fixa-notify-msg').value = '';

      Picker.setTrigger('diaria-time', '08:00', 'time');
      Picker.setTrigger('diaria-date', localToday, 'date');
      Picker.setTrigger('diaria-deadline-date', tomorrow, 'date');
      Picker.setTrigger('diaria-deadline-time', '18:00', 'time');
      document.getElementById('diaria-notify-toggle').checked = true;
      this.toggleDiariaNotifyFields(true);
      Picker.setTrigger('diaria-notify-date', localToday, 'date');
      Picker.setTrigger('diaria-notify-time', '09:00', 'time');
      document.getElementById('diaria-notify-msg').value = '';
      document.getElementById('note-content-diaria').value = '';

      document.getElementById('prolongada-ad-url').value = '';
      document.getElementById('prolongada-url').value = '';
      Picker.setTrigger('prolongada-obs-date', localToday, 'date');
      document.getElementById('prolongada-ticket').value = '';
      document.getElementById('prolongada-format').value = '';
      document.getElementById('prolongada-img-url').value = '';
      document.getElementById('note-content-prolongada').value = '';
      document.getElementById('prolongada-notify-toggle').checked = false;
      this.toggleProlongadaNotifyFields(false);
      Picker.setTrigger('prolongada-notify-date', localToday, 'date');
      Picker.setTrigger('prolongada-notify-time', '14:00', 'time');
      document.getElementById('prolongada-notify-message').value = '';
    }

    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('note-modal');
    if (modal) modal.classList.remove('active');
  },

  // ============================================
  // SALVAR ANOTAÇÃO A PARTIR DO MODAL
  // ============================================
  saveFromModal() {
    const title = document.getElementById('note-title').value.trim();
    if (!title) {
      Utils.toast('Por favor, digite o título da anotação.', 'warning');
      return;
    }

    const editId = document.getElementById('note-edit-id').value;
    const category = document.getElementById('note-category').value;
    const type = this._modalSelectedType;

    let content = '';
    let data = {
      title,
      category,
      type
    };

    if (type === 'fixa') {
      content = document.getElementById('note-content-fixa').value.trim();
      if (!content) {
        Utils.toast('Digite a descrição da anotação fixa.', 'warning');
        return;
      }
      data.content = content;
      data.imageUrl = this._tempUploadedImage || document.getElementById('note-image-url-input').value.trim();

      const notifyToggle = document.getElementById('fixa-notify-toggle');
      if (notifyToggle && notifyToggle.checked) {
        data.reminder = {
          enabled: true,
          date: document.getElementById('fixa-notify-date').value || Utils.today(),
          time: document.getElementById('fixa-notify-time').value || '09:00',
          message: document.getElementById('fixa-notify-msg').value.trim() || title
        };
        if (window.PWA && 'Notification' in window && Notification.permission !== 'granted') {
          PWA.requestAndTestNotification();
        }
      } else {
        data.reminder = { enabled: false };
      }
    } else if (type === 'diaria') {
      content = document.getElementById('note-content-diaria').value.trim();
      if (!content) {
        Utils.toast('Digite as anotações do dia.', 'warning');
        return;
      }
      data.content = content;
      data.importance = this._modalImportance || 'normal';
      data.time = document.getElementById('diaria-time').value || '08:00';
      data.date = document.getElementById('diaria-date').value;
      data.deadlineDate = document.getElementById('diaria-deadline-date').value;
      data.deadlineTime = document.getElementById('diaria-deadline-time').value || '18:00';
      data.notifyMessage = document.getElementById('diaria-notify-msg').value.trim() || title;
      data.expired = false; // ao salvar ou editar, reseta estado expirado

      const notifyToggle = document.getElementById('diaria-notify-toggle');
      if (notifyToggle && notifyToggle.checked) {
        data.reminder = {
          enabled: true,
          date: document.getElementById('diaria-notify-date').value || data.date,
          time: document.getElementById('diaria-notify-time').value || '09:00',
          message: data.notifyMessage
        };
        if (window.PWA && 'Notification' in window && Notification.permission !== 'granted') {
          PWA.requestAndTestNotification();
        }
      } else {
        data.reminder = { enabled: false };
      }
    } else {
      // Prolongada (Ofertas FB Ads)
      content = document.getElementById('note-content-prolongada').value.trim();
      if (!content) {
        Utils.toast('O campo de anotações / copy não pode estar vazio.', 'warning');
        return;
      }
      data.content = content;
      data.ticket = document.getElementById('prolongada-ticket').value;
      data.format = document.getElementById('prolongada-format').value;
      data.adUrl = document.getElementById('prolongada-ad-url').value.trim();
      data.url = document.getElementById('prolongada-url').value.trim();
      data.observationDate = document.getElementById('prolongada-obs-date').value;
      data.imageUrl = this._tempUploadedImage || document.getElementById('prolongada-img-url').value.trim();

      const notifyToggle = document.getElementById('prolongada-notify-toggle');
      if (notifyToggle && notifyToggle.checked) {
        data.reminder = {
          enabled: true,
          date: document.getElementById('prolongada-notify-date').value || Utils.today(),
          time: document.getElementById('prolongada-notify-time').value || '14:00',
          message: document.getElementById('prolongada-notify-message').value.trim() || title
        };
        if (window.PWA && 'Notification' in window && Notification.permission !== 'granted') {
          PWA.requestAndTestNotification();
        }
      } else {
        data.reminder = { enabled: false };
      }
    }

    if (editId) {
      data.id = editId;
    }

    Store.notes.save(data);
    if (window.PWA && typeof PWA.checkReminders === 'function') PWA.checkReminders();
    if (window.PWA && typeof PWA.syncRemindersToWorker === 'function') PWA.syncRemindersToWorker(null, true).catch(() => {});
    this.closeModal();
    Utils.toast(editId ? 'Anotação atualizada com sucesso!' : 'Anotação salva com sucesso!', 'success');
    App.renderCurrentPage();
  },

  confirmDelete(id) {
    Utils.confirm('Tem certeza que deseja excluir esta anotação permanentemente?', () => {
      Store.notes.delete(id);
      if (window.PWA && typeof PWA.syncRemindersToWorker === 'function') PWA.syncRemindersToWorker(null, true).catch(() => {});
      Utils.toast('Anotação removida com sucesso.', 'danger');
      App.renderCurrentPage();
    });
  },

  afterRender() {
    // Verifica se há noteId pendente na URL para abrir o Fichário automaticamente
    const hash = window.location.hash;
    if (hash && hash.includes('noteId=')) {
      const match = hash.match(/noteId=([^&]+)/);
      if (match && match[1]) {
        const noteId = decodeURIComponent(match[1]);
        setTimeout(() => {
          this.openFichario(noteId);
        }, 120);
      }
    }
  }
};

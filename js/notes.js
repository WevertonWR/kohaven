/* ============================================
   KORHAVEN — Notes / Anotações
   ============================================ */

const Notes = {
  _filter: 'all', // category name or 'all'

  render() {
    const allNotes = Store.notes.getAll();
    const categories = Store.notes.getCategories();
    
    const filtered = this._filter === 'all'
      ? allNotes
      : allNotes.filter(n => n.category === this._filter);

    return `
      <div class="animate-fadeIn">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">Anotações</h1>
            <p class="page-subtitle">Guarde suas ofertas do Facebook Ads e ideias</p>
          </div>
          <div class="page-header-right">
            <div class="tabs" style="overflow-x: auto; max-width: 50vw; white-space: nowrap;">
              <div class="tab-item ${this._filter === 'all' ? 'active' : ''}" onclick="Notes.setFilter('all')">Todas</div>
              ${categories.map(cat => `
                <div class="tab-item ${this._filter === cat ? 'active' : ''}" onclick="Notes.setFilter('${cat}')">${cat}</div>
              `).join('')}
            </div>
            <button class="btn btn-primary" onclick="Notes.openModal()">
              ${Utils.icon('plus')} Nova Anotação
            </button>
          </div>
        </div>

        ${filtered.length > 0 ? `
          <div class="quotes-grid stagger">
            ${filtered.map(n => `
              <div class="quote-card" style="display: flex; flex-direction: column; gap: var(--space-2);">
                <h3 style="font-size: var(--font-lg); font-weight: var(--fw-bold); margin-bottom: var(--space-1); color: var(--text-primary);">${n.title}</h3>
                ${n.imageUrl ? `<div style="margin-bottom: var(--space-3); border-radius: var(--radius-md); overflow: hidden; max-height: 300px; display: flex; justify-content: center; background: rgba(0,0,0,0.2);"><img src="${n.imageUrl}" referrerpolicy="no-referrer" style="max-width: 100%; object-fit: contain;"></div>` : ''}
                <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--space-2);">
                  ${n.url ? `<div><span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">Site/Oferta:</span> <a href="${n.url}" target="_blank" style="color: var(--accent); font-size: var(--font-sm); text-decoration: underline; word-break: break-all;">${n.url}</a></div>` : ''}
                  ${n.adUrl ? `<div><span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">FB Ads:</span> <a href="${n.adUrl}" target="_blank" style="color: var(--accent); font-size: var(--font-sm); text-decoration: underline; word-break: break-all;">${n.adUrl}</a></div>` : ''}
                  ${n.observationDate ? `
                    <div style="margin-top: 4px; display: inline-flex; align-items: center; gap: 6px;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--warning);"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">
                        ${Math.max(0, Math.floor((new Date() - new Date(n.observationDate)) / (1000 * 60 * 60 * 24)))} dias observando
                      </span>
                    </div>
                  ` : ''}
                </div>
                <p class="quote-card-text" style="font-size: var(--font-base); opacity: 0.9; white-space: pre-wrap; flex-grow: 1;">${n.content}</p>
                <div class="quote-card-footer" style="margin-top: var(--space-3);">
                  <div class="quote-card-tags" style="display: flex; flex-wrap: wrap; gap: 4px;">
                    <span class="tag tag-accent">${n.category}</span>
                    ${n.ticket ? `<span class="tag" style="background: var(--bg-tertiary); border: 1px solid var(--border);">${n.ticket}</span>` : ''}
                    ${n.format ? `<span class="tag" style="background: var(--bg-tertiary); border: 1px solid var(--border);">${n.format}</span>` : ''}
                  </div>
                  <div class="quote-card-actions">
                    <button class="btn btn-icon btn-ghost sm" onclick="Notes.openModal('${n.id}')">
                      ${Utils.icons.edit}
                    </button>
                    <button class="btn btn-icon btn-ghost sm" onclick="Notes.confirmDelete('${n.id}')">
                      ${Utils.icons.trash}
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="card">
            <div class="empty-state">
              <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
              <h3 class="empty-state-title">Nenhuma anotação</h3>
              <p class="empty-state-text">Você ainda não salvou nenhuma anotação ou oferta nesta categoria.</p>
              <button class="btn btn-primary" onclick="Notes.openModal()">
                ${Utils.icon('plus')} Adicionar Anotação
              </button>
            </div>
          </div>
        `}
      </div>

      <!-- Modal -->
      <div class="modal-overlay" id="note-modal">
        <div class="modal" style="max-width: 600px;">
          <div class="modal-header">
            <h3 class="modal-title" id="note-modal-title">Nova Anotação</h3>
            <button class="modal-close" onclick="Notes.closeModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="note-edit-id" value="">
            <div class="form-group">
              <label class="form-label">Título</label>
              <input type="text" class="form-input" id="note-title" placeholder="Ex: Oferta Nicho X - Ads Library">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Categoria</label>
                <select class="form-input" id="note-category">
                  ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Link do Anúncio (FB Ads Library) (Opcional)</label>
                <input type="url" class="form-input" id="note-ad-url" placeholder="https://www.facebook.com/ads/library/...">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Link do Site / Oferta (Destino) (Opcional)</label>
                <input type="url" class="form-input" id="note-url" placeholder="https://...">
              </div>
              <div class="form-group">
                <label class="form-label">Data de Observação (Opcional)</label>
                <input type="date" class="form-input" id="note-observation-date">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">URL da Imagem do Anúncio (Opcional)</label>
                <input type="url" class="form-input" id="note-image-url" placeholder="Cole o link da imagem aqui...">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Ticket (Preço)</label>
                <select class="form-input" id="note-ticket">
                  <option value="">Não classificar</option>
                  <option value="Low Ticket">Low Ticket</option>
                  <option value="Mid Ticket">Mid Ticket</option>
                  <option value="High Ticket">High Ticket</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Formato</label>
                <select class="form-input" id="note-format">
                  <option value="">Não classificar</option>
                  <option value="VSL">VSL</option>
                  <option value="Página de Vendas">Página de Vendas</option>
                  <option value="Quiz">Quiz</option>
                  <option value="X1 (WhatsApp)">X1 (WhatsApp)</option>
                  <option value="Advertorial">Advertorial</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Anotações / Copy</label>
              <textarea class="form-input" id="note-content" rows="6" placeholder="Cole aqui a copy, detalhes da oferta, ou suas ideias..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Notes.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Notes.saveFromModal()">Salvar</button>
          </div>
        </div>
      </div>
    `;
  },

  afterRender() {},

  setFilter(filter) {
    this._filter = filter;
    App.renderCurrentPage();
  },

  openModal(editId = null) {
    const modal = document.getElementById('note-modal');
    if (editId) {
      const n = Store.notes.getAll().find(n => n.id === editId);
      if (!n) return;
      document.getElementById('note-modal-title').textContent = 'Editar Anotação';
      document.getElementById('note-edit-id').value = n.id;
      document.getElementById('note-title').value = n.title;
      document.getElementById('note-category').value = n.category || 'Ofertas FB Ads';
      document.getElementById('note-ticket').value = n.ticket || '';
      document.getElementById('note-format').value = n.format || '';
      document.getElementById('note-ad-url').value = n.adUrl || '';
      document.getElementById('note-url').value = n.url || '';
      document.getElementById('note-observation-date').value = n.observationDate || '';
      document.getElementById('note-image-url').value = n.imageUrl || '';
      document.getElementById('note-content').value = n.content || '';
    } else {
      document.getElementById('note-modal-title').textContent = 'Nova Anotação';
      document.getElementById('note-edit-id').value = '';
      document.getElementById('note-title').value = '';
      document.getElementById('note-category').value = this._filter !== 'all' ? this._filter : 'Ofertas FB Ads';
      document.getElementById('note-ticket').value = '';
      document.getElementById('note-format').value = '';
      document.getElementById('note-ad-url').value = '';
      document.getElementById('note-url').value = '';
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const localToday = new Date(today.getTime() - (offset*60*1000)).toISOString().split('T')[0];
      document.getElementById('note-observation-date').value = localToday;
      document.getElementById('note-image-url').value = '';
      document.getElementById('note-content').value = '';
    }
    modal.classList.add('active');
  },

  closeModal() {
    document.getElementById('note-modal').classList.remove('active');
  },

  saveFromModal() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    
    if (!title) { Utils.toast('Digite o título', 'warning'); return; }
    if (!content) { Utils.toast('A anotação não pode estar vazia', 'warning'); return; }

    const editId = document.getElementById('note-edit-id').value;

    const data = {
      title,
      category: document.getElementById('note-category').value,
      ticket: document.getElementById('note-ticket').value,
      format: document.getElementById('note-format').value,
      adUrl: document.getElementById('note-ad-url').value.trim(),
      url: document.getElementById('note-url').value.trim(),
      observationDate: document.getElementById('note-observation-date').value,
      imageUrl: document.getElementById('note-image-url').value.trim(),
      content
    };

    if (editId) {
      data.id = editId;
    }

    Store.notes.save(data);
    this.closeModal();
    Utils.toast(editId ? 'Anotação atualizada!' : 'Anotação salva!', 'success');
    App.renderCurrentPage();
  },

  confirmDelete(id) {
    Utils.confirm('Excluir esta anotação?', () => {
      Store.notes.delete(id);
      Utils.toast('Anotação removida', 'danger');
      App.renderCurrentPage();
    });
  }
};

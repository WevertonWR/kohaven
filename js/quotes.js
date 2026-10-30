/* ============================================
   KORHAVEN — Quotes / Mural de Frases
   ============================================ */

const Quotes = {
  _filter: 'all', // all, favorites

  render() {
    const allQuotes = Store.quotes.getAll();
    const filtered = this._filter === 'favorites'
      ? allQuotes.filter(q => q.favorite)
      : allQuotes;

    return `
      <div class="animate-fadeIn">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">Mural de Frases</h1>
            <p class="page-subtitle">Inspiração para alimentar sua jornada</p>
          </div>
          <div class="page-header-right">
            <div class="tabs">
              <div class="tab-item ${this._filter === 'all' ? 'active' : ''}" onclick="Quotes.setFilter('all')">Todas</div>
              <div class="tab-item ${this._filter === 'favorites' ? 'active' : ''}" onclick="Quotes.setFilter('favorites')">⭐ Favoritas</div>
            </div>
            <button class="btn btn-primary" onclick="Quotes.openModal()">
              ${Utils.icon('plus')} Nova Frase
            </button>
          </div>
        </div>

        ${filtered.length > 0 ? `
          <div class="quotes-grid stagger">
            ${filtered.map(q => `
              <div class="quote-card">
                <p class="quote-card-text">${q.text}</p>
                ${q.author ? `<p class="quote-card-author">— ${q.author}</p>` : ''}
                <div class="quote-card-footer">
                  <div class="quote-card-tags">
                    ${(q.tags || []).map(t => `<span class="tag tag-accent">${t}</span>`).join('')}
                  </div>
                  <div class="quote-card-actions">
                    <span class="quote-fav ${q.favorite ? 'active' : ''}" onclick="Quotes.toggleFav('${q.id}')">
                      ${q.favorite ? Utils.icons.starFilled : Utils.icons.star}
                    </span>
                    <button class="btn btn-icon btn-ghost sm" onclick="Quotes.openModal('${q.id}')">
                      ${Utils.icons.edit}
                    </button>
                    <button class="btn btn-icon btn-ghost sm" onclick="Quotes.confirmDelete('${q.id}')">
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
              <img src="assets/quotes_icon.jpg" class="empty-state-img" alt="Quotes">
              <h3 class="empty-state-title">${this._filter === 'favorites' ? 'Nenhuma frase favorita' : 'Seu mural está vazio'}</h3>
              <p class="empty-state-text">Adicione citações e frases que inspiram você. Uma delas aparecerá diariamente na sua Dashboard.</p>
              <button class="btn btn-primary" onclick="Quotes.openModal()">
                ${Utils.icon('plus')} Adicionar Frase
              </button>
            </div>
          </div>
        `}
      </div>

      <!-- Modal -->
      <div class="modal-overlay" id="quote-modal">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title" id="quote-modal-title">Nova Frase</h3>
            <button class="modal-close" onclick="Quotes.closeModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="quote-edit-id" value="">
            <div class="form-group">
              <label class="form-label">Frase / Citação</label>
              <textarea class="form-input" id="quote-text" rows="3" placeholder="Digite a frase..."></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Autor (opcional)</label>
                <input type="text" class="form-input" id="quote-author" placeholder="Quem disse isso?">
              </div>
              <div class="form-group">
                <label class="form-label">Tags (separadas por vírgula)</label>
                <input type="text" class="form-input" id="quote-tags" placeholder="motivação, foco, vida">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Quotes.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Quotes.saveFromModal()">Salvar</button>
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
    const modal = document.getElementById('quote-modal');
    if (editId) {
      const q = Store.quotes.getAll().find(q => q.id === editId);
      if (!q) return;
      document.getElementById('quote-modal-title').textContent = 'Editar Frase';
      document.getElementById('quote-edit-id').value = q.id;
      document.getElementById('quote-text').value = q.text;
      document.getElementById('quote-author').value = q.author || '';
      document.getElementById('quote-tags').value = (q.tags || []).join(', ');
    } else {
      document.getElementById('quote-modal-title').textContent = 'Nova Frase';
      document.getElementById('quote-edit-id').value = '';
      document.getElementById('quote-text').value = '';
      document.getElementById('quote-author').value = '';
      document.getElementById('quote-tags').value = '';
    }
    modal.classList.add('active');
  },

  closeModal() {
    document.getElementById('quote-modal').classList.remove('active');
  },

  saveFromModal() {
    const text = document.getElementById('quote-text').value.trim();
    if (!text) { Utils.toast('Digite a frase', 'warning'); return; }

    const editId = document.getElementById('quote-edit-id').value;
    const tagsStr = document.getElementById('quote-tags').value.trim();

    const data = {
      text,
      author: document.getElementById('quote-author').value.trim(),
      tags: tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [],
      favorite: false
    };

    if (editId) {
      data.id = editId;
      const existing = Store.quotes.getAll().find(q => q.id === editId);
      if (existing) data.favorite = existing.favorite;
    }

    Store.quotes.save(data);
    this.closeModal();
    Utils.toast(editId ? 'Frase atualizada!' : 'Frase adicionada! ✨', 'success');
    App.renderCurrentPage();
  },

  toggleFav(id) {
    Store.quotes.toggleFavorite(id);
    App.renderCurrentPage();
  },

  confirmDelete(id) {
    Utils.confirm('Excluir esta frase?', () => {
      Store.quotes.delete(id);
      Utils.toast('Frase removida', 'danger');
      App.renderCurrentPage();
    });
  }
};

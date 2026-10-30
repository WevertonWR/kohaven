/* ============================================
   KORHAVEN — Evolution / Personal Growth Module
   ============================================ */

const Evolution = {
  _view: 'journal', // journal, books, mood

  render() {
    const entries = Store.journal.getAll();
    const sorted = [...entries].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return `
      <div class="animate-fadeIn">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">Evolução Pessoal</h1>
            <p class="page-subtitle">Reflexões, aprendizados e crescimento contínuo</p>
          </div>
          <div class="page-header-right">
            <div class="tabs">
              <div class="tab-item ${this._view === 'journal' ? 'active' : ''}" onclick="Evolution.setView('journal')">Diário</div>
              <div class="tab-item ${this._view === 'mood' ? 'active' : ''}" onclick="Evolution.setView('mood')">Humor</div>
              <div class="tab-item ${this._view === 'books' ? 'active' : ''}" onclick="Evolution.setView('books')">Livros</div>
            </div>
            ${this._view === 'journal' ? `
              <button class="btn btn-primary" onclick="Evolution.openModal()">
                ${Utils.icon('plus')} Nova Entrada
              </button>
            ` : ''}
          </div>
        </div>

        ${this._view === 'journal' ? this._renderJournal(sorted) : ''}
        ${this._view === 'mood' ? this._renderMoodTracker(entries) : ''}
        ${this._view === 'books' ? this._renderBooks() : ''}
      </div>
yufjhtgdbsAiojgfds
      <!-- Journal Modal -->
      <div class="modal-overlay" id="journal-modal">
        <div class="modal" style="max-width:640px;">
          <div class="modal-header">
            <h3 class="modal-title">Nova Entrada no Diário</h3>
            <button class="modal-close" onclick="Evolution.closeModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Data</label>
              <input type="date" class="form-input" id="journal-date" value="${Utils.today()}">
            </div>
            <div class="form-group">
              <label class="form-label">Como você está se sentindo?</label>
              <div class="mood-tracker" id="journal-mood">
                ${['😢', '😟', '😐', '🙂', '😊'].map((emoji, i) => `
                  <button class="mood-btn" data-mood="${i + 1}" onclick="Evolution.selectMood(this)">${emoji}</button>
                `).join('')}
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Energia (1-5)</label>
                <input type="range" id="journal-energy" min="1" max="5" value="3" style="width:100%;">
              </div>
              <div class="form-group">
                <label class="form-label">Estresse (1-5)</label>
                <input type="range" id="journal-stress" min="1" max="5" value="3" style="width:100%;">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Gratidão</label>
              <textarea class="form-input" id="journal-gratitude" rows="2" placeholder="Pelo que você é grato hoje?"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Reflexões & Aprendizados</label>
              <textarea class="form-input" id="journal-text" rows="4" placeholder="Escreva livremente..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Evolution.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Evolution.saveJournal()">Salvar</button>
          </div>
        </div>
      </div>

      <!-- Book Modal -->
      <div class="modal-overlay" id="book-modal">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Adicionar Novo Livro</h3>
            <button class="modal-close" onclick="Evolution.closeBookModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Título do Livro *</label>
              <input type="text" class="form-input" id="book-title" placeholder="Ex: Hábitos Atômicos">
            </div>
            <div class="form-group">
              <label class="form-label">Autor (opcional)</label>
              <input type="text" class="form-input" id="book-author" placeholder="Ex: James Clear">
            </div>
            <div class="form-group">
              <label class="form-label">Total de Páginas (opcional)</label>
              <input type="number" class="form-input" id="book-total-pages" placeholder="Ex: 320" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">Status da Leitura</label>
              <select class="form-input" id="book-status">
                <option value="reading">📖 Lendo (Em andamento)</option>
                <option value="done">✅ Concluído (Lido)</option>
              </select>
            </div>
            <div class="form-group" style="display:none;">
              <label class="form-label">Anotações / Resumo (opcional)</label>
              <textarea class="form-input" id="book-notes" rows="4" placeholder="Suas principais lições e insights..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Evolution.closeBookModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Evolution.saveBook()">Salvar Livro</button>
          </div>
        </div>
      </div>

      <!-- Reading Session Modal -->
      <div class="modal-overlay" id="reading-session-modal">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Registrar Leitura</h3>
            <button class="modal-close" onclick="Evolution.closeReadingSessionModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="reading-session-book-id">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Data</label>
                <input type="date" class="form-input" id="reading-session-date" value="${Utils.today()}">
              </div>
              <div class="form-group">
                <label class="form-label">Páginas Lidas Hoje *</label>
                <input type="number" class="form-input" id="reading-session-pages" placeholder="Ex: 15" min="1">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Anotações / Reflexões</label>
              <textarea class="form-input" id="reading-session-notes" rows="4" placeholder="O que você aprendeu com a leitura de hoje?"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Evolution.closeReadingSessionModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Evolution.saveReadingSession()">Salvar Sessão</button>
          </div>
        </div>
      </div>
    `;
  },

  afterRender() {
    if (this._view === 'mood') {
      this._renderMoodChart();
    }
  },

  _renderJournal(entries) {
    if (entries.length === 0) {
      return `
        <div class="card">
          <div class="empty-state">
            <img src="assets/journal_icon.jpg" class="empty-state-img" alt="Journal">
            <h3 class="empty-state-title">Seu diário está vazio</h3>
            <p class="empty-state-text">Comece a registrar reflexões, gratidão e aprendizados diários.</p>
            <button class="btn btn-primary" onclick="Evolution.openModal()">
              ${Utils.icon('plus')} Primeira Entrada
            </button>
          </div>
        </div>
      `;
    }

    const moods = ['', '😢', '😟', '😐', '🙂', '😊'];

    return `
      <div class="stagger">
        ${entries.map(e => `
          <div class="journal-entry card-degrade-escuro">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div class="journal-entry-date">
                📅 ${Utils.formatDate(e.date || e.createdAt, 'long')}
                ${e.mood ? ` • ${moods[e.mood]}` : ''}
              </div>
              <button class="btn btn-icon btn-ghost sm" onclick="Evolution.deleteEntry('${e.id}')">
                ${Utils.icons.trash}
              </button>
            </div>
            ${e.gratitude ? `
              <div class="card-degrade-azul" style="margin-bottom:var(--space-3);padding:var(--space-3);border-radius:var(--radius-md);">
                <span style="font-size:var(--font-xs);color:#ffffff;font-weight:var(--fw-semibold);text-transform:uppercase;letter-spacing:var(--ls-wider);">Gratidão</span>
                <p style="font-size:var(--font-sm);color:var(--text-secondary);margin-top:4px;">${e.gratitude}</p>
              </div>
            ` : ''}
            <div class="journal-entry-text">${e.text || ''}</div>
            ${e.energy || e.stress ? `
              <div style="display:flex;gap:var(--space-4);margin-top:var(--space-3);">
                ${e.energy ? `<span class="badge badge-ghost">⚡ Energia: ${e.energy}/5</span>` : ''}
                ${e.stress ? `<span class="badge badge-ghost">😤 Estresse: ${e.stress}/5</span>` : ''}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  },

  _renderMoodTracker(entries) {
    return `
      <div class="card card-degrade-azul" style="margin-bottom:var(--space-8);">
        <div class="card-header">
          <h3 class="card-title">Humor ao Longo do Tempo</h3>
        </div>
        <div class="chart-container lg">
          <canvas id="mood-chart"></canvas>
        </div>
      </div>
    `;
  },

  _renderBooks() {
    const books = JSON.parse(localStorage.getItem('korhaven_books') || '[]');

    return `
      <div class="digital-book-container animate-scaleIn">
        
        <!-- Left Page: List of Books -->
        <div class="digital-book-page left-page">
          <div class="page-header" style="margin-bottom: var(--space-4);">
            <h3 class="card-title">Sua Biblioteca</h3>
            <button class="btn btn-sm btn-primary" onclick="Evolution.addBook()">
              ${Utils.icon('plus')} Novo
            </button>
          </div>
          
          <div class="book-list-scroll">
            ${books.length > 0 ? books.map(b => `
              <div class="book-list-item" id="book-item-${b.id}" onclick="Evolution.viewBook('${b.id}')">
                <div class="book-list-icon">📚</div>
                <div class="book-list-info">
                  <div class="book-list-title">${b.title}</div>
                  <div class="book-list-author">${b.author || 'Autor desconhecido'}</div>
                </div>
                <div class="badge ${b.status === 'done' ? 'badge-success' : 'badge-accent'}">${b.status === 'done' ? 'Lido' : 'Lendo'}</div>
              </div>
            `).join('') : `
              <div class="empty-state" style="padding-top:var(--space-8);">
                <img src="assets/books_icon.jpg" class="empty-state-img" alt="Books" style="width:80px;height:80px;">
                <h3 class="empty-state-title">Biblioteca Vazia</h3>
                <p class="empty-state-text">Adicione seus livros para construir seu acervo.</p>
              </div>
            `}
          </div>
        </div>
        
        <!-- Spine (Hinge) -->
        <div class="digital-book-spine">
          <div class="spine-glow"></div>
        </div>

        <!-- Right Page: Details / Empty -->
        <div class="digital-book-page right-page" id="book-details-pane">
           <div class="empty-state" style="padding-top:var(--space-12);">
             <div class="empty-state-icon" style="color:var(--text-dim);"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
             <h3 class="empty-state-title">Selecione um livro</h3>
             <p class="empty-state-text">Clique em um livro na página esquerda para ver os detalhes e anotações.</p>
           </div>
        </div>
      </div>
    `;
  },

  viewBook(id) {
    const books = JSON.parse(localStorage.getItem('korhaven_books') || '[]');
    const book = books.find(b => b.id === id);
    if (!book) return;
    if (!book.sessions) book.sessions = [];

    const totalPagesRead = book.sessions.reduce((sum, s) => sum + (s.pages || 0), 0) + (book.pagesRead || 0);

    const pane = document.getElementById('book-details-pane');
    if (!pane) return;

    pane.innerHTML = `
      <div class="book-details-content animate-fadeIn" style="display:flex;flex-direction:column;height:100%;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <h2 style="font-size:var(--font-xl);font-weight:var(--fw-bold);color:var(--text-primary);">${book.title}</h2>
            <p style="font-size:var(--font-md);color:var(--accent);margin-top:4px;">${book.author || 'Autor desconhecido'}</p>
          </div>
          <div style="display:flex; gap:var(--space-2);">
            <button class="btn btn-icon btn-ghost sm" onclick="Evolution.openBookModal('${book.id}')" title="Editar Informações">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button class="btn btn-icon btn-ghost sm" onclick="Evolution.deleteBook('${book.id}')" title="Excluir">
              ${Utils.icons.trash}
            </button>
          </div>
        </div>
        
        <div style="margin-top:var(--space-6);">
          <div style="font-size:var(--font-sm);color:var(--text-muted);text-transform:uppercase;letter-spacing:var(--ls-wide);margin-bottom:var(--space-2);">Progresso de Leitura</div>
          <div style="display:flex; align-items:center; gap:var(--space-4); margin-bottom:var(--space-3);">
            <div class="progress-bar" style="flex:1;">
              <div class="progress-bar-fill" style="width: ${book.totalPages ? Math.min(100, Math.round((totalPagesRead / book.totalPages) * 100)) : (book.status === 'done' ? 100 : 0)}%;"></div>
            </div>
            <div style="font-weight:var(--fw-bold); color:var(--text-primary);">
              ${book.totalPages ? `${Math.min(100, Math.round((totalPagesRead / book.totalPages) * 100))}%` : (book.status === 'done' ? '100%' : '0%')}
            </div>
          </div>
          ${book.totalPages ? `
            <div style="color:var(--text-muted); font-size:var(--font-sm);">
              ${totalPagesRead} de ${book.totalPages} páginas lidas
            </div>
          ` : ''}
        </div>
        
        <div style="margin-top:var(--space-6); flex:1; display:flex; flex-direction:column; overflow:hidden;">
          <div style="font-size:var(--font-sm);color:var(--text-muted);text-transform:uppercase;letter-spacing:var(--ls-wide);margin-bottom:var(--space-4); display:flex; justify-content:space-between; align-items:center;">
            <span>Diário de Leitura</span>
            <button class="btn btn-primary btn-sm" onclick="Evolution.openReadingSessionModal('${book.id}')">
              + Registrar Leitura
            </button>
          </div>
          
          <!-- Timeline of Sessions -->
          <div style="flex:1; overflow-y:auto; padding-right:var(--space-2); display:flex; flex-direction:column; gap:var(--space-4);" class="custom-scrollbar">
            ${book.notes && book.sessions.length === 0 ? `
              <!-- Legacy Notes -->
              <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:var(--space-4); border-radius:var(--radius-md);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-2);">
                  <span style="font-size:var(--font-sm); color:var(--accent); font-weight:var(--fw-medium);">Anotações Antigas</span>
                </div>
                <p style="color:var(--text-secondary); line-height:1.6; font-size:var(--font-md); white-space:pre-wrap;">${book.notes}</p>
              </div>
            ` : ''}
            
            ${book.sessions.length > 0 ? [...book.sessions].reverse().map(s => `
              <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:var(--space-4); border-radius:var(--radius-md);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-2);">
                  <span style="font-size:var(--font-sm); color:var(--accent); font-weight:var(--fw-medium);">${Utils.formatDate(s.date)}</span>
                  <div style="display:flex; gap:var(--space-2);">
                    <span class="badge badge-ghost">${s.pages} páginas</span>
                    <button class="btn btn-icon btn-ghost sm" style="padding:0;width:24px;height:24px;color:var(--danger);" onclick="Evolution.deleteReadingSession('${book.id}', '${s.id}')" title="Excluir">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
                ${s.notes ? `<p style="color:var(--text-secondary); line-height:1.6; font-size:var(--font-md); white-space:pre-wrap;">${s.notes}</p>` : '<p style="color:var(--text-dim); font-size:var(--font-sm); font-style:italic;">Sem anotações.</p>'}
              </div>
            `).join('') : (!book.notes ? `
              <div class="empty-state" style="padding-top:var(--space-4);">
                <p class="empty-state-text">Nenhum registro de leitura ainda.</p>
              </div>
            ` : '')}
          </div>
        </div>
        
        <div style="margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid var(--border);display:flex;align-items:center;gap:var(--space-2);">
          <span class="badge ${book.status === 'done' ? 'badge-success' : 'badge-accent'}">
            Status: ${book.status === 'done' ? 'Concluído' : 'Lendo'}
          </span>
          ${book.status !== 'done' ? `<button class="btn btn-ghost btn-sm" onclick="Evolution.markBookDone('${book.id}')" style="margin-left:auto;">✔ Marcar como Lido</button>` : `<button class="btn btn-ghost btn-sm" onclick="Evolution.markBookReading('${book.id}')" style="margin-left:auto;">Marcar como Lendo</button>`}
        </div>
      </div>
    `;

    document.querySelectorAll('.book-list-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`book-item-${id}`).classList.add('active');
  },

  setView(view) {
    this._view = view;
    App.renderCurrentPage();
  },

  openModal() {
    document.getElementById('journal-modal').classList.add('active');
  },

  closeModal() {
    document.getElementById('journal-modal').classList.remove('active');
  },

  selectMood(btn) {
    document.querySelectorAll('#journal-mood .mood-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  },

  saveJournal() {
    const text = document.getElementById('journal-text').value.trim();
    const gratitude = document.getElementById('journal-gratitude').value.trim();
    if (!text && !gratitude) { Utils.toast('Escreva algo no diário', 'warning'); return; }

    const selectedMood = document.querySelector('#journal-mood .mood-btn.selected');

    Store.journal.save({
      date: document.getElementById('journal-date').value,
      text,
      gratitude,
      mood: selectedMood ? parseInt(selectedMood.dataset.mood) : null,
      energy: parseInt(document.getElementById('journal-energy').value),
      stress: parseInt(document.getElementById('journal-stress').value)
    });

    this.closeModal();
    Utils.toast('Entrada salva! 📖', 'success');
    App.renderCurrentPage();
  },

  deleteEntry(id) {
    Utils.confirm('Excluir esta entrada?', () => {
      Store.journal.delete(id);
      Utils.toast('Entrada removida', 'danger');
      App.renderCurrentPage();
    });
  },

  _editingBookId: null,

  addBook() {
    this.openBookModal();
  },

  openBookModal(id = null) {
    this._editingBookId = id;
    if (id) {
      const books = JSON.parse(localStorage.getItem('korhaven_books') || '[]');
      const book = books.find(b => b.id === id);
      if (book) {
        document.getElementById('book-title').value = book.title;
        document.getElementById('book-author').value = book.author || '';
        document.getElementById('book-total-pages').value = book.totalPages || '';
        document.getElementById('book-status').value = book.status;
        document.querySelector('#book-modal .modal-title').textContent = 'Editar Livro';
      }
    } else {
      document.getElementById('book-title').value = '';
      document.getElementById('book-author').value = '';
      document.getElementById('book-total-pages').value = '';
      document.getElementById('book-status').value = 'reading';
      document.querySelector('#book-modal .modal-title').textContent = 'Adicionar Novo Livro';
    }
    document.getElementById('book-modal').classList.add('active');
  },

  closeBookModal() {
    document.getElementById('book-modal').classList.remove('active');
    this._editingBookId = null;
  },

  saveBook() {
    try {
      const titleEl = document.getElementById('book-title');
      if (!titleEl) { Utils.toast('Erro: campo de título não encontrado', 'danger'); return; }

      const title = titleEl.value.trim();
      if (!title) { Utils.toast('Preencha o título do livro', 'warning'); return; }

      const author = document.getElementById('book-author').value.trim();
      const status = document.getElementById('book-status').value;
      const totalPages = parseInt(document.getElementById('book-total-pages').value) || null;

      let books = [];
      try {
        books = JSON.parse(localStorage.getItem('korhaven_books') || '[]');
      } catch (e) {
        books = [];
      }

      if (Evolution._editingBookId) {
        const book = books.find(b => b.id === Evolution._editingBookId);
        if (book) {
          book.title = title;
          book.author = author;
          book.status = status;
          book.totalPages = totalPages;
        }
        Utils.toast('Livro atualizado! 📖', 'success');
      } else {
        books.push({
          id: Date.now().toString(36) + Math.random().toString(36).substring(2),
          title,
          author,
          status,
          totalPages,
          sessions: [],
          pagesRead: 0,
          createdAt: new Date().toISOString()
        });
        Utils.toast('Livro adicionado! 📚', 'success');
      }

      localStorage.setItem('korhaven_books', JSON.stringify(books));

      Evolution.closeBookModal();
      App.renderCurrentPage();
      if (Evolution._editingBookId) {
        const editId = Evolution._editingBookId;
        setTimeout(() => Evolution.viewBook(editId), 10);
      }
    } catch (err) {
      console.error(err);
      Utils.toast('Erro ao salvar: ' + err.message, 'danger');
    }
  },

  openReadingSessionModal(bookId) {
    document.getElementById('reading-session-book-id').value = bookId;
    document.getElementById('reading-session-date').value = Utils.today();
    document.getElementById('reading-session-pages').value = '';
    document.getElementById('reading-session-notes').value = '';
    document.getElementById('reading-session-modal').classList.add('active');
  },

  closeReadingSessionModal() {
    document.getElementById('reading-session-modal').classList.remove('active');
  },

  saveReadingSession() {
    const bookId = document.getElementById('reading-session-book-id').value;
    const date = document.getElementById('reading-session-date').value;
    const pages = parseInt(document.getElementById('reading-session-pages').value);
    const notes = document.getElementById('reading-session-notes').value.trim();

    if (isNaN(pages) || pages <= 0) {
      Utils.toast('Informe a quantidade de páginas lidas hoje.', 'warning');
      return;
    }

    const books = JSON.parse(localStorage.getItem('korhaven_books') || '[]');
    const book = books.find(b => b.id === bookId);

    if (book) {
      if (!book.sessions) book.sessions = [];
      book.sessions.push({
        id: Date.now().toString(36),
        date,
        pages,
        notes
      });

      // Auto complete if total pages exceeded
      const totalPagesRead = book.sessions.reduce((sum, s) => sum + (s.pages || 0), 0) + (book.pagesRead || 0);
      if (book.totalPages && totalPagesRead >= book.totalPages) {
        book.status = 'done';
        Utils.toast('Parabéns! Você concluiu este livro! 🎉', 'success');
      } else {
        Utils.toast('Sessão de leitura registrada! 📖', 'success');
      }

      localStorage.setItem('korhaven_books', JSON.stringify(books));
    }

    this.closeReadingSessionModal();
    App.renderCurrentPage();
    setTimeout(() => this.viewBook(bookId), 0);
  },

  deleteReadingSession(bookId, sessionId) {
    Utils.confirm('Excluir este registro de leitura?', () => {
      const books = JSON.parse(localStorage.getItem('korhaven_books') || '[]');
      const book = books.find(b => b.id === bookId);
      if (book && book.sessions) {
        book.sessions = book.sessions.filter(s => s.id !== sessionId);
        localStorage.setItem('korhaven_books', JSON.stringify(books));
        Utils.toast('Registro excluído', 'danger');
        App.renderCurrentPage();
        setTimeout(() => this.viewBook(bookId), 0);
      }
    });
  },

  deleteBook(id) {
    Utils.confirm('Excluir este livro?', () => {
      const books = JSON.parse(localStorage.getItem('korhaven_books') || '[]').filter(b => b.id !== id);
      localStorage.setItem('korhaven_books', JSON.stringify(books));
      Utils.toast('Livro removido', 'danger');
      App.renderCurrentPage();
    });
  },

  updateBookProgress(id) {
    const input = document.getElementById(`book-progress-input-${id}`);
    if (!input) return;
    const pages = parseInt(input.value) || 0;
    const books = JSON.parse(localStorage.getItem('korhaven_books') || '[]');
    const book = books.find(b => b.id === id);
    if (book) {
      book.pagesRead = Math.min(pages, book.totalPages || pages);
      if (book.pagesRead === book.totalPages && book.totalPages > 0) {
        book.status = 'done';
      }
      localStorage.setItem('korhaven_books', JSON.stringify(books));
      Utils.toast('Progresso atualizado!', 'success');
      App.renderCurrentPage();
      setTimeout(() => this.viewBook(id), 0);
    }
  },

  saveBookNotes(id) {
    const textarea = document.getElementById(`book-notes-input-${id}`);
    if (!textarea) return;
    const books = JSON.parse(localStorage.getItem('korhaven_books') || '[]');
    const book = books.find(b => b.id === id);
    if (book) {
      book.notes = textarea.value;
      localStorage.setItem('korhaven_books', JSON.stringify(books));
      Utils.toast('Anotações salvas!', 'success');
    }
  },

  markBookDone(id) {
    const books = JSON.parse(localStorage.getItem('korhaven_books') || '[]');
    const book = books.find(b => b.id === id);
    if (book) {
      book.status = 'done';
      if (book.totalPages) book.pagesRead = book.totalPages;
      localStorage.setItem('korhaven_books', JSON.stringify(books));
      Utils.toast('Livro concluído! 🎉', 'success');
      App.renderCurrentPage();
      setTimeout(() => this.viewBook(id), 0);
    }
  },

  markBookReading(id) {
    const books = JSON.parse(localStorage.getItem('korhaven_books') || '[]');
    const book = books.find(b => b.id === id);
    if (book) {
      book.status = 'reading';
      localStorage.setItem('korhaven_books', JSON.stringify(books));
      Utils.toast('Status atualizado!', 'info');
      App.renderCurrentPage();
      setTimeout(() => this.viewBook(id), 0);
    }
  },

  _renderMoodChart() {
    const canvas = document.getElementById('mood-chart');
    if (!canvas) return;

    const moodData = Store.journal.getMoodHistory().slice(-30);

    if (moodData.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('Sem dados de humor. Registre entradas no diário!', canvas.width / 2, canvas.height / 2);
      return;
    }

    if (window._moodChart) window._moodChart.destroy();
    window._moodChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: moodData.map(m => Utils.formatDate(m.date)),
        datasets: [
          {
            label: 'Humor',
            data: moodData.map(m => Number(m.mood) || 3),
            borderColor: '#00B4D8',
            backgroundColor: (context) => {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
              gradient.addColorStop(0, 'rgba(0, 180, 216, 0.4)');
              gradient.addColorStop(1, 'rgba(0, 180, 216, 0.0)');
              return gradient;
            },
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            spanGaps: true,
            order: 3,
            pointRadius: 6,
            pointBackgroundColor: '#03045E',
            pointBorderColor: '#00B4D8',
            pointBorderWidth: 3,
            pointHoverRadius: 8
          },
          {
            label: 'Energia',
            data: moodData.map(m => Number(m.energy) || 3),
            borderColor: '#48CAE4',
            backgroundColor: 'transparent',
            borderWidth: 3,
            tension: 0.4,
            spanGaps: true,
            borderDash: [5, 5],
            order: 1,
            pointRadius: 6,
            pointBackgroundColor: '#03045E',
            pointBorderColor: '#48CAE4',
            pointBorderWidth: 3,
            pointHoverRadius: 8
          },
          {
            label: 'Estresse',
            data: moodData.map(m => Number(m.stress) || 3),
            borderColor: '#90E0EF',
            backgroundColor: 'transparent',
            borderWidth: 3,
            tension: 0.4,
            spanGaps: true,
            order: 2,
            pointRadius: 5,
            pointBackgroundColor: '#03045E',
            pointBorderColor: '#90E0EF',
            pointBorderWidth: 2,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#90E0EF', font: { family: 'Inter', size: 12 }, usePointStyle: true, padding: 20 }
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
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}/5`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: 'rgba(255, 255, 255, 0.9)', font: { family: 'Inter', size: 11 }, maxRotation: 45 }
          },
          y: {
            min: 0, max: 5,
            grid: { color: 'rgba(144, 224, 239, 0.05)', borderDash: [5, 5] },
            ticks: {
              color: 'rgba(255, 255, 255, 0.9)',
              font: { family: 'Inter', size: 11 },
              stepSize: 1,
              padding: 10
            },
            border: { display: false }
          }
        }
      }
    });
  }
};

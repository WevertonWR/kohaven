/* ============================================
   KORHAVEN — Media / Watchlist Module
   ============================================ */

const Media = {
  currentFilter: 'to_watch', // 'to_watch', 'watching', 'finished'

  render() {
    return `
      <div class="module-header">
        <div>
          <h2 class="module-title">Mídias</h2>
          <p class="module-subtitle">Sua biblioteca de vídeos, artigos e conteúdos para estudar ou consumir depois.</p>
        </div>
        <button class="btn btn-primary" onclick="Media.openModal()">
          ${Utils.icons.plus} Adicionar Mídia
        </button>
      </div>

      <!-- Filters -->
      <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-6); border-bottom: 1px solid var(--border); padding-bottom: var(--space-4); overflow-x: auto; align-items: center;">
        ${Store.media.getCategories().map(c => `
          <button class="btn ${this.currentFilter === c.id ? 'btn-primary' : 'btn-secondary'}" onclick="Media.setFilter('${c.id}')">${c.label}</button>
        `).join('')}
        <button class="btn btn-secondary" style="height: 36px; flex-shrink: 0; margin-left: auto;" onclick="Media.openCategoryManager()">
          ⚙️ Gerenciar Categorias
        </button>
      </div>

      <div id="media-list-container">
        <!-- Rendered via JS -->
      </div>

      <!-- Category Manager Modal -->
      <div class="modal-overlay" id="category-modal">
        <div class="modal" style="max-width: 800px; width: 95%;">
          <div class="modal-header">
            <h3 class="modal-title">Central de Gerenciamento de Mídias</h3>
            <button class="modal-close" onclick="Media.closeCategoryManager()">
              ${Utils.icons.x}
            </button>
          </div>
          <div class="modal-body" style="padding-top: 0;">
            <div style="display: flex; gap: var(--space-2); margin: var(--space-4) 0; position: sticky; top: 0; background: var(--surface); z-index: 10; padding: 10px 0;">
              <input type="text" id="new-category-name" class="form-input" placeholder="Criar nova categoria..." style="flex: 1;">
              <button class="btn btn-primary" onclick="Media.addCategoryFromManager()">Adicionar Pasta</button>
            </div>
            <div id="category-list-container" style="display: flex; flex-direction: column; gap: var(--space-3); max-height: 60vh; overflow-y: auto; padding-right: 4px;">
              <!-- Rendered via JS -->
            </div>
          </div>
        </div>
      </div>

      <!-- Media Modal (comes after so it can overlay Category Modal if needed) -->
      <div class="modal-overlay" id="media-modal" style="z-index: 9999;">
        <div class="modal" style="max-width: 500px;">
          <div class="modal-header">
            <h3 class="modal-title" id="media-modal-title">Nova Mídia</h3>
            <button class="modal-close" onclick="Media.closeModal()">
              ${Utils.icons.x}
            </button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="media-id">
            
            <div class="form-group">
              <label class="form-label">Título</label>
              <input type="text" id="media-title" class="form-input" placeholder="Ex: Tutorial de JavaScript">
            </div>

            <div class="form-group">
              <label class="form-label">Link (URL)</label>
              <input type="url" id="media-link" class="form-input" placeholder="https://youtube.com/...">
            </div>

            <div class="form-group">
              <label class="form-label">Tipo</label>
              <select id="media-type" class="form-input" style="width: 100%;">
                <option value="video">Vídeo</option>
                <option value="article">Artigo</option>
                <option value="course">Curso</option>
                <option value="book">Livro</option>
                <option value="podcast">Podcast</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="media-status" class="form-input" style="width: 100%;">
                ${Store.media.getCategories().map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Anotações / Notas (opcional)</label>
              <textarea id="media-notes" class="form-input" rows="3" placeholder="Por que quer ver isso? O que aprendeu?"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Media.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Media.saveMedia()">Salvar Mídia</button>
          </div>
        </div>
      </div>
    `;
  },

  afterRender() {
    this.renderList();
  },

  setFilter(filter) {
    this.currentFilter = filter;
    App.renderCurrentPage(); // Re-render to update active button class
  },

  renderList() {
    const container = document.getElementById('media-list-container');
    if (!container) return;

    let allMedia = Store.media.getAll();
    allMedia = allMedia.filter(m => m.status === this.currentFilter);
    allMedia.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest first

    if (allMedia.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="margin-top: var(--space-8);">
          <div style="font-size: 3rem; margin-bottom: var(--space-4); opacity: 0.5;">📺</div>
          <h3 class="empty-state-title">Nenhuma mídia encontrada</h3>
          <p class="empty-state-text">Você ainda não tem itens nesta lista. Adicione um novo link para começar!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-4);">
        ${allMedia.map(m => this.createMediaCard(m)).join('')}
      </div>
    `;
  },

  createMediaCard(item) {
    const typeIcons = {
      video: '▶️',
      article: '📄',
      course: '🎓',
      book: '📖',
      podcast: '🎧',
      other: '📌'
    };

    const typeLabels = {
      video: 'Vídeo',
      article: 'Artigo',
      course: 'Curso',
      book: 'Livro',
      podcast: 'Podcast',
      other: 'Outro'
    };

    const dateStr = Utils.formatDate(item.createdAt);
    
    // Extracted hostname for link preview
    let hostname = '';
    let ytVideoId = null;
    try {
      if (item.link) {
        const urlObj = new URL(item.link);
        hostname = urlObj.hostname.replace('www.', '');
        
        if (hostname.includes('youtube.com')) {
          ytVideoId = urlObj.searchParams.get('v');
          if (!ytVideoId && urlObj.pathname.startsWith('/shorts/')) {
            ytVideoId = urlObj.pathname.split('/')[2];
          }
        } else if (hostname.includes('youtu.be')) {
          ytVideoId = urlObj.pathname.slice(1);
        }
      }
    } catch(e) {}

    const isYoutube = !!ytVideoId || hostname.includes('youtube.com') || hostname.includes('youtu.be');
    
    return `
      <div class="card" style="display: flex; flex-direction: column; gap: var(--space-3); transition: transform 0.2s, box-shadow 0.2s;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="display: flex; gap: var(--space-2); align-items: center;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--surface-hover); display: flex; align-items: center; justify-content: center; font-size: 14px;">
              ${typeIcons[item.type] || '📌'}
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">
                ${typeLabels[item.type] || 'Outro'}
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">${dateStr}</div>
            </div>
          </div>
          
          <!-- Context menu -->
          <div style="position: relative;">
            <button class="btn btn-secondary" style="padding: var(--space-1); border: none; background: transparent;" onclick="Media.deleteMedia('${item.id}')" title="Excluir">
              ${Utils.icons.trash}
            </button>
            <button class="btn btn-secondary" style="padding: var(--space-1); border: none; background: transparent;" onclick="Media.editMedia('${item.id}')" title="Editar">
              ${Utils.icons.edit}
            </button>
          </div>
        </div>

        ${ytVideoId ? `
          <a href="${item.link}" target="_blank" style="display: block; margin-top: var(--space-3); border-radius: var(--radius-md); overflow: hidden; position: relative; border: 1px solid var(--border);">
            <img src="https://img.youtube.com/vi/${ytVideoId}/mqdefault.jpg" alt="Thumbnail" style="width: 100%; height: auto; display: block; object-fit: cover; aspect-ratio: 16/9;">
            <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
              <svg viewBox="0 0 68 48" width="60" height="42" style="filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));">
                <path d="M66.5 7.7c-.8-2.9-2.5-5.4-5.4-6.2C55.8 0 34 0 34 0S12.2 0 6.9 1.5C4 2.3 2.3 4.8 1.5 7.7 0 13.1 0 24 0 24s0 10.9 1.5 16.3c.8 2.9 2.5 5.4 5.4 6.2C12.2 48 34 48 34 48s21.8 0 27.1-1.5c2.9-.8 4.6-3.3 5.4-6.2C68 34.9 68 24 68 24s0-10.9-1.5-16.3z" fill="#FF0000"/>
                <path d="M27 34L45 24 27 14z" fill="#FFFFFF"/>
              </svg>
            </div>
          </a>
        ` : ''}

        <h3 style="font-size: 1rem; font-weight: 600; line-height: 1.4; color: var(--text-primary); margin-top: var(--space-2); word-break: break-word;">
          ${item.title || 'Sem Título'}
        </h3>
        
        ${item.notes ? `<p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; flex-grow: 1;">${item.notes}</p>` : '<div style="flex-grow: 1;"></div>'}

        ${item.link ? `
          <a href="${item.link}" target="_blank" style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: ${isYoutube ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-hover)'}; color: ${isYoutube ? '#ef4444' : 'var(--accent)'}; border-radius: var(--radius-md); text-decoration: none; font-size: 0.85rem; font-weight: 500; transition: background 0.2s; margin-top: auto; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            ${isYoutube ? 'Abrir no YouTube' : (hostname || 'Acessar Link')}
          </a>
        ` : ''}

        <!-- Status Actions -->
        <div style="display: flex; gap: var(--space-2); align-items: center; margin-top: var(--space-2); border-top: 1px solid var(--border); padding-top: var(--space-3);">
          <span style="font-size: 0.75rem; color: var(--text-secondary);">Mover para:</span>
          <select class="form-input" style="flex: 1; padding: var(--space-1); font-size: 0.8rem; height: auto;" onchange="Media.changeStatus('${item.id}', this.value)">
            ${Store.media.getCategories().map(c => `
              <option value="${c.id}" ${item.status === c.id ? 'selected disabled' : ''}>${c.label}</option>
            `).join('')}
          </select>
        </div>
      </div>
    `;
  },

  openModal() {
    const modal = document.getElementById('media-modal');
    if (!modal) return;
    
    document.getElementById('media-modal-title').textContent = 'Nova Mídia';
    document.getElementById('media-id').value = '';
    document.getElementById('media-title').value = '';
    document.getElementById('media-link').value = '';
    document.getElementById('media-type').value = 'video';
    document.getElementById('media-status').value = this.currentFilter;
    document.getElementById('media-notes').value = '';
    
    modal.classList.add('active');
  },

  editMedia(id) {
    const item = Store.media.getAll().find(m => m.id === id);
    if (!item) return;

    const modal = document.getElementById('media-modal');
    if (!modal) return;
    
    document.getElementById('media-modal-title').textContent = 'Editar Mídia';
    document.getElementById('media-id').value = item.id;
    document.getElementById('media-title').value = item.title || '';
    document.getElementById('media-link').value = item.link || '';
    document.getElementById('media-type').value = item.type || 'video';
    document.getElementById('media-status').value = item.status || 'to_watch';
    document.getElementById('media-notes').value = item.notes || '';
    
    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('media-modal');
    if (modal) modal.classList.remove('active');
  },

  saveMedia() {
    const titleInput = document.getElementById('media-title').value.trim();
    if (!titleInput) {
      Utils.toast('Informe um título', 'error');
      return;
    }

    const item = {
      id: document.getElementById('media-id').value,
      title: titleInput,
      link: document.getElementById('media-link').value.trim(),
      type: document.getElementById('media-type').value,
      status: document.getElementById('media-status').value,
      notes: document.getElementById('media-notes').value.trim()
    };

    Store.media.save(item);
    this.closeModal();
    this.renderList();
    
    // Se o modal do gerenciador também estiver aberto, atualiza-o
    if (document.getElementById('category-modal')?.classList.contains('active')) {
      this.renderCategoryManagerList();
    }
    
    Utils.toast('Mídia salva!', 'success');
  },

  deleteMedia(id) {
    Utils.confirm('Tem certeza que deseja remover esta mídia?', () => {
      Store.media.delete(id);
      this.renderList();
      Utils.toast('Mídia removida', 'success');
    });
  },

  changeStatus(id, newStatus) {
    Store.media.toggleStatus(id, newStatus);
    this.renderList();
  },

  openCategoryManager() {
    const modal = document.getElementById('category-modal');
    if (modal) {
      modal.classList.add('active');
      this.renderCategoryManagerList();
    }
  },

  closeCategoryManager() {
    const modal = document.getElementById('category-modal');
    if (modal) modal.classList.remove('active');
    App.renderCurrentPage(); // Re-render tabs
  },

  toggleCategory(id) {
    if (!this.expandedCategories) this.expandedCategories = {};
    this.expandedCategories[id] = !this.expandedCategories[id];
    this.renderCategoryManagerList();
  },

  renderCategoryManagerList() {
    const container = document.getElementById('category-list-container');
    if (!container) return;
    
    if (!this.expandedCategories) this.expandedCategories = {};
    const categories = Store.media.getCategories();
    const allMedia = Store.media.getAll();
    
    container.innerHTML = categories.map(c => {
      const isExpanded = this.expandedCategories[c.id];
      const items = allMedia.filter(m => m.status === c.id);
      
      const itemsHTML = items.map(m => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-2); margin-top: 4px; background: var(--surface-bg); border: 1px solid var(--border); border-radius: var(--radius-md);">
          <div style="font-size: 0.85rem; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 40%;" title="${m.title.replace(/"/g, '&quot;')}">
            ${m.title || 'Sem título'}
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0;">
            <select class="form-input" style="padding: 2px 4px; font-size: 0.75rem; height: auto;" onchange="Media.changeStatusFromManager('${m.id}', this.value)">
              ${categories.map(cat => `<option value="${cat.id}" ${cat.id === c.id ? 'selected disabled' : ''}>Mover para: ${cat.label}</option>`).join('')}
            </select>
            <button class="btn btn-secondary" style="padding: 4px; border: none; background: transparent;" onclick="Media.editMediaManager('${m.id}')" title="Editar Mídia">
              ${Utils.icons.edit}
            </button>
            <button class="btn btn-secondary" style="padding: 4px; border: none; background: transparent; color: #ef4444;" onclick="Media.deleteMediaManager('${m.id}')" title="Excluir Mídia">
              ${Utils.icons.trash}
            </button>
          </div>
        </div>
      `).join('');

      return `
        <div style="display: flex; flex-direction: column; background: var(--surface-hover); border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border);">
          <!-- Header (Category) -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); cursor: pointer;" onclick="Media.toggleCategory('${c.id}')">
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <span style="display: inline-block; transition: transform 0.2s; transform: rotate(${isExpanded ? '90deg' : '0deg'}); font-size: 10px; opacity: 0.5;">▶</span>
              <span style="font-weight: 600; color: var(--text-primary); font-size: 1rem;">${c.label} <span style="opacity:0.5; font-size:0.8em; font-weight:normal;">(${items.length})</span></span>
            </div>
            
            <div style="display: flex; gap: var(--space-2);" onclick="event.stopPropagation()">
              <button class="btn btn-secondary" style="padding: var(--space-2); border: none; background: var(--surface); box-shadow: 0 1px 2px rgba(0,0,0,0.1);" onclick="Media.renameCategory('${c.id}', '${c.label.replace(/'/g, "\\'")}')" title="Renomear Pasta">
                ${Utils.icons.edit}
              </button>
              <button class="btn btn-secondary" style="padding: var(--space-2); border: none; background: var(--surface); color: #ef4444; box-shadow: 0 1px 2px rgba(0,0,0,0.1);" onclick="Media.deleteCategory('${c.id}')" title="Excluir Pasta">
                ${Utils.icons.trash}
              </button>
            </div>
          </div>
          
          <!-- Body (Items) -->
          ${isExpanded ? `
            <div style="padding: 0 var(--space-3) var(--space-3) var(--space-3); display: flex; flex-direction: column; gap: 4px;">
              ${items.length > 0 ? itemsHTML : '<div style="font-size: 0.85rem; opacity: 0.5; padding: var(--space-2) 0; text-align: center;">Nenhuma mídia nesta categoria</div>'}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  editMediaManager(id) {
    this.editMedia(id);
  },

  deleteMediaManager(id) {
    Utils.confirm('Tem certeza que deseja remover esta mídia?', () => {
      Store.media.delete(id);
      this.renderList();
      this.renderCategoryManagerList();
      Utils.toast('Mídia removida', 'success');
    });
  },

  changeStatusFromManager(id, newStatus) {
    Store.media.toggleStatus(id, newStatus);
    this.renderList();
    this.renderCategoryManagerList();
    Utils.toast('Mídia movida', 'success');
  },

  addCategoryFromManager() {
    const input = document.getElementById('new-category-name');
    const name = input.value.trim();
    if (!name) return;
    
    const categories = Store.media.getCategories();
    const id = 'cat_' + Date.now();
    categories.push({ id, label: name });
    Store.media.saveCategories(categories);
    
    input.value = '';
    this.renderCategoryManagerList();
    Utils.toast('Categoria criada!', 'success');
  },

  renameCategory(id, oldName) {
    Utils.prompt('Renomear Pasta:', oldName, (newName) => {
      if (!newName || !newName.trim() || newName.trim() === oldName) return;
      
      const categories = Store.media.getCategories();
      const cat = categories.find(c => c.id === id);
      if (cat) {
        cat.label = newName.trim();
        Store.media.saveCategories(categories);
        this.renderCategoryManagerList();
        App.renderCurrentPage();
        Utils.toast('Pasta renomeada!', 'success');
      }
    });
  },

  deleteCategory(id) {
    // Prevent deletion of categories with items
    const allMedia = Store.media.getAll();
    const hasItems = allMedia.some(m => m.status === id);
    if (hasItems) {
      Utils.toast('Não é possível remover: mova as mídias desta categoria primeiro.', 'error');
      return;
    }

    Utils.confirm('Tem certeza que deseja remover esta categoria?', () => {
      let categories = Store.media.getCategories();
      categories = categories.filter(c => c.id !== id);
      Store.media.saveCategories(categories);
      
      if (this.currentFilter === id) {
        this.currentFilter = categories.length > 0 ? categories[0].id : '';
      }
      this.renderCategoryManagerList();
      Utils.toast('Categoria removida.', 'success');
    });
  }
};

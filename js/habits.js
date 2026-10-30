/* ============================================
   KORHAVEN — Habits Module
   ============================================ */

const Habits = {
  _view: 'tracker', // tracker, heatmap

  render() {
    const habits = Store.habits.getAll();
    const today = Utils.today();

    // Month dates
    const monthDates = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(i).padStart(2, '0');
      monthDates.push(`${currentYear}-${monthStr}-${dayStr}`);
    }

    const currentDayOfWeek = new Date().getDay();
    
    const todayHabits = habits.filter(h => {
      if (h.frequency === 'specific' && Array.isArray(h.specificDays)) {
        return h.specificDays.includes(currentDayOfWeek);
      }
      return true;
    });

    const todayChecked = todayHabits.filter(h => h.checks && h.checks[today]).length;
    const todayRate = todayHabits.length > 0 ? Math.round((todayChecked / todayHabits.length) * 100) : 0;

    return `
      <div class="animate-fadeIn">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">Hábitos</h1>
            <p class="page-subtitle">Construa consistência um dia de cada vez</p>
          </div>
          <div class="page-header-right">
            <div class="tabs">
              <div class="tab-item ${this._view === 'tracker' ? 'active' : ''}" onclick="Habits.setView('tracker')">Tracker</div>
              <div class="tab-item ${this._view === 'heatmap' ? 'active' : ''}" onclick="Habits.setView('heatmap')">Gráfico</div>
            </div>
            <button class="btn btn-primary" onclick="Habits.openModal()">
              ${Utils.icon('plus')} Novo Hábito
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid-4 stagger" style="margin-bottom: var(--space-8);">
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Hoje</div>
              <div class="stat-card-value">${todayRate}%</div>
              <div class="stat-card-change ${todayRate >= 80 ? 'up' : ''}">${todayChecked}/${todayHabits.length}</div>
            </div>
            <div class="stat-card-icon accent">${Utils.icon('habits')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Total de Hábitos</div>
              <div class="stat-card-value">${habits.length}</div>
            </div>
            <div class="stat-card-icon success">${Utils.icon('flame')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Maior Streak</div>
              <div class="stat-card-value">${this._getBestStreak(habits)} dias</div>
            </div>
            <div class="stat-card-icon warning">${Utils.icon('zap')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Completude Mensal</div>
              <div class="stat-card-value">${this._getWeeklyRate(habits, monthDates)}%</div>
            </div>
            <div class="stat-card-icon accent">${Utils.icon('barChart')}</div>
          </div>
        </div>

        ${this._view === 'tracker' ? this._renderTracker(habits, monthDates) : this._renderHeatmap(habits)}
      </div>

      <!-- Modal -->
      <div class="modal-overlay" id="habit-modal">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title" id="habit-modal-title">Novo Hábito</h3>
            <button class="modal-close" onclick="Habits.closeModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="habit-edit-id" value="">
            <div class="form-group">
              <label class="form-label">Nome do Hábito</label>
              <input type="text" class="form-input" id="habit-name" placeholder="Ex: Meditar 10 min, Exercício, Leitura...">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Categoria</label>
                <input type="hidden" id="habit-category" value="saúde">
                <div class="custom-select-wrapper" id="habit-category-wrapper">
                  <div class="custom-select-trigger" onclick="Habits.toggleDropdown('habit-category')">
                    <span id="habit-category-display">Saúde</span>
                    <span style="opacity: 0.5;">▼</span>
                  </div>
                  <div class="custom-select-options">
                    <div class="custom-select-option" onclick="Habits.selectOption('habit-category', 'saúde', 'Saúde')">Saúde</div>
                    <div class="custom-select-option" onclick="Habits.selectOption('habit-category', 'higiene', 'Higiene')">Higiene</div>
                    <div class="custom-select-option" onclick="Habits.selectOption('habit-category', 'produtividade', 'Produtividade')">Produtividade</div>
                    <div class="custom-select-option" onclick="Habits.selectOption('habit-category', 'mente', 'Mente')">Mente</div>
                    <div class="custom-select-option" onclick="Habits.selectOption('habit-category', 'finanças', 'Finanças')">Finanças</div>
                    <div class="custom-select-option" onclick="Habits.selectOption('habit-category', 'relacionamentos', 'Relacionamentos')">Relacionamentos</div>
                    <div class="custom-select-option" onclick="Habits.selectOption('habit-category', 'outro', 'Outro')">Outro</div>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Tipo</label>
                <input type="hidden" id="habit-type" value="do">
                <div class="custom-select-wrapper" id="habit-type-wrapper">
                  <div class="custom-select-trigger" onclick="Habits.toggleDropdown('habit-type')">
                    <span id="habit-type-display">✅ Fazer (marcar = sucesso)</span>
                    <span style="opacity: 0.5;">▼</span>
                  </div>
                  <div class="custom-select-options">
                    <div class="custom-select-option" onclick="Habits.selectOption('habit-type', 'do', '✅ Fazer (marcar = sucesso)')">✅ Fazer (marcar = sucesso)</div>
                    <div class="custom-select-option" onclick="Habits.selectOption('habit-type', 'dont', '🚫 Não fazer (não marcar = sucesso)')">🚫 Não fazer (não marcar = sucesso)</div>
                    <div class="custom-select-option" onclick="Habits.selectOption('habit-type', 'time', '⏳ Por tempo (medido no cronômetro)')">⏳ Por tempo (medido no cronômetro)</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- New field for duration -->
            <div class="form-group" id="habit-duration-group" style="display: none; margin-top: var(--space-4);">
              <label class="form-label">Meta de Tempo Diário (Minutos)</label>
              <input type="number" class="form-input" id="habit-duration-target" placeholder="Ex: 30" min="1">
              <div class="form-hint">O hábito será concluído automaticamente quando o cronômetro atingir essa meta.</div>
            </div>
            
            <div class="form-group" style="margin-top: var(--space-4);">
              <label class="form-label">Frequência</label>
              <input type="hidden" id="habit-frequency" value="daily">
              <div class="custom-select-wrapper" id="habit-frequency-wrapper">
                <div class="custom-select-trigger" onclick="Habits.toggleDropdown('habit-frequency')">
                  <span id="habit-frequency-display">📅 Diário (Todos os dias)</span>
                  <span style="opacity: 0.5;">▼</span>
                </div>
                <div class="custom-select-options">
                  <div class="custom-select-option" onclick="Habits.selectOption('habit-frequency', 'daily', '📅 Diário (Todos os dias)')">📅 Diário (Todos os dias)</div>
                  <div class="custom-select-option" onclick="Habits.selectOption('habit-frequency', 'specific', '🎯 Dias Específicos')">🎯 Dias Específicos</div>
                  <div class="custom-select-option" onclick="Habits.selectOption('habit-frequency', 'weekly', '🗓️ Semanal (1x por semana)')">🗓️ Semanal (1x por semana)</div>
                  <div class="custom-select-option" onclick="Habits.selectOption('habit-frequency', 'monthly', '🌙 Mensal (1x por mês)')">🌙 Mensal (1x por mês)</div>
                </div>
              </div>
            </div>
            
            <div class="form-group" id="habit-specific-days" style="display: none; margin-top: var(--space-3);">
              <label class="form-label">Selecione os dias</label>
              <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                <label class="tag" style="cursor:pointer;"><input type="checkbox" value="0" class="day-cb" style="display:none;" onchange="Habits.toggleDay(this)"> Dom</label>
                <label class="tag" style="cursor:pointer;"><input type="checkbox" value="1" class="day-cb" style="display:none;" onchange="Habits.toggleDay(this)"> Seg</label>
                <label class="tag" style="cursor:pointer;"><input type="checkbox" value="2" class="day-cb" style="display:none;" onchange="Habits.toggleDay(this)"> Ter</label>
                <label class="tag" style="cursor:pointer;"><input type="checkbox" value="3" class="day-cb" style="display:none;" onchange="Habits.toggleDay(this)"> Qua</label>
                <label class="tag" style="cursor:pointer;"><input type="checkbox" value="4" class="day-cb" style="display:none;" onchange="Habits.toggleDay(this)"> Qui</label>
                <label class="tag" style="cursor:pointer;"><input type="checkbox" value="5" class="day-cb" style="display:none;" onchange="Habits.toggleDay(this)"> Sex</label>
                <label class="tag" style="cursor:pointer;"><input type="checkbox" value="6" class="day-cb" style="display:none;" onchange="Habits.toggleDay(this)"> Sáb</label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Habits.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Habits.saveFromModal()">Salvar</button>
          </div>
        </div>
      </div>
    `;
  },

  afterRender() {
    if (this._view === 'heatmap') {
      this._initChart();
    }
  },

  _initChart() {
    const canvas = document.getElementById('habitsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const habits = Store.habits.getAll();
    const labels = [];
    const data = [];
    
    const today = new Date();
    const days = 14;
    
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        
        labels.push(`${dd}/${mm}`);
        
        let checked = 0;
        habits.forEach(h => {
            if (h.checks && h.checks[dateStr]) checked++;
        });
        
        data.push(checked);
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(83, 109, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(83, 109, 255, 0.0)');
    
    if (window.habitsChartInstance) {
        window.habitsChartInstance.destroy();
    }
    
    window.habitsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hábitos Concluídos',
                data: data,
                borderColor: '#00B4D8',
                backgroundColor: 'rgba(0, 180, 216, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#03045E',
                pointBorderColor: '#00B4D8',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: 'rgba(255,255,255,0.9)',
                        font: { family: 'Inter', size: 11 }
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.4)',
                        drawBorder: false
                    },
                    border: { display: false }
                },
                x: {
                    ticks: {
                        color: 'rgba(255,255,255,0.9)',
                        font: { family: 'Inter', size: 11 }
                    },
                    grid: {
                        display: false
                    },
                    border: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(21, 24, 32, 0.9)',
                    titleFont: { family: 'Inter', size: 13 },
                    bodyFont: { family: 'Inter', size: 13 },
                    padding: 10,
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' hábitos';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });
  },

  _renderTracker(habits) {
    if (habits.length === 0) {
      return `
        <div class="card">
          <div class="empty-state">
            <img src="assets/check_icon.jpg" class="empty-state-img" alt="Check">
            <h3 class="empty-state-title">Nenhum hábito cadastrado</h3>
            <p class="empty-state-text">Crie seus primeiros hábitos para começar a rastrear sua consistência diária.</p>
            <button class="btn btn-primary" onclick="Habits.openModal()">
              ${Utils.icon('plus')} Criar Hábito
            </button>
          </div>
        </div>
      `;
    }

    const todayStr = Utils.today();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0-6

    const monthName = now.toLocaleString('pt-BR', { month: 'long' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const catIcons = { 
      saúde: Utils.icons.heart, 
      higiene: Utils.icons.shield, 
      produtividade: Utils.icons.zap, 
      mente: Utils.icons.evolution, 
      finanças: Utils.icons.finances, 
      relacionamentos: Utils.icons.heart, 
      outro: Utils.icons.habits 
    };

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-6);">
        ${habits.map(h => {
          const streak = Store.habits.getStreak(h.id);
          const cat = h.category || 'outro';
          
          let cells = '';
          ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(day => {
             cells += `<div style="text-align:center; font-size:10px; font-weight:var(--fw-bold); color:var(--text-muted); margin-bottom:8px; text-transform:uppercase;">${day}</div>`;
          });
          
          for (let i = 0; i < firstDayOfWeek; i++) {
             cells += `<div></div>`;
          }
          
          for (let i = 1; i <= daysInMonth; i++) {
             const monthStr = String(currentMonth + 1).padStart(2, '0');
             const dayStr = String(i).padStart(2, '0');
             const dateKey = `${currentYear}-${monthStr}-${dayStr}`;
             const isToday = dateKey === todayStr;
             const checked = h.checks && h.checks[dateKey];
             
             let isScheduled = true;
             const dateObj = new Date(dateKey + 'T12:00:00');
             const dayOfWeek = dateObj.getDay();
             if (h.frequency === 'specific' && Array.isArray(h.specificDays)) {
                isScheduled = h.specificDays.includes(dayOfWeek);
             }

             if (!isScheduled) {
                cells += `<div style="width:32px; height:32px; border-radius:6px; margin:auto; display:flex; align-items:center; justify-content:center; font-size:12px; color:rgba(255,255,255,0.4); cursor:not-allowed;" title="Não programado">${i}</div>`;
             } else {
                let bg = checked ? '#00B4D8' : 'rgba(144,224,239,0.02)';
                let border = checked ? 'none' : '1px solid rgba(144,224,239,0.05)';
                let color = checked ? '#03045E' : 'var(--text-secondary)';
                let shadow = checked ? '0 0 12px rgba(0, 180, 216, 0.4)' : 'none';
                let hoverStyle = checked ? '' : 'onmouseover="this.style.background=\'rgba(144,224,239,0.1)\'" onmouseout="this.style.background=\'rgba(144,224,239,0.02)\'"';

                if (isToday && !checked) {
                   border = '1px solid #00B4D8';
                   color = '#00B4D8';
                }
                
                cells += `
                  <div onclick="Habits.toggleCheck('${h.id}', '${dateKey}')" 
                       ${hoverStyle}
                       style="width:32px; height:32px; border-radius:6px; margin:auto; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:var(--fw-semibold); background:${bg}; border:${border}; color:${color}; box-shadow:${shadow}; cursor:pointer; transition:all 0.2s;">
                     ${i}
                  </div>`;
             }
          }

          return `
            <div class="card card-degrade-escuro" style="display:flex; flex-direction:column;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:var(--space-4);">
                <div>
                  <h3 style="font-size:var(--font-lg); color:var(--text-primary); font-weight:var(--fw-bold); margin-bottom:4px; display:flex; align-items:center; gap:8px;">
                    <span style="width: 20px; height: 20px; display: inline-flex; color: var(--accent);">${catIcons[cat] || Utils.icons.habits}</span> ${h.name}
                  </h3>
                  <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                    <span style="width: 14px; height: 14px; display: inline-flex; color: var(--accent);">${Utils.icons.flame}</span>
                    <span style="font-size:var(--font-xs); color:var(--accent); text-transform:uppercase; font-weight:var(--fw-semibold);">Streak: ${streak} dias</span>
                  </div>
                </div>
                <div style="display: flex; gap: 4px;">
                  <button class="btn btn-icon btn-ghost sm" onclick="Habits.openModal('${h.id}')" data-tooltip="Editar Hábito">
                    ${Utils.icons.edit}
                  </button>
                  <button class="btn btn-icon btn-ghost sm" onclick="Habits.confirmDelete('${h.id}')" data-tooltip="Excluir Hábito">
                    ${Utils.icons.trash}
                  </button>
                </div>
              </div>
              
              <div style="text-align:center; font-size:var(--font-sm); font-weight:var(--fw-medium); color:var(--text-secondary); margin-bottom:var(--space-4); letter-spacing: 1px;">
                ${capitalizedMonth} ${currentYear}
              </div>
              
              <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:8px; flex:1; align-items:start;">
                ${cells}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  _renderHeatmap(habits) {
    if (habits.length === 0) {
      return `<div class="card"><div class="empty-state"><img src="assets/chart_icon.jpg" class="empty-state-img" alt="Chart"><h3 class="empty-state-title">Nenhum dado para exibir</h3></div></div>`;
    }

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Gráfico de Consistência (Últimos 14 dias)</h3>
        </div>
        <div style="height: 300px; padding-top: var(--space-4); position: relative;">
          <canvas id="habitsChart"></canvas>
        </div>
      </div>
    `;
  },

  setView(view) {
    this._view = view;
    App.renderCurrentPage();
  },

  toggleCheck(habitId, date) {
    Store.habits.toggleCheck(habitId, date);
    App.renderCurrentPage();
  },

  openModal(editId = null) {
    const modal = document.getElementById('habit-modal');
    
    const catDisplay = { 'saúde': 'Saúde', 'higiene': 'Higiene', 'produtividade': 'Produtividade', 'mente': 'Mente', 'finanças': 'Finanças', 'relacionamentos': 'Relacionamentos', 'outro': 'Outro' };
    const typeDisplay = { 'do': '✅ Fazer (marcar = sucesso)', 'dont': '🚫 Não fazer (não marcar = sucesso)', 'time': '⏳ Por tempo (medido no cronômetro)' };
    const freqDisplay = { 'daily': '📅 Diário (Todos os dias)', 'specific': '🎯 Dias Específicos', 'weekly': '🗓️ Semanal (1x por semana)', 'monthly': '🌙 Mensal (1x por mês)' };

    if (editId) {
      const h = Store.habits.getAll().find(h => h.id === editId);
      if (!h) return;
      document.getElementById('habit-modal-title').textContent = 'Editar Hábito';
      document.getElementById('habit-edit-id').value = h.id;
      document.getElementById('habit-name').value = h.name;
      
      const cat = h.category || 'saúde';
      document.getElementById('habit-category').value = cat;
      document.getElementById('habit-category-display').textContent = catDisplay[cat] || cat;
      
      const type = h.type || 'do';
      document.getElementById('habit-type').value = type;
      document.getElementById('habit-type-display').textContent = typeDisplay[type] || type;
      
      document.getElementById('habit-duration-target').value = h.durationTarget || '';
      
      const freq = h.frequency || 'daily';
      document.getElementById('habit-frequency').value = freq;
      document.getElementById('habit-frequency-display').textContent = freqDisplay[freq] || freq;
      
      if (freq === 'specific' && h.specificDays) {
        document.querySelectorAll('.day-cb').forEach(cb => {
          cb.checked = h.specificDays.includes(parseInt(cb.value));
          cb.parentElement.classList.toggle('tag-accent', cb.checked);
        });
      }
    } else {
      document.getElementById('habit-modal-title').textContent = 'Novo Hábito';
      document.getElementById('habit-edit-id').value = '';
      document.getElementById('habit-name').value = '';
      document.getElementById('habit-category').value = 'saúde';
      document.getElementById('habit-category-display').textContent = catDisplay['saúde'];
      document.getElementById('habit-type').value = 'do';
      document.getElementById('habit-type-display').textContent = typeDisplay['do'];
      document.getElementById('habit-duration-target').value = '';
      document.getElementById('habit-frequency').value = 'daily';
      document.getElementById('habit-frequency-display').textContent = freqDisplay['daily'];
      document.querySelectorAll('.day-cb').forEach(cb => {
        cb.checked = false;
        cb.parentElement.classList.remove('tag-accent');
      });
    }
    this.toggleFrequencyOptions();
    this.toggleTypeOptions();
    modal.classList.add('active');
  },

  toggleDropdown(id) {
    // Close other open dropdowns first
    ['habit-category', 'habit-type', 'habit-frequency'].forEach(otherId => {
      if (otherId !== id) {
        const w = document.getElementById(`${otherId}-wrapper`);
        if (w) w.classList.remove('open');
      }
    });
    const wrapper = document.getElementById(`${id}-wrapper`);
    if (wrapper) wrapper.classList.toggle('open');
  },

  selectOption(id, value, displayText) {
    document.getElementById(id).value = value;
    document.getElementById(`${id}-display`).textContent = displayText;
    const wrapper = document.getElementById(`${id}-wrapper`);
    if (wrapper) wrapper.classList.remove('open');
    
    if (id === 'habit-frequency') this.toggleFrequencyOptions();
    if (id === 'habit-type') this.toggleTypeOptions();
  },

  toggleTypeOptions() {
    const type = document.getElementById('habit-type').value;
    const durationGroup = document.getElementById('habit-duration-group');
    if (durationGroup) durationGroup.style.display = (type === 'time') ? 'block' : 'none';
  },

  closeModal() {
    document.getElementById('habit-modal').classList.remove('active');
  },

  toggleFrequencyOptions() {
    const freq = document.getElementById('habit-frequency').value;
    document.getElementById('habit-specific-days').style.display = (freq === 'specific') ? 'block' : 'none';
  },

  toggleDay(cb) {
    cb.parentElement.classList.toggle('tag-accent', cb.checked);
  },

  saveFromModal() {
    const name = document.getElementById('habit-name').value.trim();
    if (!name) { Utils.toast('Digite o nome do hábito', 'warning'); return; }

    const editId = document.getElementById('habit-edit-id').value;
    const frequency = document.getElementById('habit-frequency').value;
    const specificDays = [];
    if (frequency === 'specific') {
      document.querySelectorAll('.day-cb:checked').forEach(cb => specificDays.push(parseInt(cb.value)));
      if (specificDays.length === 0) {
        Utils.toast('Selecione pelo menos um dia', 'warning');
        return;
      }
    }

    const type = document.getElementById('habit-type').value;

    const data = {
      name,
      category: document.getElementById('habit-category').value,
      type: type,
      frequency,
      specificDays
    };

    if (type === 'time') {
       const dt = parseInt(document.getElementById('habit-duration-target').value);
       if (isNaN(dt) || dt <= 0) {
           Utils.toast('Insira uma meta de tempo válida (minutos)', 'warning');
           return;
       }
       data.durationTarget = dt;
    }

    if (editId) {
      data.id = editId;
      const existing = Store.habits.getAll().find(h => h.id === editId);
      if (existing) data.checks = existing.checks;
    }

    Store.habits.save(data);
    this.closeModal();
    Utils.toast(editId ? 'Hábito atualizado!' : 'Hábito criado! ✅', 'success');
    App.renderCurrentPage();
  },

  confirmDelete(id) {
    Utils.confirm('Excluir este hábito e todo o histórico?', () => {
      Store.habits.delete(id);
      Utils.toast('Hábito removido', 'danger');
      App.renderCurrentPage();
    });
  },

  _getBestStreak(habits) {
    if (habits.length === 0) return 0;
    return Math.max(0, ...habits.map(h => Store.habits.getStreak(h.id)));
  },

  _getWeeklyRate(habits, weekDates) {
    if (habits.length === 0) return 0;
    let total = 0;
    let checked = 0;
    habits.forEach(h => {
      weekDates.forEach(d => {
        total++;
        if (h.checks && h.checks[d]) checked++;
      });
    });
    return total > 0 ? Math.round((checked / total) * 100) : 0;
  }
};

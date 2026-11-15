/* ============================================
   KORHAVEN — Custom Calendar & Time Picker
   Protótipo Nativo de Calendário e Horário Korhaven
   Design Dark/Cyberpunk com atalhos, navegação e integração
   ============================================ */

const Picker = {
  // Estado do DatePicker
  _dpTargetId: null,
  _dpCurrentYear: 2026,
  _dpCurrentMonth: 10, // 0-indexed (10 = Novembro)
  _dpSelectedDate: null, // Date object
  _dpOnSelect: null,

  // Estado do TimePicker
  _tpTargetId: null,
  _tpHour: 9,
  _tpMinute: 0,
  _tpOnSelect: null,

  // Nomes dos meses e dias em Português
  months: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ],
  weekdaysShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],

  init() {
    this._ensureOverlaysInDOM();
  },

  _ensureOverlaysInDOM() {
    if (!document.getElementById('korhaven-datepicker-overlay')) {
      const dpOverlay = document.createElement('div');
      dpOverlay.id = 'korhaven-datepicker-overlay';
      dpOverlay.className = 'korhaven-picker-overlay';
      dpOverlay.innerHTML = `
        <div class="korhaven-picker-card datepicker-card animate-fadeIn">
          <!-- Topo -->
          <div class="picker-header">
            <div class="picker-brand-tag">
              <span class="picker-pulse-dot"></span>
              <span>CALENDÁRIO KORHAVEN</span>
            </div>
            <button type="button" class="picker-close-btn" onclick="Picker.closeDate()">&times;</button>
          </div>

          <!-- Mostrador da Data Selecionada -->
          <div class="picker-display-banner">
            <div class="picker-display-sub">DATA SELECIONADA</div>
            <div class="picker-display-main" id="dp-display-text">15 de Novembro de 2026</div>
          </div>

          <!-- Atalhos Rápidos -->
          <div class="picker-shortcuts">
            <button type="button" class="picker-shortcut-pill" onclick="Picker.setDatePreset('today')">Hoje</button>
            <button type="button" class="picker-shortcut-pill" onclick="Picker.setDatePreset('tomorrow')">Amanhã</button>
            <button type="button" class="picker-shortcut-pill" onclick="Picker.setDatePreset('in3days')">+3 Dias</button>
            <button type="button" class="picker-shortcut-pill" onclick="Picker.setDatePreset('nextWeek')">Próx. Semana</button>
          </div>

          <!-- Navegação do Mês / Ano -->
          <div class="datepicker-nav">
            <button type="button" class="picker-nav-btn" onclick="Picker.prevMonth()" title="Mês Anterior">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <div class="datepicker-month-year-label" id="dp-month-year-label">
              Novembro 2026
            </div>
            <button type="button" class="picker-nav-btn" onclick="Picker.nextMonth()" title="Próximo Mês">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>

          <!-- Cabeçalho dos Dias da Semana -->
          <div class="datepicker-weekdays-grid">
            <span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span>
          </div>

          <!-- Grid de Dias -->
          <div class="datepicker-days-grid" id="dp-days-grid"></div>

          <!-- Rodapé de Ações -->
          <div class="picker-footer">
            <button type="button" class="btn btn-secondary sm" onclick="Picker.closeDate()">Cancelar</button>
            <button type="button" class="btn btn-primary sm" onclick="Picker.confirmDate()" style="box-shadow: 0 0 12px var(--accent-glow);">
              Confirmar Data
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(dpOverlay);
    }

    if (!document.getElementById('korhaven-timepicker-overlay')) {
      const tpOverlay = document.createElement('div');
      tpOverlay.id = 'korhaven-timepicker-overlay';
      tpOverlay.className = 'korhaven-picker-overlay';
      tpOverlay.innerHTML = `
        <div class="korhaven-picker-card timepicker-card animate-fadeIn">
          <!-- Topo -->
          <div class="picker-header">
            <div class="picker-brand-tag">
              <span class="picker-pulse-dot" style="background:#8b5cf6;"></span>
              <span>HORÁRIO KORHAVEN</span>
            </div>
            <button type="button" class="picker-close-btn" onclick="Picker.closeTime()">&times;</button>
          </div>

          <!-- Roleta de Horário Estilo Alarme do iPhone -->
          <div class="ios-time-picker-container">
            <div class="ios-wheel-header">
              <span>HORAS</span>
              <span>MINUTOS</span>
            </div>

            <div class="ios-time-wheel-box">
              <!-- Lente Central de Seleção Estilo iOS -->
              <div class="ios-picker-lens"></div>

              <!-- Vinheta Degradê para Efeito Cilíndrico 3D -->
              <div class="ios-picker-vignette"></div>

              <!-- Rolo de Horas (00 a 23) -->
              <div class="ios-wheel-column" id="tp-wheel-hours"></div>

              <!-- Divisor Dois Pontos Neon -->
              <div class="ios-picker-colon">:</div>

              <!-- Rolo de Minutos (00 a 59) -->
              <div class="ios-wheel-column" id="tp-wheel-minutes"></div>
            </div>
          </div>

          <!-- Horários Frequentes / Sugeridos -->
          <div style="margin: var(--space-3) 0 var(--space-2);">
            <div class="picker-section-label">HORÁRIOS RÁPIDOS</div>
            <div class="timepicker-presets-grid">
              <button type="button" class="tp-preset-chip" onclick="Picker.setTimePreset('08:00')">🌅 08:00 (Início)</button>
              <button type="button" class="tp-preset-chip" onclick="Picker.setTimePreset('09:00')">⚡ 09:00 (Manhã)</button>
              <button type="button" class="tp-preset-chip" onclick="Picker.setTimePreset('12:00')">☀️ 12:00 (Almoço)</button>
              <button type="button" class="tp-preset-chip" onclick="Picker.setTimePreset('14:00')">🎯 14:00 (Tarde)</button>
              <button type="button" class="tp-preset-chip" onclick="Picker.setTimePreset('18:00')">🔔 18:00 (Prazo)</button>
              <button type="button" class="tp-preset-chip" onclick="Picker.setTimePreset('21:00')">🌙 21:00 (Noite)</button>
            </div>
          </div>

          <!-- Rodapé de Ações -->
          <div class="picker-footer">
            <button type="button" class="btn btn-secondary sm" onclick="Picker.setTimeToNow()">Agora</button>
            <button type="button" class="btn btn-primary sm" onclick="Picker.confirmTime()" style="box-shadow: 0 0 12px rgba(139, 92, 246, 0.4); background: #8b5cf6; border-color: #a78bfa;">
              Confirmar Horário
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(tpOverlay);
    }
  },

  // ============================================
  // DATEPICKER (CALENDÁRIO KORHAVEN)
  // ============================================
  openDate(targetId, initialValue = null, onSelect = null) {
    this._ensureOverlaysInDOM();
    this._dpTargetId = targetId;
    this._dpOnSelect = onSelect;

    // Se já tiver valor no input, usa como data inicial
    let dateStr = initialValue;
    if (!dateStr && targetId) {
      const el = document.getElementById(targetId);
      if (el) dateStr = el.value;
    }

    let d = new Date();
    if (dateStr && dateStr.length >= 10) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }

    if (isNaN(d.getTime())) d = new Date();

    this._dpSelectedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    this._dpCurrentYear = d.getFullYear();
    this._dpCurrentMonth = d.getMonth();

    this._renderCalendarGrid();
    this._updateDateDisplayBanner();

    const overlay = document.getElementById('korhaven-datepicker-overlay');
    if (overlay) overlay.classList.add('active');
  },

  closeDate() {
    const overlay = document.getElementById('korhaven-datepicker-overlay');
    if (overlay) overlay.classList.remove('active');
  },

  prevMonth() {
    this._dpCurrentMonth--;
    if (this._dpCurrentMonth < 0) {
      this._dpCurrentMonth = 11;
      this._dpCurrentYear--;
    }
    this._renderCalendarGrid();
  },

  nextMonth() {
    this._dpCurrentMonth++;
    if (this._dpCurrentMonth > 11) {
      this._dpCurrentMonth = 0;
      this._dpCurrentYear++;
    }
    this._renderCalendarGrid();
  },

  selectDay(year, month, day) {
    this._dpSelectedDate = new Date(year, month, day);
    this._dpCurrentYear = year;
    this._dpCurrentMonth = month;
    this._renderCalendarGrid();
    this._updateDateDisplayBanner();
  },

  setDatePreset(preset) {
    const now = new Date();
    let target = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (preset === 'today') {
      // today
    } else if (preset === 'tomorrow') {
      target.setDate(target.getDate() + 1);
    } else if (preset === 'in3days') {
      target.setDate(target.getDate() + 3);
    } else if (preset === 'nextWeek') {
      target.setDate(target.getDate() + 7);
    }

    this._dpSelectedDate = target;
    this._dpCurrentYear = target.getFullYear();
    this._dpCurrentMonth = target.getMonth();
    this._renderCalendarGrid();
    this._updateDateDisplayBanner();
  },

  _renderCalendarGrid() {
    const monthYearLabel = document.getElementById('dp-month-year-label');
    if (monthYearLabel) {
      monthYearLabel.textContent = `${this.months[this._dpCurrentMonth]} ${this._dpCurrentYear}`;
    }

    const grid = document.getElementById('dp-days-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const firstDayIndex = new Date(this._dpCurrentYear, this._dpCurrentMonth, 1).getDay(); // 0 = Domingo
    const daysInMonth = new Date(this._dpCurrentYear, this._dpCurrentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this._dpCurrentYear, this._dpCurrentMonth, 0).getDate();

    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = today.getMonth();
    const todayD = today.getDate();

    const selY = this._dpSelectedDate.getFullYear();
    const selM = this._dpSelectedDate.getMonth();
    const selD = this._dpSelectedDate.getDate();

    // Dias do mês anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = this._dpCurrentMonth === 0 ? 11 : this._dpCurrentMonth - 1;
      const prevY = this._dpCurrentMonth === 0 ? this._dpCurrentYear - 1 : this._dpCurrentYear;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dp-day-cell other-month';
      btn.textContent = dayNum;
      btn.onclick = () => this.selectDay(prevY, prevM, dayNum);
      grid.appendChild(btn);
    }

    // Dias do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = (todayY === this._dpCurrentYear && todayM === this._dpCurrentMonth && todayD === d);
      const isSelected = (selY === this._dpCurrentYear && selM === this._dpCurrentMonth && selD === d);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dp-day-cell current-month' + (isToday ? ' is-today' : '') + (isSelected ? ' is-selected' : '');
      btn.textContent = d;
      btn.onclick = () => this.selectDay(this._dpCurrentYear, this._dpCurrentMonth, d);
      grid.appendChild(btn);
    }

    // Dias do próximo mês para completar 42 células (6 linhas de 7)
    const totalRendered = firstDayIndex + daysInMonth;
    const remaining = (totalRendered <= 35) ? 35 - totalRendered : 42 - totalRendered;
    for (let d = 1; d <= remaining; d++) {
      const nextM = this._dpCurrentMonth === 11 ? 0 : this._dpCurrentMonth + 1;
      const nextY = this._dpCurrentMonth === 11 ? this._dpCurrentYear + 1 : this._dpCurrentYear;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dp-day-cell other-month';
      btn.textContent = d;
      btn.onclick = () => this.selectDay(nextY, nextM, d);
      grid.appendChild(btn);
    }
  },

  _updateDateDisplayBanner() {
    const textEl = document.getElementById('dp-display-text');
    if (!textEl || !this._dpSelectedDate) return;

    const y = this._dpSelectedDate.getFullYear();
    const m = this._dpSelectedDate.getMonth();
    const d = this._dpSelectedDate.getDate();
    const w = this._dpSelectedDate.getDay();

    const formatted = `${d} de ${this.months[m]} de ${y} (${this.weekdaysShort[w]})`;
    textEl.textContent = formatted;
  },

  confirmDate() {
    if (!this._dpSelectedDate) return;

    const y = this._dpSelectedDate.getFullYear();
    const m = String(this._dpSelectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(this._dpSelectedDate.getDate()).padStart(2, '0');
    const isoDate = `${y}-${m}-${d}`;

    if (this._dpTargetId) {
      this.setTrigger(this._dpTargetId, isoDate, 'date');
    }

    if (typeof this._dpOnSelect === 'function') {
      this._dpOnSelect(isoDate);
    }

    this.closeDate();
  },

  // ============================================
  // TIMEPICKER (ROLO DE HORÁRIO ESTILO IPHONE)
  // ============================================
  _wheelsInitialized: false,

  _initTimeWheels() {
    const hoursCol = document.getElementById('tp-wheel-hours');
    const minCol = document.getElementById('tp-wheel-minutes');
    if (!hoursCol || !minCol) return;

    if (this._wheelsInitialized) return;
    this._wheelsInitialized = true;

    // Gerar 24 Horas (00 a 23)
    let hoursHtml = '';
    for (let h = 0; h < 24; h++) {
      const val = String(h).padStart(2, '0');
      hoursHtml += `<div class="ios-wheel-item" data-val="${h}">${val}</div>`;
    }
    hoursCol.innerHTML = hoursHtml;

    // Gerar 60 Minutos (00 a 59)
    let minHtml = '';
    for (let m = 0; m < 60; m++) {
      const val = String(m).padStart(2, '0');
      minHtml += `<div class="ios-wheel-item" data-val="${m}">${val}</div>`;
    }
    minCol.innerHTML = minHtml;

    // Altura de cada célula no CSS: 46px
    const ITEM_HEIGHT = 46;

    // Clique direto em qualquer número para rolar suavemente até ele
    hoursCol.addEventListener('click', (e) => {
      const item = e.target.closest('.ios-wheel-item');
      if (item && item.dataset.val !== undefined) {
        this.scrollToHour(parseInt(item.dataset.val, 10), true);
      }
    });

    minCol.addEventListener('click', (e) => {
      const item = e.target.closest('.ios-wheel-item');
      if (item && item.dataset.val !== undefined) {
        this.scrollToMinute(parseInt(item.dataset.val, 10), true);
      }
    });

    // Rolagem tátil / mouse com detecção contínua e destaque tipo iPhone
    let hScrollTimer = null;
    hoursCol.addEventListener('scroll', () => {
      const idx = Math.round(hoursCol.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(23, idx));
      this._tpHour = clamped;
      this._updateWheelHighlight('hours', clamped);

      clearTimeout(hScrollTimer);
      hScrollTimer = setTimeout(() => {
        this._updateWheelHighlight('hours', clamped);
      }, 70);
    }, { passive: true });

    let mScrollTimer = null;
    minCol.addEventListener('scroll', () => {
      const idx = Math.round(minCol.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(59, idx));
      this._tpMinute = clamped;
      this._updateWheelHighlight('minutes', clamped);

      clearTimeout(mScrollTimer);
      mScrollTimer = setTimeout(() => {
        this._updateWheelHighlight('minutes', clamped);
      }, 70);
    }, { passive: true });
  },

  scrollToHour(h, smooth = true) {
    const hoursCol = document.getElementById('tp-wheel-hours');
    if (!hoursCol) return;
    const ITEM_HEIGHT = 46;
    const clamped = Math.max(0, Math.min(23, h));
    this._tpHour = clamped;
    hoursCol.scrollTo({
      top: clamped * ITEM_HEIGHT,
      behavior: smooth ? 'smooth' : 'auto'
    });
    this._updateWheelHighlight('hours', clamped);
  },

  scrollToMinute(m, smooth = true) {
    const minCol = document.getElementById('tp-wheel-minutes');
    if (!minCol) return;
    const ITEM_HEIGHT = 46;
    const clamped = Math.max(0, Math.min(59, m));
    this._tpMinute = clamped;
    minCol.scrollTo({
      top: clamped * ITEM_HEIGHT,
      behavior: smooth ? 'smooth' : 'auto'
    });
    this._updateWheelHighlight('minutes', clamped);
  },

  _updateWheelHighlight(type, activeIdx) {
    const col = document.getElementById(type === 'hours' ? 'tp-wheel-hours' : 'tp-wheel-minutes');
    if (!col) return;
    const items = col.children;
    for (let i = 0; i < items.length; i++) {
      const diff = Math.abs(i - activeIdx);
      if (diff === 0) {
        items[i].className = 'ios-wheel-item is-selected';
      } else if (diff === 1) {
        items[i].className = 'ios-wheel-item is-adjacent';
      } else if (diff === 2) {
        items[i].className = 'ios-wheel-item is-far';
      } else {
        items[i].className = 'ios-wheel-item';
      }
    }
  },

  openTime(targetId, initialValue = null, onSelect = null) {
    this._ensureOverlaysInDOM();
    this._initTimeWheels();
    this._tpTargetId = targetId;
    this._tpOnSelect = onSelect;

    let timeStr = initialValue;
    if (!timeStr && targetId) {
      const el = document.getElementById(targetId);
      if (el) timeStr = el.value;
    }

    if (!timeStr || !timeStr.includes(':')) {
      const now = new Date();
      timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    const [h, m] = timeStr.split(':').map(n => parseInt(n, 10));
    this._tpHour = isNaN(h) ? 9 : Math.max(0, Math.min(23, h));
    this._tpMinute = isNaN(m) ? 0 : Math.max(0, Math.min(59, m));

    const overlay = document.getElementById('korhaven-timepicker-overlay');
    if (overlay) overlay.classList.add('active');

    // Posiciona os cilindros instantaneamente no valor salvo
    setTimeout(() => {
      this.scrollToHour(this._tpHour, false);
      this.scrollToMinute(this._tpMinute, false);
    }, 60);
  },

  closeTime() {
    const overlay = document.getElementById('korhaven-timepicker-overlay');
    if (overlay) overlay.classList.remove('active');
  },

  adjustHour(delta) {
    const nextH = (this._tpHour + delta + 24) % 24;
    this.scrollToHour(nextH, true);
  },

  adjustMinute(delta) {
    const nextM = (this._tpMinute + delta + 60) % 60;
    this.scrollToMinute(nextM, true);
  },

  setTimePreset(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return;
    const [h, m] = timeStr.split(':').map(n => parseInt(n, 10));
    this.scrollToHour(h, true);
    this.scrollToMinute(m, true);
  },

  setTimeToNow() {
    const now = new Date();
    this.scrollToHour(now.getHours(), true);
    this.scrollToMinute(now.getMinutes(), true);
  },

  confirmTime() {
    const timeStr = `${String(this._tpHour).padStart(2, '0')}:${String(this._tpMinute).padStart(2, '0')}`;

    if (this._tpTargetId) {
      this.setTrigger(this._tpTargetId, timeStr, 'time');
    }

    if (typeof this._tpOnSelect === 'function') {
      this._tpOnSelect(timeStr);
    }

    this.closeTime();
  },

  // ============================================
  // SINCRONIZADOR DE TRIGGER & INPUT OCULTO
  // ============================================
  setTrigger(targetId, value, type = 'date') {
    const input = document.getElementById(targetId);
    if (input) {
      input.value = value;
      // Dispara evento change para compatibilidade com event listeners
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const displayEl = document.getElementById(`${targetId}-display`);
    if (displayEl) {
      if (type === 'date') {
        displayEl.textContent = this.formatDateDisplay(value);
      } else {
        displayEl.textContent = value;
      }
    }
  },

  formatDateDisplay(isoDate) {
    if (!isoDate || isoDate.length < 10) return 'Selecionar Data';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  },

  // ============================================
  // PROTÓTIPO DEMO INTERATIVO (SHOWCASE)
  // ============================================
  openDemo() {
    this._ensureOverlaysInDOM();
    if (!document.getElementById('picker-demo-modal')) {
      const demoModal = document.createElement('div');
      demoModal.id = 'picker-demo-modal';
      demoModal.className = 'modal-overlay';
      demoModal.innerHTML = `
        <div class="modal" style="max-width: 560px; background: linear-gradient(165deg, #10192e 0%, #090e1c 100%); border: 1px solid var(--accent); box-shadow: 0 0 35px var(--accent-glow);">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.4rem;">🗓️</span>
              <div>
                <h3 class="modal-title" style="color: var(--text-primary); font-size: 1.15rem; font-weight: 800;">
                  Protótipo de Calendário & Horário Korhaven
                </h3>
                <div style="font-size: 0.75rem; color: var(--accent); letter-spacing: 1px; text-transform: uppercase;">
                  Componentes Nativos do Dashboard
                </div>
              </div>
            </div>
            <button class="modal-close" onclick="Picker.closeDemo()">&times;</button>
          </div>

          <div class="modal-body" style="padding: var(--space-6);">
            <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: var(--space-5);">
              Experimente a interface personalizada de <strong>Data</strong> e <strong>Horário</strong> desenvolvida exclusivamente com a identidade visual cyberpunk/dark neon do Korhaven.
            </p>

            <div class="form-row" style="margin-bottom: var(--space-5);">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Data do Alerta (Calendário Próprio)</label>
                <div class="korhaven-picker-trigger" onclick="Picker.openDate('demo-date')">
                  <div class="trigger-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <span class="trigger-value" id="demo-date-display">15/11/2026</span>
                  <input type="hidden" id="demo-date" value="2026-11-15">
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Horário do Alerta (Relógio Próprio)</label>
                <div class="korhaven-picker-trigger" onclick="Picker.openTime('demo-time')">
                  <div class="trigger-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  </div>
                  <span class="trigger-value" id="demo-time-display">09:00</span>
                  <input type="hidden" id="demo-time" value="09:00">
                </div>
              </div>
            </div>

            <!-- Preview em Tempo Real -->
            <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-4);">
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent); font-weight: 700; margin-bottom: 6px;">
                Preview da Notificação Agendada:
              </div>
              <div style="display: flex; align-items: center; gap: 8px; color: var(--text-primary); font-size: 0.95rem; font-weight: 600;">
                <span style="font-size: 1.2rem;">🔔</span>
                <span>Alerta agendado para: <span id="demo-preview-summary" style="color: var(--accent);">15/11/2026 às 09:00</span></span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-primary" onclick="Picker.closeDemo()" style="width: 100%; justify-content: center;">
              Fechar Demonstração
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(demoModal);
    }

    // Atualiza preview dinamicamente
    const updatePreview = () => {
      const d = document.getElementById('demo-date');
      const t = document.getElementById('demo-time');
      const sum = document.getElementById('demo-preview-summary');
      if (d && t && sum) {
        sum.textContent = `${Picker.formatDateDisplay(d.value)} às ${t.value}`;
      }
    };

    const dInput = document.getElementById('demo-date');
    const tInput = document.getElementById('demo-time');
    if (dInput) dInput.onchange = updatePreview;
    if (tInput) tInput.onchange = updatePreview;
    updatePreview();

    document.getElementById('picker-demo-modal').classList.add('active');
  },

  closeDemo() {
    const modal = document.getElementById('picker-demo-modal');
    if (modal) modal.classList.remove('active');
  }
};

// Inicialização automática
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Picker.init());
} else {
  Picker.init();
}


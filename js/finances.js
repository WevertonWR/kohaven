/* ============================================
   KORHAVEN — Finances Module
   ============================================ */

const Finances = {
  _view: 'overview', // overview, transactions, debts, savings

  render() {
    const transactions = Store.finances.getTransactions();
    const categories = Store.finances.getCategories();
    const savingGoals = Store.finances.getSavingGoals();
    const debts = Store.finances.getDebts();

    // Calculate totals for current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const monthTx = transactions.filter(t => t.date && t.date.startsWith(currentMonth));

    const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const balance = income - expenses;
    const totalDebt = debts.reduce((s, d) => s + (d.remaining || d.total || 0), 0);

    return `
      <div class="animate-fadeIn">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">Finanças</h1>
            <p class="page-subtitle">Controle total do seu dinheiro</p>
          </div>
          <div class="page-header-right">
            <div class="tabs">
              <div class="tab-item ${this._view === 'overview' ? 'active' : ''}" onclick="Finances.setView('overview')">Visão Geral</div>
              <div class="tab-item ${this._view === 'transactions' ? 'active' : ''}" onclick="Finances.setView('transactions')">Transações</div>
              <div class="tab-item ${this._view === 'savings' ? 'active' : ''}" onclick="Finances.setView('savings')">Metas</div>
            </div>
            <button class="btn btn-primary" onclick="Finances.openTxModal()">
              ${Utils.icon('plus')} Nova Transação
            </button>
          </div>
        </div>

        <!-- Stat Cards -->
        <div class="grid-4 stagger" style="margin-bottom: var(--space-8);">
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Receitas (mês)</div>
              <div class="stat-card-value" style="color:var(--success);">${Utils.formatCurrency(income)}</div>
            </div>
            <div class="stat-card-icon success">${Utils.icon('trendUp')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Despesas (mês)</div>
              <div class="stat-card-value" style="color:var(--danger);">${Utils.formatCurrency(expenses)}</div>
            </div>
            <div class="stat-card-icon danger">${Utils.icon('trendDown')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Saldo do Mês</div>
              <div class="stat-card-value" style="color:${balance >= 0 ? 'var(--success)' : 'var(--danger)'};">${Utils.formatCurrency(balance)}</div>
            </div>
            <div class="stat-card-icon accent">${Utils.icon('finances')}</div>
          </div>
          <div class="stat-card card-degrade-azul">
            <div class="stat-card-info">
              <div class="stat-card-label">Dívidas</div>
              <div class="stat-card-value">${Utils.formatCurrency(totalDebt)}</div>
            </div>
            <div class="stat-card-icon warning">${Utils.icon('shield')}</div>
          </div>
        </div>

        ${this._view === 'overview' ? this._renderOverview(transactions, monthTx, income, expenses, savingGoals) : ''}
        ${this._view === 'transactions' ? this._renderTransactions(transactions, categories) : ''}
        ${this._view === 'savings' ? this._renderSavings(savingGoals) : ''}
      </div>

      <!-- Transaction Modal -->
      <div class="modal-overlay" id="tx-modal">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Nova Transação</h3>
            <button class="modal-close" onclick="Finances.closeTxModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Tipo</label>
              <select class="form-input" id="tx-type">
                <option value="expense">💸 Despesa</option>
                <option value="income">💰 Receita</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Descrição</label>
              <input type="text" class="form-input" id="tx-name" placeholder="Ex: Almoço, Salário, Netflix...">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Valor (R$)</label>
                <input type="number" class="form-input" id="tx-amount" placeholder="0.00" step="0.01" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">Data</label>
                <input type="date" class="form-input" id="tx-date" value="${Utils.today()}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Categoria</label>
              <select class="form-input" id="tx-category">
                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Finances.closeTxModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Finances.saveTx()">Salvar</button>
          </div>
        </div>
      </div>

      <!-- Saving Goal Modal -->
      <div class="modal-overlay" id="saving-modal">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Meta de Poupança</h3>
            <button class="modal-close" onclick="Finances.closeSavingModal()">${Utils.icons.x}</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nome da Meta</label>
              <input type="text" class="form-input" id="saving-name" placeholder="Ex: Reserva de emergência, Viagem...">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Valor Alvo (R$)</label>
                <input type="number" class="form-input" id="saving-target" placeholder="0.00" step="0.01" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">Valor Atual (R$)</label>
                <input type="number" class="form-input" id="saving-current" placeholder="0.00" step="0.01" min="0">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Finances.closeSavingModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="Finances.saveSaving()">Salvar</button>
          </div>
        </div>
      </div>
    `;
  },

  afterRender() {
    if (this._view === 'overview') {
      this._renderExpenseChart();
      this._renderCashFlowChart();
    }
  },

  _renderOverview(allTx, monthTx, income, expenses, savingGoals) {
    // Category breakdown for this month
    const expenseTx = monthTx.filter(t => t.type === 'expense');
    const categoryTotals = {};
    expenseTx.forEach(t => {
      categoryTotals[t.category || 'Outros'] = (categoryTotals[t.category || 'Outros'] || 0) + t.amount;
    });

    return `
      <div class="grid-2" style="margin-bottom: var(--space-8);">
        <!-- Cash Flow Chart -->
        <div class="card card-degrade-escuro">
          <div class="card-header">
            <h3 class="card-title">Fluxo de Caixa</h3>
          </div>
          <div class="chart-container">
            <canvas id="finance-cashflow-chart"></canvas>
          </div>
        </div>
        <!-- Expense Breakdown -->
        <div class="card card-degrade-escuro">
          <div class="card-header">
            <h3 class="card-title">Despesas por Categoria</h3>
          </div>
          <div class="chart-container">
            <canvas id="finance-expense-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Recent + Savings -->
      <div class="grid-2-1">
        <!-- Recent Transactions -->
        <div class="card card-degrade-azul">
          <div class="card-header">
            <h3 class="card-title">Transações Recentes</h3>
            <span class="section-action" onclick="Finances.setView('transactions')">Ver todas →</span>
          </div>
          ${[...allTx].reverse().slice(0, 6).map(t => this._renderTxItem(t)).join('') || '<p class="text-muted" style="padding:var(--space-4);">Nenhuma transação registrada</p>'}
        </div>

        <!-- Saving Goals -->
        <div class="card card-degrade-azul">
          <div class="card-header">
            <h3 class="card-title">Metas de Poupança</h3>
            <button class="btn btn-sm btn-secondary" onclick="Finances.openSavingModal()">
              ${Utils.icon('plus')} Nova
            </button>
          </div>
          ${savingGoals.length > 0 ? savingGoals.map(g => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
            return `
              <div style="margin-bottom: var(--space-4);">
                <div class="progress-info">
                  <span class="progress-label">${g.name}</span>
                  <span class="progress-value">${pct}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-bar-fill" style="width: ${pct}%"></div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:4px;">
                  <span style="font-size:var(--font-xs);color:var(--text-muted);">${Utils.formatCurrency(g.current)}</span>
                  <span style="font-size:var(--font-xs);color:var(--text-muted);">${Utils.formatCurrency(g.target)}</span>
                </div>
              </div>
            `;
          }).join('') : '<p class="text-muted" style="padding:var(--space-4);">Nenhuma meta de poupança</p>'}
        </div>
      </div>
    `;
  },

  _renderTransactions(transactions, categories) {
    const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Todas as Transações</h3>
          <span class="badge badge-ghost">${transactions.length} registros</span>
        </div>
        <div class="transaction-list">
          ${sorted.length > 0 ? sorted.map(t => this._renderTxItem(t, true)).join('') :
            '<div class="empty-state"><img src="assets/finance_icon.jpg" class="empty-state-img" alt="Finance"><h3 class="empty-state-title">Nenhuma transação</h3></div>'}
        </div>
      </div>
    `;
  },

  _renderSavings(goals) {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Metas de Poupança</h3>
          <button class="btn btn-sm btn-primary" onclick="Finances.openSavingModal()">
            ${Utils.icon('plus')} Nova Meta
          </button>
        </div>
        ${goals.length > 0 ? `
          <div class="grid-2" style="margin-top:var(--space-4);">
            ${goals.map(g => {
              const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
              return `
                <div class="card card-sm" style="background:var(--bg-primary);">
                  <h4 style="font-size:var(--font-md);font-weight:var(--fw-semibold);margin-bottom:var(--space-3);">${g.name}</h4>
                  <div class="progress-info">
                    <span class="progress-label">${Utils.formatCurrency(g.current)} / ${Utils.formatCurrency(g.target)}</span>
                    <span class="progress-value">${pct}%</span>
                  </div>
                  <div class="progress-bar lg">
                    <div class="progress-bar-fill" style="width:${pct}%"></div>
                  </div>
                  <div style="margin-top:var(--space-3);display:flex;gap:var(--space-2);">
                    <button class="btn btn-sm btn-secondary" onclick="Finances.deleteSaving('${g.id}')">Excluir</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <img src="assets/target_icon.jpg" class="empty-state-img" alt="Target">
            <h3 class="empty-state-title">Nenhuma meta de poupança</h3>
            <p class="empty-state-text">Defina metas como reserva de emergência, viagem, ou investimentos.</p>
          </div>
        `}
      </div>
    `;
  },

  _renderTxItem(t, showDelete = false) {
    const catEmojis = { 'Moradia':'🏠', 'Alimentação':'🍔', 'Transporte':'🚗', 'Saúde':'💊', 'Educação':'📚', 'Lazer':'🎮', 'Assinaturas':'📺', 'Roupas':'👕', 'Fatura':'💳', 'Investimentos':'📈', 'Salário':'💼', 'Freelance':'💻', 'Outros':'📌' };
    return `
      <div class="transaction-item">
        <div class="transaction-icon">${catEmojis[t.category] || '📌'}</div>
        <div class="transaction-info">
          <div class="transaction-name">${t.name || 'Sem descrição'}</div>
          <div class="transaction-date">${Utils.formatDate(t.date)} • ${t.category || 'Outros'}</div>
        </div>
        <div class="transaction-amount ${t.type}">
          ${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}
        </div>
        ${showDelete ? `
          <button class="btn btn-icon btn-ghost sm" onclick="Finances.deleteTx('${t.id}')" style="opacity:0.5;">
            ${Utils.icons.trash}
          </button>
        ` : ''}
      </div>
    `;
  },

  setView(view) {
    this._view = view;
    App.renderCurrentPage();
  },

  openTxModal() {
    document.getElementById('tx-modal').classList.add('active');
  },

  closeTxModal() {
    document.getElementById('tx-modal').classList.remove('active');
  },

  saveTx() {
    const name = document.getElementById('tx-name').value.trim();
    const amount = parseFloat(document.getElementById('tx-amount').value);
    if (!name || !amount) { Utils.toast('Preencha todos os campos', 'warning'); return; }

    Store.finances.saveTransaction({
      name,
      amount,
      type: document.getElementById('tx-type').value,
      date: document.getElementById('tx-date').value,
      category: document.getElementById('tx-category').value
    });

    this.closeTxModal();
    Utils.toast('Transação registrada! 💸', 'success');
    App.renderCurrentPage();
  },

  deleteTx(id) {
    Utils.confirm('Excluir esta transação?', () => {
      Store.finances.deleteTransaction(id);
      Utils.toast('Transação removida', 'danger');
      App.renderCurrentPage();
    });
  },

  openSavingModal() {
    document.getElementById('saving-modal').classList.add('active');
  },

  closeSavingModal() {
    document.getElementById('saving-modal').classList.remove('active');
  },

  saveSaving() {
    const name = document.getElementById('saving-name').value.trim();
    const target = parseFloat(document.getElementById('saving-target').value);
    if (!name || !target) { Utils.toast('Preencha os campos', 'warning'); return; }

    Store.finances.saveSavingGoal({
      name,
      target,
      current: parseFloat(document.getElementById('saving-current').value) || 0
    });

    this.closeSavingModal();
    Utils.toast('Meta de poupança criada! 🎯', 'success');
    App.renderCurrentPage();
  },

  deleteSaving(id) {
    Utils.confirm('Excluir esta meta?', () => {
      const goals = Store.finances.getSavingGoals().filter(g => g.id !== id);
      localStorage.setItem('korhaven_saving_goals', JSON.stringify(goals));
      Utils.toast('Meta removida', 'danger');
      App.renderCurrentPage();
    });
  },

  _renderExpenseChart() {
    const canvas = document.getElementById('finance-expense-chart');
    if (!canvas) return;

    const transactions = Store.finances.getTransactions();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const monthExpenses = transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(currentMonth));

    const categoryTotals = {};
    monthExpenses.forEach(t => {
      categoryTotals[t.category || 'Outros'] = (categoryTotals[t.category || 'Outros'] || 0) + t.amount;
    });

    const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const sortedGroups = entries.map(([category, amount]) => ({ category, amount }));

    if (entries.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('Sem dados suficientes', canvas.width / 2, canvas.height / 2);
      return;
    }

    const ctx = canvas.getContext('2d');
    const blueGrad = ctx.createLinearGradient(0, 0, 0, 300);
    blueGrad.addColorStop(0, '#0077B6');
    blueGrad.addColorStop(1, '#00B4D8');

    const colors = [blueGrad, '#00B4D8', '#48CAE4', '#90E0EF', '#0077B6', '#023E8A', '#CAF0F8', '#0096C7', '#03045E', '#184E77'];

    if (window._finExpenseChart) window._finExpenseChart.destroy();
    
    const totalExpenses = monthExpenses.reduce((sum, t) => sum + t.amount, 0);

    const centerTextPlugin = {
      id: 'centerText',
      beforeDraw: function(chart) {
        const ctx = chart.ctx;
        ctx.restore();
        
        const meta = chart.getDatasetMeta(0);
        if (!meta.data || !meta.data.length) return;
        
        const centerX = meta.data[0].x;
        const centerY = meta.data[0].y;
        
        ctx.textBaseline = 'middle';
        
        const text = Utils.formatCurrency(totalExpenses);
        ctx.font = 'bold 16px Inter';
        ctx.fillStyle = '#CAF0F8';
        ctx.fillText(text, centerX - ctx.measureText(text).width / 2, centerY - 6);
        
        const subText = 'Total';
        ctx.font = '11px Inter';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(subText, centerX - ctx.measureText(subText).width / 2, centerY + 12);
        
        ctx.save();
      }
    };

    window._finExpenseChart = new Chart(canvas, {
      plugins: [centerTextPlugin],
      type: 'doughnut',
      data: {
        labels: sortedGroups.map(g => g.category),
        datasets: [{
          data: sortedGroups.map(g => g.amount),
          backgroundColor: colors.slice(0, sortedGroups.length),
          borderWidth: 2,
          borderColor: '#03045E',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#90E0EF', font: { family: 'Inter', size: 11 }, padding: 12, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: 'rgba(3, 4, 94, 0.95)',
            titleColor: '#CAF0F8', 
            bodyColor: '#90E0EF',
            borderColor: 'rgba(255,255,255,0.1)', 
            borderWidth: 1, 
            cornerRadius: 8, 
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: { label: (ctx) => `${ctx.label}: ${Utils.formatCurrency(ctx.parsed)}` }
          }
        }
      }
    });
  },

  _renderCashFlowChart() {
    const canvas = document.getElementById('finance-cashflow-chart');
    if (!canvas) return;

    const transactions = Store.finances.getTransactions();
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }

    const incomeData = months.map(m => transactions.filter(t => t.type === 'income' && t.date && t.date.startsWith(m)).reduce((s, t) => s + t.amount, 0));
    const expenseData = months.map(m => transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(m)).reduce((s, t) => s + t.amount, 0));
    const labels = months.map(m => Utils.months[parseInt(m.split('-')[1]) - 1]);

    const ctx = canvas.getContext('2d');
    
    // Create rich gradients
    const incomeGrad = ctx.createLinearGradient(0, 0, 0, 300);
    incomeGrad.addColorStop(0, '#00B4D8');
    incomeGrad.addColorStop(1, 'rgba(0, 119, 182, 0.2)');

    const expenseGrad = ctx.createLinearGradient(0, 0, 0, 300);
    expenseGrad.addColorStop(0, '#0077B6');
    expenseGrad.addColorStop(1, 'rgba(0, 119, 182, 0.2)');

    if (window._finCashFlowChart) window._finCashFlowChart.destroy();
    window._finCashFlowChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Receitas',
            data: incomeData,
            backgroundColor: incomeGrad,
            hoverBackgroundColor: '#0077B6',
            borderColor: '#90E0EF',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          },
          {
            label: 'Despesas',
            data: expenseData,
            backgroundColor: expenseGrad,
            hoverBackgroundColor: '#023E8A',
            borderColor: '#CAF0F8',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.8
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
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(3, 4, 94, 0.95)',
            titleColor: '#CAF0F8', 
            bodyColor: '#90E0EF',
            borderColor: 'rgba(255,255,255,0.1)', 
            borderWidth: 1, 
            cornerRadius: 8, 
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Utils.formatCurrency(ctx.parsed.y)}` }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: 'rgba(255, 255, 255, 0.9)', font: { family: 'Inter' } } 
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(144, 224, 239, 0.05)',
              drawBorder: false
            },
            ticks: { color: 'rgba(255, 255, 255, 0.9)', font: { family: 'Inter' }, callback: v => 'R$' + v, padding: 10 },
            border: { display: false }
          }
        }
      }
    });
  }
};

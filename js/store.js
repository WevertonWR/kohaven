/* ============================================
   KORHAVEN — Data Store (localStorage)
   Structured for future database migration
   ============================================ */

const Store = {
  // ---- Core Helpers ----
  _get(key) {
    try {
      const data = localStorage.getItem(`korhaven_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Store._get error for ${key}:`, e);
      return null;
    }
  },

  _set(key, value) {
    try {
      localStorage.setItem(`korhaven_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error(`Store._set error for ${key}:`, e);
    }
  },

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  // ============================================
  // AUTHENTICATION
  // ============================================
  auth: {
    isSetup() {
      return !!Store._get('auth_pass');
    },
    
    // Using simple base64 for local obfuscation (not real security, since data is local anyway)
    _hash(str) {
      return btoa(unescape(encodeURIComponent(str)));
    },
    
    setCredentials(email, password) {
      Store._set('auth_email', email);
      Store._set('auth_pass', this._hash(password));
    },
    
    verifyCredentials(email, password) {
      const savedEmail = Store._get('auth_email');
      const savedPass = Store._get('auth_pass');
      
      // Se não havia email salvo (conta criada na versão anterior), aceitamos apenas a senha
      // e salvamos o email agora para os próximos acessos.
      if (!savedEmail && savedPass === this._hash(password)) {
        if (email) Store._set('auth_email', email);
        return true;
      }
      
      return savedEmail === email && savedPass === this._hash(password);
    }
  },

  // ============================================
  // ACHIEVEMENTS
  // ============================================
  achievements: {
    getAll() {
      return Store._get('achievements') || [];
    },

    get(id) {
      return this.getAll().find(a => a.id === id);
    },

    save(achievement) {
      const all = this.getAll();
      if (achievement.id) {
        const idx = all.findIndex(a => a.id === achievement.id);
        if (idx !== -1) {
          all[idx] = { ...all[idx], ...achievement, updatedAt: new Date().toISOString() };
        }
      } else {
        achievement.id = Store._generateId();
        achievement.createdAt = new Date().toISOString();
        achievement.updatedAt = new Date().toISOString();
        all.push(achievement);
      }
      Store._set('achievements', all);
      return achievement;
    },

    delete(id) {
      const all = this.getAll().filter(a => a.id !== id);
      Store._set('achievements', all);
    },

    addTimeline(achievementId, entry) {
      const achievement = this.get(achievementId);
      if (!achievement) return;
      if (!achievement.timeline) achievement.timeline = [];
      entry.id = Store._generateId();
      entry.date = new Date().toISOString();
      achievement.timeline.push(entry);
      this.save(achievement);
    },

    resetCounter(id) {
      const achievement = this.get(id);
      if (!achievement) return;
      // Record relapse in timeline
      this.addTimeline(id, {
        type: 'relapse',
        previousStart: achievement.startDate,
        note: ''
      });
      // Also add restart entry
      achievement.startDate = new Date().toISOString();
      if (!achievement.relapses) achievement.relapses = 0;
      achievement.relapses++;
      this.save(achievement);
    }
  },

  // ============================================
  // TIMER / PRODUCTIVITY
  // ============================================
  timer: {
    getSessions() {
      return Store._get('timer_sessions') || [];
    },

    saveSession(session) {
      const sessions = this.getSessions();
      session.id = Store._generateId();
      session.createdAt = new Date().toISOString();
      sessions.push(session);
      Store._set('timer_sessions', sessions);
      return session;
    },

    deleteSession(id) {
      const sessions = this.getSessions().filter(s => s.id !== id);
      Store._set('timer_sessions', sessions);
    },

    getCategories() {
      return Store._get('timer_categories') || [
        'Trabalho', 'Estudo', 'Projeto', 'Freelance', 'Leitura', 'Exercício', 'Outro'
      ];
    },

    saveCategories(categories) {
      Store._set('timer_categories', categories);
    },

    getStats() {
      const sessions = this.getSessions();
      const now = new Date();
      const today = Utils.today();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const todaySessions = sessions.filter(s => s.date === today);
      const weekSessions = sessions.filter(s => new Date(s.date) >= weekStart);
      const monthSessions = sessions.filter(s => new Date(s.date) >= monthStart);

      const totalMs = (arr) => arr.reduce((sum, s) => sum + (s.duration || 0), 0);

      // Best day
      const dayTotals = {};
      sessions.forEach(s => {
        dayTotals[s.date] = (dayTotals[s.date] || 0) + (s.duration || 0);
      });
      const bestDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];

      // Longest session
      const longestSession = sessions.reduce((max, s) => (s.duration || 0) > (max.duration || 0) ? s : max, { duration: 0 });

      // Category totals
      const categoryTotals = {};
      sessions.forEach(s => {
        const cat = s.category || 'Outro';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (s.duration || 0);
      });

      return {
        today: totalMs(todaySessions),
        week: totalMs(weekSessions),
        month: totalMs(monthSessions),
        total: totalMs(sessions),
        totalSessions: sessions.length,
        bestDay: bestDay ? { date: bestDay[0], duration: bestDay[1] } : null,
        longestSession,
        categoryTotals,
        avgDay: sessions.length > 0 ? totalMs(sessions) / Math.max(Object.keys(dayTotals).length, 1) : 0
      };
    }
  },

  // ============================================
  // QUOTES
  // ============================================
  quotes: {
    getAll() {
      return Store._get('quotes') || [];
    },

    save(quote) {
      const all = this.getAll();
      if (quote.id) {
        const idx = all.findIndex(q => q.id === quote.id);
        if (idx !== -1) all[idx] = { ...all[idx], ...quote };
      } else {
        quote.id = Store._generateId();
        quote.createdAt = new Date().toISOString();
        all.push(quote);
      }
      Store._set('quotes', all);
      return quote;
    },

    delete(id) {
      Store._set('quotes', this.getAll().filter(q => q.id !== id));
    },

    toggleFavorite(id) {
      const quote = this.getAll().find(q => q.id === id);
      if (quote) {
        quote.favorite = !quote.favorite;
        this.save(quote);
      }
      return quote;
    },

    getQuoteOfDay() {
      // Kept for legacy compatibility if needed elsewhere
      return this.getRandomQuote();
    },

    getRandomQuote() {
      const all = this.getAll();
      if (all.length === 0) return null;
      const idx = Math.floor(Math.random() * all.length);
      return all[idx];
    },

    getPinned() {
      return Store._get('pinned_quote') || null;
    },

    setPinned(id) {
      Store._set('pinned_quote', id);
    }
  },

  // ============================================
  // HABITS
  // ============================================
  habits: {
    getAll() {
      return Store._get('habits') || [];
    },

    save(habit) {
      const all = this.getAll();
      if (habit.id) {
        const idx = all.findIndex(h => h.id === habit.id);
        if (idx !== -1) all[idx] = { ...all[idx], ...habit };
      } else {
        habit.id = Store._generateId();
        habit.createdAt = new Date().toISOString();
        habit.checks = {};
        all.push(habit);
      }
      Store._set('habits', all);
      return habit;
    },

    delete(id) {
      Store._set('habits', this.getAll().filter(h => h.id !== id));
    },

    toggleCheck(habitId, date, skipSession = false) {
      const all = this.getAll();
      const habit = all.find(h => h.id === habitId);
      if (!habit) return;
      if (!habit.checks) habit.checks = {};
      
      const isChecking = !habit.checks[date];
      
      if (isChecking) {
        if (habit.type === 'time' && habit.durationTarget && !skipSession) {
          const session = Store.timer.saveSession({
            date: date,
            startTime: 'Automático',
            endTime: 'Automático',
            duration: habit.durationTarget * 60000,
            name: habit.name,
            category: habit.category || 'Outro'
          });
          habit.checks[date] = session.id;
        } else {
          habit.checks[date] = true;
        }
      } else {
        if (habit.type === 'time' && typeof habit.checks[date] === 'string' && !skipSession) {
          Store.timer.deleteSession(habit.checks[date]);
        }
        delete habit.checks[date];
      }
      
      Store._set('habits', all);
      return habit;
    },

    getStreak(habitId) {
      const habit = this.getAll().find(h => h.id === habitId);
      if (!habit || !habit.checks) return 0;
      
      if (habit.frequency === 'weekly' || habit.frequency === 'monthly') {
        // For weekly/monthly, display total completions as streak for simplicity
        return Object.keys(habit.checks).filter(k => habit.checks[k]).length;
      }

      let streak = 0;
      const d = new Date();
      
      for(let i = 0; i < 365; i++) { // Check up to a year back
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const key = `${year}-${month}-${day}`;
        const dayOfWeek = d.getDay();
        
        let isScheduled = true;
        if (habit.frequency === 'specific' && Array.isArray(habit.specificDays)) {
          isScheduled = habit.specificDays.includes(dayOfWeek);
        }
        
        if (isScheduled) {
          if (habit.checks[key]) {
            streak++;
          } else {
            // Allow 0 for today, break if missed past days
            if (i > 0 || (i === 0 && !habit.checks[key] && d.getHours() > 23)) {
               break;
            }
          }
        }
        d.setDate(d.getDate() - 1);
      }
      
      return streak;
    }
  },

  // ============================================
  // FINANCES
  // ============================================
  finances: {
    getTransactions() {
      return Store._get('transactions') || [];
    },

    saveTransaction(tx) {
      const all = this.getTransactions();
      if (tx.id) {
        const idx = all.findIndex(t => t.id === tx.id);
        if (idx !== -1) all[idx] = { ...all[idx], ...tx };
      } else {
        tx.id = Store._generateId();
        tx.createdAt = new Date().toISOString();
        all.push(tx);
      }
      Store._set('transactions', all);
      return tx;
    },

    deleteTransaction(id) {
      Store._set('transactions', this.getTransactions().filter(t => t.id !== id));
    },

    getSavingGoals() {
      return Store._get('saving_goals') || [];
    },

    saveSavingGoal(goal) {
      const all = this.getSavingGoals();
      if (goal.id) {
        const idx = all.findIndex(g => g.id === goal.id);
        if (idx !== -1) all[idx] = { ...all[idx], ...goal };
      } else {
        goal.id = Store._generateId();
        all.push(goal);
      }
      Store._set('saving_goals', all);
      return goal;
    },

    getDebts() {
      return Store._get('debts') || [];
    },

    saveDebt(debt) {
      const all = this.getDebts();
      if (debt.id) {
        const idx = all.findIndex(d => d.id === debt.id);
        if (idx !== -1) all[idx] = { ...all[idx], ...debt };
      } else {
        debt.id = Store._generateId();
        all.push(debt);
      }
      Store._set('debts', all);
      return debt;
    },

    getCategories() {
      return Store._get('finance_categories') || [
        'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação',
        'Lazer', 'Assinaturas', 'Roupas', 'Fatura', 'Investimentos', 'Salário', 'Freelance', 'Outros'
      ];
    }
  },

  // ============================================
  // GOALS
  // ============================================
  goals: {
    getAll() {
      return Store._get('goals') || [];
    },

    save(goal) {
      const all = this.getAll();
      if (goal.id) {
        const idx = all.findIndex(g => g.id === goal.id);
        if (idx !== -1) all[idx] = { ...all[idx], ...goal };
      } else {
        goal.id = Store._generateId();
        goal.createdAt = new Date().toISOString();
        goal.milestones = goal.milestones || [];
        all.push(goal);
      }
      Store._set('goals', all);
      return goal;
    },

    delete(id) {
      Store._set('goals', this.getAll().filter(g => g.id !== id));
    },

    toggleMilestone(goalId, milestoneIdx) {
      const all = this.getAll();
      const goal = all.find(g => g.id === goalId);
      if (goal && goal.milestones[milestoneIdx] !== undefined) {
        goal.milestones[milestoneIdx].done = !goal.milestones[milestoneIdx].done;
        // Recalculate progress
        const done = goal.milestones.filter(m => m.done).length;
        goal.progress = Math.round((done / goal.milestones.length) * 100);
        Store._set('goals', all);
      }
      return goal;
    },

    evaluateSmartMilestones() {
      const all = this.getAll();
      let changed = false;
      
      const txs = Store.finances ? Store.finances.getTransactions() : [];
      const monthly = {};
      
      txs.forEach(t => {
        if (!t.date) return;
        const month = t.date.substring(0, 7); // YYYY-MM
        if (!monthly[month]) monthly[month] = { income: 0, expense: 0 };
        if (t.type === 'income') monthly[month].income += (t.amount || 0);
        if (t.type === 'expense') monthly[month].expense += (t.amount || 0);
      });
      
      // Sort months descending (newest first)
      const sortedMonths = Object.keys(monthly).sort().reverse();
      
      all.forEach(goal => {
        if (!goal.milestones || goal.milestones.length === 0) return;
        let goalChanged = false;
        
        goal.milestones.forEach(m => {
          if (m.type !== 'smart' || m.done) return;
          
          if (m.metric === 'finance_profit' || m.metric === 'finance_income') {
            const target = m.target || 0;
            const streakTarget = m.streak || 1;
            
            let maxStreak = 0;
            let currentStreak = 0;
            
            // Check consecutive months
            for (let i = 0; i < sortedMonths.length; i++) {
              const val = m.metric === 'finance_profit' 
                ? (monthly[sortedMonths[i]].income - monthly[sortedMonths[i]].expense)
                : monthly[sortedMonths[i]].income;
                
              if (val >= target) {
                currentStreak++;
                if (currentStreak > maxStreak) maxStreak = currentStreak;
              } else {
                currentStreak = 0;
              }
            }
            
            if (maxStreak >= streakTarget) {
              m.done = true;
              goalChanged = true;
              changed = true;
            }
          }
        });
        
        if (goalChanged) {
          const doneCount = goal.milestones.filter(m => m.done).length;
          goal.progress = Math.round((doneCount / goal.milestones.length) * 100);
        }
      });
      
      if (changed) {
        Store._set('goals', all);
      }
    }
  },

  // ============================================
  // JOURNAL / EVOLUTION
  // ============================================
  journal: {
    getAll() {
      return Store._get('journal') || [];
    },

    save(entry) {
      const all = this.getAll();
      if (entry.id) {
        const idx = all.findIndex(e => e.id === entry.id);
        if (idx !== -1) all[idx] = { ...all[idx], ...entry };
      } else {
        entry.id = Store._generateId();
        entry.createdAt = new Date().toISOString();
        all.push(entry);
      }
      Store._set('journal', all);
      return entry;
    },

    delete(id) {
      Store._set('journal', this.getAll().filter(e => e.id !== id));
    },

    getMoodHistory() {
      return this.getAll()
        .filter(e => e.mood)
        .map(e => ({ date: e.date || e.createdAt.split('T')[0], mood: e.mood, energy: e.energy, stress: e.stress }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
  },

  // ============================================
  // MEDIA (Watchlist/Library)
  // ============================================
  media: {
    getCategories() {
      return Store._get('media_categories') || [
        { id: 'to_watch', label: 'Para Assistir / Ler' },
        { id: 'watching', label: 'Em Progresso' },
        { id: 'finished', label: 'Concluídos' },
        { id: 'library', label: 'Biblioteca' }
      ];
    },

    saveCategories(categories) {
      Store._set('media_categories', categories);
    },

    getAll() {
      return Store._get('media') || [];
    },

    save(item) {
      const all = this.getAll();
      if (item.id) {
        const idx = all.findIndex(m => m.id === item.id);
        if (idx !== -1) all[idx] = { ...all[idx], ...item };
      } else {
        item.id = Store._generateId();
        item.createdAt = new Date().toISOString();
        if (!item.status) item.status = 'to_watch'; // to_watch, watching, finished
        all.push(item);
      }
      Store._set('media', all);
      return item;
    },

    delete(id) {
      Store._set('media', this.getAll().filter(m => m.id !== id));
    },

    toggleStatus(id, newStatus) {
      const item = this.getAll().find(m => m.id === id);
      if (item) {
        item.status = newStatus;
        this.save(item);
      }
      return item;
    }
  },

  // ============================================
  // NOTES (Anotações)
  // ============================================
  notes: {
    getAll() {
      return Store._get('notes') || [];
    },

    save(note) {
      const all = this.getAll();
      if (note.id) {
        const idx = all.findIndex(n => n.id === note.id);
        if (idx !== -1) all[idx] = { ...all[idx], ...note, updatedAt: new Date().toISOString() };
      } else {
        note.id = Store._generateId();
        note.createdAt = new Date().toISOString();
        note.updatedAt = note.createdAt;
        all.push(note);
      }
      Store._set('notes', all);
      return note;
    },

    delete(id) {
      Store._set('notes', this.getAll().filter(n => n.id !== id));
    },
    
    getCategories() {
      return Store._get('notes_categories') || ['Ofertas FB Ads', 'Geral', 'Ideias', 'Referências'];
    },
    
    saveCategories(categories) {
      Store._set('notes_categories', categories);
    }
  },

  // ============================================
  // SETTINGS
  // ============================================
  settings: {
    get() {
      return Store._get('settings') || {
        userName: 'Usuário',
        theme: 'dark',
        language: 'pt-BR',
        currency: 'BRL',
        currencySymbol: 'R$'
      };
    },

    save(settings) {
      Store._set('settings', { ...this.get(), ...settings });
    }
  },

  // ============================================
  // BACKUP / EXPORT
  // ============================================
  exportAll() {
    const keys = [
      'auth_email', 'auth_pass', 'achievements', 'timer_sessions', 'timer_categories',
      'quotes', 'pinned_quote', 'habits', 'transactions',
      'saving_goals', 'debts', 'finance_categories', 'goals',
      'journal', 'settings', 'media', 'notes', 'notes_categories'
    ];
    const data = {};
    keys.forEach(key => {
      const val = Store._get(key);
      if (val !== null) data[key] = val;
    });
    data._exportDate = new Date().toISOString();
    data._version = '1.0.0';
    return data;
  },

  importAll(data) {
    if (!data || typeof data !== 'object') return false;
    Object.keys(data).forEach(key => {
      if (key.startsWith('_')) return;
      Store._set(key, data[key]);
    });
    return true;
  },

  downloadBackup() {
    const data = this.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `korhaven_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

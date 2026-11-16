/* ============================================
   KORHAVEN — HAVEN: Assistente Inteligente Pessoal
   Reconhecimento de Voz · Memória Persistente
   Resumos Diários · Resolução de Problemas
   ============================================ */

const Haven = {
  // Estado do Assistente
  _isListening: false,
  _recognition: null,
  _currentTranscript: '',
  _chatHistory: [],
  _isProcessing: false,

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  render() {
    const memories = Store.haven.getMemories();

    return `
      <div class="haven-shell">
        <!-- Barra Superior Minimalista -->
        <div class="haven-topbar">
          <div class="haven-topbar-brand">
            <span class="haven-logo-pulse" style="width: 12px; height: 12px;"></span>
            <span class="haven-topbar-title">Haven</span>
            <span class="haven-badge-ai">AI</span>
          </div>
          <div class="haven-topbar-actions">
            <span class="haven-ai-status ${HavenAI.isReady() ? 'on' : 'off'}" id="haven-ai-status" onclick="Haven.openAISettings()" title="Status da IA">
              ${HavenAI.statusLabel()}
            </span>
            <button class="haven-top-btn" onclick="Haven.openVoiceSettings()" title="Configurar Voz">🎙️</button>
            <button class="haven-top-btn" onclick="Haven.openAISettings()" title="Configurar IA">⚙️</button>
            <button class="haven-top-btn" onclick="Haven.openMemories()" title="Memórias">🧠 ${memories.length}</button>
            <button class="haven-top-btn" onclick="Haven.clearChat()" title="Limpar conversa">↺</button>
          </div>
        </div>

        <!-- Palco Central do Agente (Orbe 3D / Onda de Voz) -->
        <div class="haven-voice-stage" id="haven-voice-stage" data-state="idle">
          <div class="haven-stage-glow"></div>

          <div class="haven-agent-visual">
            <canvas id="haven-orb-canvas" class="haven-orb-canvas" onclick="Haven.toggleVoice()" title="Toque para falar"></canvas>

            <!-- Onda Azul de Voz (Ativa quando o agente está falando) -->
            <div class="haven-wave-wrap" id="haven-wave-wrap" onclick="Haven.stopSpeaking()" title="Toque para silenciar">
              <canvas id="haven-wave-canvas" class="haven-wave-canvas"></canvas>
            </div>
          </div>

          <div class="haven-orb-state" id="haven-orb-state">
            <span class="haven-orb-dot"></span>
            <span id="haven-orb-state-text">Toque no microfone para falar</span>
          </div>
        </div>

        <!-- Chat Simples Abaixo do Agente -->
        <div class="haven-chat-stream" id="haven-chat-messages">
          ${this._renderChatMessages()}
        </div>

        <!-- Microfone Acima da Caixinha de Resposta (Ergonômico no Celular) -->
        <div class="haven-mic-dock">
          <button type="button" class="haven-mic-orb ${this._isListening ? 'is-listening' : ''}" id="haven-mic-orb" onclick="Haven.toggleVoice()" title="Toque para falar">
            <span class="haven-mic-aura"></span>
            <span class="haven-mic-ring"></span>
            <span class="haven-mic-core">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
              </svg>
            </span>
          </button>
        </div>

        <!-- Barra de Texto Minimalista (Efeito Vidro) -->
        <div class="haven-simple-input-bar">
          <div class="haven-quick-actions" style="margin-top: 0; margin-bottom: 10px;">
            <button class="haven-quick-chip" onclick="Haven.quickAction('resumo')">📋 Resumo</button>
            <button class="haven-quick-chip" onclick="Haven.quickAction('planejar')">🧠 Planejar Dia</button>
            <button class="haven-quick-chip" onclick="Haven.quickAction('financas')">💰 Finanças</button>
            <button class="haven-quick-chip" onclick="Haven.quickAction('habitos')">🔥 Hábitos</button>
            <button class="haven-quick-chip" onclick="Haven.quickAction('metas')">🎯 Metas</button>
          </div>
          <div class="haven-input-wrapper">
            <div class="haven-text-input-wrap">
              <textarea class="haven-text-input" 
                        id="haven-text-input" 
                        placeholder="Digite uma mensagem para o Haven..."
                        rows="1"
                        onkeydown="Haven.handleInputKeydown(event)"
                        oninput="Haven.autoResizeInput()"></textarea>
            </div>
            <button class="haven-send-btn" onclick="Haven.sendMessage()" id="haven-send-btn" title="Enviar">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  afterRender() {
    HavenOrb.init('haven-orb-canvas', 'haven-wave-canvas');
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    }

    // Carregar histórico do chat
    this._chatHistory = Store.haven.getChatHistory();
    this._renderChatArea();
    this._scrollChatToBottom();

    // Mostrar mensagem de boas-vindas se é a primeira vez
    if (this._chatHistory.length === 0) {
      this._addBotMessage(this._getWelcomeMessage());
    }
  },

  // ============================================
  // CHAT INTELIGENTE
  // ============================================
  _renderChatMessages() {
    const history = Store.haven.getChatHistory();
    if (history.length === 0) {
      return `
        <div class="haven-welcome-message">
          <div class="haven-bot-avatar">
            <span class="haven-logo-pulse" style="width: 20px; height: 20px;"></span>
          </div>
          <div class="haven-chat-bubble haven-bubble-bot">
            ${this._getWelcomeMessage()}
          </div>
        </div>
      `;
    }

    return history.map((msg, idx) => {
      if (msg.role === 'user') {
        return `
          <div class="haven-chat-row haven-row-user">
            <div class="haven-chat-bubble haven-bubble-user">
              ${this._escapeHtml(msg.content)}
            </div>
          </div>
        `;
      } else {
        const isAI = msg.source === 'ai';
        return `
          <div class="haven-chat-row haven-row-bot">
            <div class="haven-bot-avatar">
              <span class="haven-logo-pulse" style="width: 16px; height: 16px;"></span>
            </div>
            <div class="haven-chat-bubble haven-bubble-bot">
              ${msg.content}
              <div class="haven-msg-meta">
                <span class="haven-src-badge ${isAI ? 'ai' : 'local'}">${isAI ? '✨ IA' : '⚡ Local'}</span>
                <button class="haven-speak-btn" onclick="Haven.speak(${idx})" title="Ouvir resposta">🔊</button>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');
  },

  _renderChatArea() {
    const chatEl = document.getElementById('haven-chat-messages');
    if (chatEl) {
      chatEl.innerHTML = this._renderChatMessages();
    }
  },

  _scrollChatToBottom() {
    const chatEl = document.getElementById('haven-chat-messages');
    if (chatEl) {
      setTimeout(() => {
        chatEl.scrollTop = chatEl.scrollHeight;
      }, 100);
    }
  },

  _addUserMessage(text) {
    const msg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    this._chatHistory.push(msg);
    Store.haven.saveChatHistory(this._chatHistory);
    this._renderChatArea();
    this._scrollChatToBottom();
  },

  _addBotMessage(html, source = 'local') {
    const msg = { role: 'bot', content: html, source, timestamp: new Date().toISOString() };
    this._chatHistory.push(msg);
    Store.haven.saveChatHistory(this._chatHistory);
    this._renderChatArea();
    this._scrollChatToBottom();
  },

  _showTypingIndicator() {
    const chatEl = document.getElementById('haven-chat-messages');
    if (!chatEl) return;
    const typingHtml = `
      <div class="haven-chat-row haven-row-bot" id="haven-typing-indicator">
        <div class="haven-bot-avatar">
          <span class="haven-logo-pulse" style="width: 16px; height: 16px;"></span>
        </div>
        <div class="haven-chat-bubble haven-bubble-bot haven-typing">
          <span class="haven-typing-dot"></span>
          <span class="haven-typing-dot"></span>
          <span class="haven-typing-dot"></span>
        </div>
      </div>
    `;
    chatEl.insertAdjacentHTML('beforeend', typingHtml);
    this._scrollChatToBottom();
  },

  _removeTypingIndicator() {
    const el = document.getElementById('haven-typing-indicator');
    if (el) el.remove();
  },

  // ============================================
  // ENVIO DE MENSAGEM
  // ============================================
  sendMessage(fromVoice = false) {
    this._unlockAudio();
    const input = document.getElementById('haven-text-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    this.autoResizeInput();

    this._addUserMessage(text);
    this._processMessage(text, fromVoice);
  },

  _sendVoiceTranscript(text) {
    const clean = (text || '').trim();
    if (!clean) return;
    this._addUserMessage(clean);
    this._processMessage(clean, true);
  },

  handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  },

  autoResizeInput() {
    const input = document.getElementById('haven-text-input');
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  },

  // ============================================
  // PROCESSAMENTO INTELIGENTE DA MENSAGEM
  // ============================================
  _processMessage(text, fromVoice = false) {
    if (this._isProcessing) return;
    this._isProcessing = true;
    this._showTypingIndicator();
    if (typeof HavenOrb !== 'undefined') HavenOrb.setState('thinking');

    const lower = this._norm(text);
    const intent = this._detectIntent(lower);

    const finish = (html, source) => {
      this._removeTypingIndicator();
      this._addBotMessage(html, source);
      this._isProcessing = false;
      this._refreshAIStatus();
      const voiceCfg = Store.haven.getVoiceConfig();
      if (fromVoice && voiceCfg.autoSpeak !== false && 'speechSynthesis' in window) {
        this.speak(this._chatHistory.length - 1);
      } else if (typeof HavenOrb !== 'undefined' && !this._isListening) {
        HavenOrb.setState('idle');
      }
    };

    // ---- Rota IA (só quando necessário) ----
    if (HavenAI.isReady() && this._needsAI(lower, intent)) {
      if (!HavenAI.canUse()) {
        finish(this._generateResponse(text) + this._aiNotice('Limite diário da IA atingido — respondi no modo local. Você pode ajustar o limite em ⚙️ Configurar IA.'), 'local');
        return;
      }
      HavenAI.ask(text, lower)
        .then(html => finish(html, 'ai'))
        .catch(err => {
          console.warn('[Haven IA]', err);
          finish(this._generateResponse(text) + this._aiNotice(HavenAI.friendlyError(err)), 'local');
        });
      return;
    }

    // ---- Rota local (grátis e instantânea) ----
    setTimeout(() => {
      let html = this._generateResponse(text);
      if (!HavenAI.isReady() && (intent === null || intent === 'advice')) {
        html += this._aiNotice('Para respostas mais inteligentes nesse tipo de pergunta, ative a IA em ⚙️ Configurar IA.');
      }
      finish(html, 'local');
    }, 450 + Math.random() * 350);
  },

  _aiNotice(msg) {
    return `<div class="haven-ai-notice">ℹ️ ${msg}</div>`;
  },

  _refreshAIStatus() {
    const el = document.getElementById('haven-ai-status');
    if (el) {
      el.className = `haven-ai-status ${HavenAI.isReady() ? 'on' : 'off'}`;
      el.innerHTML = HavenAI.statusLabel();
    }
  },

  // Decide se a pergunta deve ir para a IA
  _needsAI(lower, intent) {
    if (this._forceLocalOnce) {
      this._forceLocalOnce = false;
      return false;
    }
    return true;
  },

  _norm(str) {
    // Remove acentos preservando o tamanho da string (índices batem com o original)
    return String(str || '').toLowerCase().split('').map(c => {
      const base = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return base.length === 1 ? base : c;
    }).join('');
  },

  // ============================================
  // DETECÇÃO DE INTENÇÃO (local)
  // ============================================
  _detectIntent(lower) {
    // Ação financeira direta com valor (funciona até no modo local sem gastar cota)
    if (/(despesa|gasto|gastei|paguei|comprei|receita|ganhei|recebi|salario|pix|saldo)/.test(lower)) {
      if (/\d+/.test(lower) && /(salva|salvar|salve|coloca|lanca|lança|registra|adiciona|gastei|paguei|comprei|recebi|ganhei|despesa|receita)/.test(lower)) {
        return 'finance_action';
      }
      if (/(salva|salvar|salve|coloca|lanca|lança|registra|adiciona)/.test(lower)) {
        return 'finance_ask_amount';
      }
    }

    const isSaveCmd = this._matchesIntent(lower, ['salvar', 'salva ', 'salva:', 'guardar', 'guarda ', 'memorizar', 'anotar', 'anota ', 'anota:', 'lembre', 'lembrar de', 'lembrar que']);

    // Pergunta de recordação ("qual era a palavra que eu ouvi ontem?")
    if (!isSaveCmd && this._isRecallQuestion(lower)) return 'recall';

    // Compartilhando algo novo ("ouvi a palavra X hoje")
    if (!isSaveCmd && this._isWordShare(lower)) return 'word';

    if (isSaveCmd) return 'save';

    // Pedidos abertos / conselhos (melhor com IA)
    if (/(planej|organiz|conselho|sugest|dica|me ajud|como (eu )?(faco|posso|devo|melhor)|o que (eu )?devo|por que|explica|o que significa|o que e |priorid)/.test(lower)) return 'advice';

    if (this._matchesIntent(lower, ['resumo', 'resumir', 'panorama', 'visao geral', 'overview', 'o que tenho hoje', 'o que fazer', 'meu dia'])) return 'summary';
    if (this._matchesIntent(lower, ['tarefa', 'anotacao', 'anotacoes', 'nota', 'notas', 'pendente', 'pendencias'])) return 'tasks';
    if (this._matchesIntent(lower, ['financ', 'dinheiro', 'gasto', 'despesa', 'receita', 'saldo', 'quanto gastei', 'economia', 'divida'])) return 'finances';
    if (this._matchesIntent(lower, ['habito', 'rotina', 'streak', 'sequencia'])) return 'habits';
    if (this._matchesIntent(lower, ['meta', 'objetivo', 'progresso', 'andamento'])) return 'goals';
    if (this._matchesIntent(lower, ['conquista', 'achievement', 'nivel'])) return 'achievements';
    if (this._matchesIntent(lower, ['cronometro', 'pomodoro', 'foco', 'timer', 'tempo de estudo', 'produtividade'])) return 'timer';
    if (this._matchesIntent(lower, ['memoria', 'lembranc', 'o que salvei', 'o que anotei'])) return 'memories';
    if (this._matchesIntent(lower, ['buscar', 'procurar', 'encontrar', 'achar ', 'onde esta', 'cade '])) return 'search';
    if (/^\s*(oi|ola|hey|eai|e ai|bom dia|boa tarde|boa noite|fala haven|fala)\b/.test(lower)) return 'greeting';
    if (this._matchesIntent(lower, ['ajuda', 'help', 'o que voce faz', 'o que faz', 'funcionalidade', 'como funciona'])) return 'help';
    if (this._matchesIntent(lower, ['obrigado', 'valeu', 'thanks', 'brigado', 'agradeco'])) return 'thanks';
    return null;
  },

  _isRecallQuestion(lower) {
    return /(qual (era|foi|e) (a|o|aquel)|que eu (ouvi|falei|disse|salvei|anotei|guardei|te (falei|disse|contei|pedi))|o que eu (ouvi|falei|disse|salvei|anotei|guardei)|voce lembra|lembra (da|do|de|que|qual|o que)|esqueci|me lembra (qual|o que|da|do)|o que (te )?(falei|contei|disse))/.test(lower);
  },

  _isWordShare(lower) {
    return /(ouvi|aprendi|conheci|descobri|li|vi|escutei)\s+(hoje\s+|agora\s+)?(a|uma|essa|esta|o|um|esse|este)?\s*(palavra|termo|expressao|girias?|nome)/.test(lower)
      || /^(palavra|termo|expressao) (nova|do dia)\b/.test(lower);
  },

  _generateResponse(text) {
    const lower = this._norm(text);
    const userName = Store.settings.get().userName || 'Usuário';

    switch (this._detectIntent(lower)) {
      case 'finance_action': return this._handleFinanceAction(text, lower);
      case 'finance_ask_amount': return 'Qual o valor e a descrição? Ex: <em>"gastei 250 no mercado"</em> ou <em>"recebi 500 de freela"</em>.';
      case 'recall': return this._handleRecall(text, lower);
      case 'word': return this._handleWordShare(text);
      case 'save': return this._handleSaveIntent(text, lower);
      case 'summary': return this._handleDailySummary();
      case 'advice': return this._handleDailySummary();
      case 'tasks': return this._handleTasksQuery();
      case 'finances': return this._handleFinancesQuery();
      case 'habits': return this._handleHabitsQuery();
      case 'goals': return this._handleGoalsQuery();
      case 'achievements': return this._handleAchievementsQuery();
      case 'timer': return this._handleTimerQuery();
      case 'memories': return this._handleMemoriesQuery(lower);
      case 'search': return this._handleSearchIntent(text, lower);
      case 'greeting': return this._getGreeting(userName);
      case 'help': return this._getHelpMessage();
      case 'thanks': return `De nada, ${this._escapeHtml(userName)}! 😊 Estou sempre aqui pra te ajudar. Precisa de mais alguma coisa?`;
      default: return this._handleGenericMessage(text, userName);
    }
  },

  // ============================================
  // MEMÓRIA: GUARDAR PALAVRAS E RECORDAR
  // ============================================
  _handleFinanceAction(text, lower) {
    if (!Store.finances) return 'Módulo de Finanças indisponível.';
    const numMatch = text.match(/(\d+(?:[.,]\d{1,2})?)/);
    if (!numMatch) return 'Não encontrei o valor. Tente algo como: <em>"gastei 250 no mercado"</em>.';
    const amount = parseFloat(numMatch[1].replace(',', '.'));
    if (!amount || amount <= 0) return 'Valor inválido para lançamento.';

    const isIncome = /(receita|ganhei|recebi|salario|entrada)/.test(lower);
    const type = isIncome ? 'income' : 'expense';
    const desc = text
      .replace(/\b(ol[aá]|oi|haven|raven|eu|preciso|que|voc[eê]|voce|marque|salva|salvar|salve|coloca|coloque|lanca|lan[cç]a|lance|registra|registre|adiciona|adicione|gastei|paguei|comprei|recebi|ganhei|uma|um|de|no|na|meu|saldo|despesa|receita|por|favor)\b/gi, ' ')
      .replace(/R\$/gi, ' ')
      .replace(numMatch[0], ' ')
      .replace(/\s+/g, ' ')
      .trim() || (isIncome ? 'Receita' : 'Despesa');

    Store.finances.saveTransaction({
      type,
      amount,
      description: desc.slice(0, 60),
      category: 'Outros',
      date: Utils.today()
    });

    return isIncome
      ? `💰 Receita de <strong>R$ ${amount.toFixed(2)}</strong> (${this._escapeHtml(desc)}) adicionada ao seu saldo!`
      : `💸 Despesa de <strong>R$ ${amount.toFixed(2)}</strong> (${this._escapeHtml(desc)}) lançada em Finanças!`;
  },

  _handleWordShare(text) {
    const mem = Store.haven.addMemory({ content: text.trim(), category: 'word', source: 'word-share' });
    return `
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        <span style="font-size: 1.2rem;">🔤</span>
        <div>
          <strong>Guardei essa na memória!</strong>
          <div class="haven-memory-quote">"${this._escapeHtml(mem.content)}"</div>
          <span style="font-size: 0.78rem; color: var(--text-muted);">Salvo em ${this._formatMemoryDate(mem.createdAt)}. Se esquecer, é só perguntar algo como <em>"qual era a palavra que eu ouvi ${this._weekdayName(new Date())}?"</em></span>
        </div>
      </div>
    `;
  },

  // Interpreta expressões de tempo: hoje, ontem, semana passada, sexta, 12/11...
  _parseDateRange(lower) {
    const now = new Date();
    const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const endOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    const daysAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };

    if (/anteontem/.test(lower)) { const d = daysAgo(2); return { start: startOf(d), end: endOf(d), label: 'anteontem' }; }
    if (/ontem/.test(lower)) { const d = daysAgo(1); return { start: startOf(d), end: endOf(d), label: 'ontem' }; }
    if (/\bhoje\b/.test(lower)) return { start: startOf(now), end: endOf(now), label: 'hoje' };

    let m = lower.match(/(?:ha|faz)\s+(\d+)\s+dias?|(\d+)\s+dias?\s+atras/);
    if (m) { const n = parseInt(m[1] || m[2], 10); const d = daysAgo(n); return { start: startOf(daysAgo(n + 1)), end: endOf(daysAgo(Math.max(0, n - 1))), label: `há ~${n} dias` }; }

    if (/semana passada/.test(lower)) return { start: startOf(daysAgo(now.getDay() + 7)), end: endOf(daysAgo(now.getDay() + 1)), label: 'semana passada' };
    if (/(essa|esta|nessa|nesta) semana/.test(lower)) return { start: startOf(daysAgo(now.getDay())), end: endOf(now), label: 'esta semana' };
    if (/mes passado/.test(lower)) {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start: s, end: e, label: 'mês passado' };
    }
    if (/(esse|este|nesse|neste) mes/.test(lower)) return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOf(now), label: 'este mês' };

    m = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (m) {
      let y = m[3] ? parseInt(m[3], 10) : now.getFullYear();
      if (y < 100) y += 2000;
      const d = new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
      if (!isNaN(d.getTime())) return { start: startOf(d), end: endOf(d), label: `${m[1]}/${m[2]}` };
    }

    const weekdays = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    for (let i = 0; i < 7; i++) {
      if (new RegExp(`\\b${weekdays[i]}`).test(lower)) {
        let diff = (now.getDay() - i + 7) % 7;
        if (diff === 0) diff = 7; // "sexta" dita numa sexta = sexta passada
        const d = daysAgo(diff);
        return { start: startOf(d), end: endOf(d), label: `${weekdays[i]} (${d.getDate()}/${d.getMonth() + 1})` };
      }
    }
    return null;
  },

  // Palavras relevantes da pergunta (remove palavras de recordação/conectivos)
  _extractKeywords(lower) {
    const stop = new Set(('qual era foi que eu ouvi falei disse salvei anotei guardei voce lembra lembro esqueci aquela aquele aquilo palavra termo expressao ' +
      'hoje ontem anteontem semana passada mes esse essa este esta nessa nesta dias atras para sobre como uma umas uns com sem pelo pela ' +
      'domingo segunda terca quarta quinta sexta sabado coisa algo haven mim meu minha the das dos nas nos tinha tava estava contei pedi').split(' '));
    return lower.replace(/[^a-z0-9à-ú\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w));
  },

  // Seleciona memórias relevantes por data, categoria e palavras-chave
  _findRelevantMemories(lower) {
    const all = Store.haven.getMemories();
    const range = this._parseDateRange(lower);
    let pool = all;

    if (range) {
      pool = pool.filter(m => {
        const t = new Date(m.createdAt);
        return t >= range.start && t <= range.end;
      });
    }

    const askingWord = /(palavra|termo|expressao)/.test(lower);
    if (askingWord) {
      const words = pool.filter(m => m.category === 'word' || /(palavra|termo|expressao)/.test(this._norm(m.content)));
      if (words.length > 0) pool = words;
    }

    const keywords = this._extractKeywords(lower);
    if (keywords.length > 0) {
      const scored = pool.map(m => {
        const c = this._norm(m.content);
        return { m, score: keywords.reduce((s, k) => s + (c.includes(k) ? 1 : 0), 0) };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
      if (scored.length > 0) pool = scored.map(x => x.m);
    }

    return { results: pool, range, askingWord };
  },

  _handleRecall(text, lower) {
    const all = Store.haven.getMemories();
    if (all.length === 0) {
      return '🧠 Ainda não tenho nenhuma memória sua. Quando ouvir algo que queira lembrar, me diga, por exemplo: <em>"ouvi a palavra resiliência hoje"</em> ou <em>"salvar: ..."</em>.';
    }

    const { results, range } = this._findRelevantMemories(lower);
    if (results.length === 0) {
      return `🤔 Não encontrei nada${range ? ` de <strong>${range.label}</strong>` : ''} que combine com isso. Aqui estão as suas memórias mais recentes:<br><br>${this._renderMemoryList(all.slice(-5).reverse())}`;
    }

    const shown = results.slice(-8).reverse();
    return `
      <strong>🧠 Achei ${results.length === 1 ? 'isso' : `${results.length} memórias`}${range ? ` de ${range.label}` : ''}:</strong><br><br>
      ${this._renderMemoryList(shown)}
    `;
  },

  _renderMemoryList(list) {
    return list.map(m => `
      <div class="haven-recall-item">
        <span>${this._getMemoryIcon(m.category)}</span>
        <div>
          <div style="font-size: 0.88rem;">${this._escapeHtml(m.content)}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted);">${this._formatMemoryDate(m.createdAt)}</div>
        </div>
      </div>
    `).join('');
  },

  _formatMemoryDate(iso) {
    const d = new Date(iso);
    return `${this._weekdayName(d)}, ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  },

  _weekdayName(d) {
    return ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][d.getDay()];
  },

  // ============================================
  // VOZ: OUVIR RESPOSTA (voz natural e fluida)
  // ============================================
  _speechToken: 0,
  _sharedAudio: null,

  _unlockAudio() {
    try {
      if (!this._sharedAudio) {
        this._sharedAudio = new Audio();
        this._sharedAudio.setAttribute('playsinline', 'true');
      }
      // Desbloquear áudio no iOS/Safari dentro do toque do usuário
      this._sharedAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      const p = this._sharedAudio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          if (this._sharedAudio && this._sharedAudio.src.startsWith('data:audio/wav')) {
            this._sharedAudio.pause();
          }
        }).catch(() => {});
      }
    } catch (e) {}
  },

  _scoreVoice(v) {
    const name = (v.name || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    let score = 0;
    if (lang === 'pt-br') score += 40;
    else if (lang.startsWith('pt')) score += 20;
    else return -1;

    if (name.includes('natural') || name.includes('online')) score += 60;
    if (name.includes('google')) score += 45;
    if (name.includes('francisca') || name.includes('thalita') || name.includes('antonio')) score += 15;
    if (!v.localService) score += 10;
    return score;
  },

  _getPortugueseVoices() {
    if (!('speechSynthesis' in window)) return [];
    return speechSynthesis.getVoices()
      .map(v => ({ voice: v, score: this._scoreVoice(v) }))
      .filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.voice);
  },

  _pickBestVoice(preferredName = '') {
    const voices = this._getPortugueseVoices();
    if (!voices.length) return null;
    if (preferredName) {
      const exact = voices.find(v => v.name === preferredName);
      if (exact) return exact;
    }
    return voices[0];
  },

  _cleanTextForSpeech(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    tmp.querySelectorAll('button, .haven-msg-meta, .haven-ai-badge, .haven-ai-notice').forEach(el => el.remove());

    // Preservar pausas em quebras de bloco/lista
    tmp.querySelectorAll('br, p, li, div, h1, h2, h3, h4').forEach(el => {
      el.appendChild(document.createTextNode('. '));
    });

    let text = tmp.textContent || '';
    // Remover emojis e símbolos decorativos
    text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ');
    // Normalizar moeda e pontuação para leitura natural em PT-BR
    text = text
      .replace(/R\$\s*(\d+(?:\.\d{3})*)[.,]00\b/g, (_, n) => `${n.replace(/\./g, '')} reais`)
      .replace(/R\$\s*(\d+(?:\.\d{3})*)[.,](\d{2})\b/g, (_, n, c) => `${n.replace(/\./g, '')} reais e ${parseInt(c, 10)} centavos`)
      .replace(/R\$\s*(\d+(?:\.\d{3})*)\b/g, (_, n) => `${n.replace(/\./g, '')} reais`)
      .replace(/%/g, ' por cento')
      .replace(/[•|]+/g, ', ')
      .replace(/\s*—\s*/g, ', ')
      .replace(/\.{2,}/g, '.')
      .replace(/\s*([,.!?;:])\s*/g, '$1 ')
      .replace(/(?:\.\s*){2,}/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
    return text;
  },

  _splitSpeechChunks(text) {
    if (!text) return [];
    const rawSentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    for (const s of rawSentences) {
      const clean = s.trim();
      if (!clean) continue;
      if (clean.length <= 170) {
        chunks.push(clean);
      } else {
        // Quebrar frases longas nas vírgulas para fluidez sem cortes
        const parts = clean.split(/(?<=,)\s+/);
        let buf = '';
        for (const p of parts) {
          if ((buf + ' ' + p).trim().length > 170 && buf) {
            chunks.push(buf.trim());
            buf = p;
          } else {
            buf = (buf + ' ' + p).trim();
          }
        }
        if (buf) chunks.push(buf);
      }
    }
    return chunks;
  },

  _speakText(plain, overrideCfg = null) {
    if (!('speechSynthesis' in window)) {
      Utils.toast('Seu navegador não suporta leitura em voz alta.', 'error');
      return;
    }
    if (!plain) return;

    this._speechToken++;
    const token = this._speechToken;
    speechSynthesis.cancel();

    const cfg = overrideCfg || Store.haven.getVoiceConfig();
    const aiCfg = Store.haven.getAIConfig();
    const hasElevenKey = !!(cfg.elevenLabsKey && cfg.elevenLabsKey.trim().length > 10);
    const canUseGeminiVoice = !!(aiCfg.apiKey && aiCfg.apiKey.trim());

    const useEleven = (cfg.provider === 'elevenlabs' && hasElevenKey) ||
                      (cfg.provider === 'auto' && hasElevenKey);
    const useGemini = !useEleven && (
                      (cfg.provider === 'gemini' && canUseGeminiVoice) ||
                      (cfg.provider === 'auto' && HavenAI.isReady()));

    if (useEleven) {
      this._speakWithElevenLabs(plain, cfg, token).catch((err) => {
        console.warn('[Haven TTS ElevenLabs]', err);
        if (token === this._speechToken) {
          if (typeof Utils !== 'undefined') {
            Utils.toast(`ElevenLabs indisponível (${err?.message || 'verifique chave'}) — usando voz alternativa.`, 'warning');
          }
          if (canUseGeminiVoice && !(parseInt(localStorage.getItem('haven_tts_cooldown_until') || '0', 10) > Date.now())) {
            this._speakWithGemini(plain, cfg, token).catch(() => {
              if (token === this._speechToken) this._speakWithBrowser(plain, cfg, token);
            });
          } else {
            this._speakWithBrowser(plain, cfg, token);
          }
        }
      });
      return;
    }

    if (useGemini) {
      const cooldownUntil = parseInt(localStorage.getItem('haven_tts_cooldown_until') || '0', 10);
      if (cooldownUntil > Date.now()) {
        this._speakWithBrowser(plain, cfg, token);
        return;
      }
      this._speakWithGemini(plain, cfg, token).catch((err) => {
        console.warn('[Haven TTS Gemini]', err);
        if (token === this._speechToken) {
          if (typeof Utils !== 'undefined') {
            if (err && err.status === 429) {
              const until = parseInt(localStorage.getItem('haven_tts_cooldown_until') || '0', 10);
              const mins = Math.max(1, Math.round((until - Date.now()) / 60000));
              Utils.toast(`Cota grátis da voz neural esgotou. Volta em ~${mins} min — usando voz do iPhone.`, 'warning');
            } else {
              Utils.toast('Voz neural indisponível — usando voz do iPhone.', 'warning');
            }
          }
          this._speakWithBrowser(plain, cfg, token);
        }
      });
      return;
    }

    this._speakWithBrowser(plain, cfg, token);
  },

  async _speakWithElevenLabs(plain, cfg, token) {
    const apiKey = (cfg.elevenLabsKey || '').trim();
    if (!apiKey) throw new Error('NO_ELEVEN_KEY');
    const voiceId = (cfg.elevenLabsVoiceId || 'pNInz6obpgDQGcFmaJgB').trim();

    if (typeof HavenOrb !== 'undefined') HavenOrb.setState('thinking');

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: plain.slice(0, 1500),
        model_id: 'eleven_flash_v2_5',
        language_code: 'pt',
        voice_settings: {
          stability: 0.38,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true
        }
      })
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody?.detail?.message || errBody?.detail?.status || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    const costHeader = parseInt(res.headers.get('character-cost') || '0', 10);
    const usedCost = costHeader > 0 ? costHeader : Math.ceil(Math.min(plain.length, 1500) * 0.5);
    try {
      localStorage.setItem('haven_eleven_last_cost', String(usedCost));
    } catch (e) {}

    const blob = await res.blob();
    if (token !== this._speechToken) return;

    const audioUrl = URL.createObjectURL(blob);
    const audio = this._sharedAudio || new Audio();
    audio.setAttribute('playsinline', 'true');
    audio.src = audioUrl;
    audio.playbackRate = Math.min(1.4, Math.max(0.8, Number(cfg.rate) || 1.0));
    this._sharedAudio = audio;
    this._currentAudio = audio;

    audio.onplay = () => {
      if (token === this._speechToken && typeof HavenOrb !== 'undefined') {
        HavenOrb.setState('speaking');
      }
    };
    const cleanup = () => {
      URL.revokeObjectURL(audioUrl);
      if (this._currentAudio === audio) this._currentAudio = null;
      if (token === this._speechToken && typeof HavenOrb !== 'undefined' && !this._isListening) {
        HavenOrb.setState('idle');
      }
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;

    await audio.play();
  },

  _pcmToWavBlob(pcmBytes, sampleRate = 24000) {
    const buffer = new ArrayBuffer(44 + pcmBytes.length);
    const view = new DataView(buffer);
    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + pcmBytes.length, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);       // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);        // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true);        // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true);        // BlockAlign
    view.setUint16(34, 16, true);       // BitsPerSample
    writeStr(36, 'data');
    view.setUint32(40, pcmBytes.length, true);
    new Uint8Array(buffer, 44).set(pcmBytes);
    return new Blob([buffer], { type: 'audio/wav' });
  },

  async _speakWithGemini(plain, cfg, token) {
    const aiCfg = Store.haven.getAIConfig();
    const apiKey = (aiCfg.apiKey || '').trim();
    if (!apiKey) throw new Error('NO_KEY');

    if (typeof HavenOrb !== 'undefined') HavenOrb.setState('thinking');

    const url = `${HavenAI.API_BASE}/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: plain.slice(0, 1800) }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: cfg.geminiVoice || 'Charon'
              }
            }
          }
        }
      })
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const e = new Error(errBody?.error?.message || `HTTP ${res.status}`);
      e.status = res.status;
      if (res.status === 429) {
        const m = String(e.message).match(/retry in ([\d.]+)s/i);
        const waitSec = m ? Math.ceil(parseFloat(m[1])) : 3600;
        localStorage.setItem('haven_tts_cooldown_until', String(Date.now() + waitSec * 1000));
      }
      throw e;
    }
    const data = await res.json();
    if (token !== this._speechToken) return;

    const part = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
    if (!part) throw new Error('NO_AUDIO_DATA');

    const b64 = part.inlineData.data;
    const mime = (part.inlineData.mimeType || '').toLowerCase();
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    let blob;
    if (mime.includes('wav') || mime.includes('mpeg') || mime.includes('mp3') || mime.includes('ogg')) {
      blob = new Blob([bytes], { type: part.inlineData.mimeType });
    } else {
      const rateMatch = mime.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
      blob = this._pcmToWavBlob(bytes, sampleRate);
    }

    if (token !== this._speechToken) return;

    const audioUrl = URL.createObjectURL(blob);
    const audio = this._sharedAudio || new Audio();
    audio.setAttribute('playsinline', 'true');
    audio.src = audioUrl;
    audio.playbackRate = Math.min(1.4, Math.max(0.8, Number(cfg.rate) || 1.0));
    this._sharedAudio = audio;
    this._currentAudio = audio;

    audio.onplay = () => {
      if (token === this._speechToken && typeof HavenOrb !== 'undefined') {
        HavenOrb.setState('speaking');
      }
    };
    const cleanup = () => {
      URL.revokeObjectURL(audioUrl);
      if (this._currentAudio === audio) this._currentAudio = null;
      if (token === this._speechToken && typeof HavenOrb !== 'undefined' && !this._isListening) {
        HavenOrb.setState('idle');
      }
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;

    await audio.play();
  },

  _speakWithBrowser(plain, cfg, token) {
    if (!('speechSynthesis' in window)) {
      if (typeof HavenOrb !== 'undefined' && !this._isListening) HavenOrb.setState('idle');
      return;
    }
    const voice = this._pickBestVoice(cfg.voiceName);
    const chunks = this._splitSpeechChunks(plain);
    if (!chunks.length) return;

    const rate = Math.min(1.5, Math.max(0.7, Number(cfg.rate) || 1.05));
    const pitch = Math.min(1.3, Math.max(0.75, Number(cfg.pitch) || 1.02));

    let idx = 0;
    const speakNext = () => {
      if (token !== this._speechToken) return;
      if (idx >= chunks.length) {
        if (typeof HavenOrb !== 'undefined' && !this._isListening) HavenOrb.setState('idle');
        return;
      }

      const u = new SpeechSynthesisUtterance(chunks[idx]);
      u.lang = (voice && voice.lang) ? voice.lang : 'pt-BR';
      if (voice) u.voice = voice;
      u.rate = rate;
      u.pitch = pitch;

      u.onstart = () => {
        if (token === this._speechToken && typeof HavenOrb !== 'undefined') {
          HavenOrb.setState('speaking');
        }
      };
      u.onend = () => {
        if (token !== this._speechToken) return;
        idx++;
        speakNext();
      };
      u.onerror = () => {
        if (token === this._speechToken && typeof HavenOrb !== 'undefined' && !this._isListening) {
          HavenOrb.setState('idle');
        }
      };
      speechSynthesis.speak(u);
    };

    // No iOS Safari, chamar speak() imediatamente após cancel() descarta a fala — aguardar 65ms
    setTimeout(() => {
      if (token === this._speechToken) speakNext();
    }, 65);
  },

  speak(idx) {
    this._unlockAudio();
    const msg = this._chatHistory[idx];
    if (!msg) return;
    if ((this._currentAudio && !this._currentAudio.paused) ||
        ('speechSynthesis' in window && speechSynthesis.speaking)) {
      this.stopSpeaking();
      return;
    }
    const plain = this._cleanTextForSpeech(msg.content);
    this._speakText(plain);
  },

  stopSpeaking() {
    this._speechToken++;
    if (this._currentAudio) {
      try {
        this._currentAudio.pause();
        this._currentAudio.currentTime = 0;
      } catch (e) {}
      this._currentAudio = null;
    }
    if ('speechSynthesis' in window && (speechSynthesis.speaking || speechSynthesis.pending)) {
      speechSynthesis.cancel();
    }
    if (typeof HavenOrb !== 'undefined' && !this._isListening) HavenOrb.setState('idle');
  },

  _matchesIntent(text, keywords) {
    return keywords.some(k => text.includes(k));
  },

  // ============================================
  // HANDLERS DE INTENÇÃO
  // ============================================
  _handleSaveIntent(originalText, normalizedText) {
    // Extrair a informação a ser salva (tudo após palavras-chave de save)
    const saveKeywords = ['salvar:', 'salva:', 'anotar:', 'anota:', 'guardar:', 'lembrar que ', 'lembrar de ', 'lembre-se que ', 'lembre-se de ', 'lembre que ', 'lembre de ', 'anota que ', 'guarda que ', 'salva que ', 'salvar ', 'guardar ', 'memorizar ', 'anotar ', 'anota ', 'salva ', 'guarda '];
    let infoToSave = originalText;

    for (const kw of saveKeywords) {
      const idx = normalizedText.indexOf(this._norm(kw));
      if (idx !== -1) {
        infoToSave = originalText.substring(idx + kw.length).replace(/^[:\-\s]+/, '').trim();
        break;
      }
    }

    if (infoToSave.length < 3) {
      return '🤔 O que exatamente você gostaria que eu salvasse? Me diga a informação e eu guardo na memória.';
    }

    // Detectar categoria automaticamente
    const category = this._detectCategory(normalizedText);

    // Salvar na memória
    Store.haven.addMemory({
      content: infoToSave,
      category: category,
      source: 'voice-chat'
    });

    const categoryLabel = this._getCategoryLabel(category);

    return `
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        <span style="font-size: 1.2rem;">💾</span>
        <div>
          <strong>Informação salva na memória!</strong><br>
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 12px; margin: 8px 0; font-size: 0.88rem; color: var(--text-secondary);">
            "${this._escapeHtml(infoToSave)}"
          </div>
          <span style="font-size: 0.78rem; color: var(--text-muted);">Categoria: <span style="color: var(--accent);">${categoryLabel}</span></span>
        </div>
      </div>
    `;
  },

  _handleDailySummary() {
    return `
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        <span style="font-size: 1.2rem;">📋</span>
        <div>
          <strong>Resumo Completo do Seu Dia</strong><br><br>
          ${this._generateDailySummary()}
        </div>
      </div>
    `;
  },

  _handleTasksQuery() {
    const notes = Store.notes ? Store.notes.getAll() : [];
    const activeNotes = notes.filter(n => !n.expired);
    const dailyNotes = activeNotes.filter(n => n.type === 'diaria');
    const fixaNotes = activeNotes.filter(n => n.type === 'fixa');

    if (activeNotes.length === 0) {
      return '📝 Você não tem anotações ativas no momento. Quer que eu crie uma? Me diga o que precisa anotar.';
    }

    let html = '<strong>📝 Suas Anotações Ativas:</strong><br><br>';

    if (dailyNotes.length > 0) {
      html += `<div style="margin-bottom: 10px;"><strong style="color: #fbbf24;">Diárias (${dailyNotes.length}):</strong></div>`;
      dailyNotes.forEach(n => {
        const importanceBadge = n.importance === 'super' ? '🔴' : n.importance === 'importante' ? '🟡' : '🟢';
        html += `<div style="padding: 4px 0; font-size: 0.88rem;">${importanceBadge} ${this._escapeHtml(n.title || 'Sem título')}</div>`;
      });
    }

    if (fixaNotes.length > 0) {
      html += `<div style="margin: 10px 0 6px;"><strong style="color: #8b5cf6;">Fixas (${fixaNotes.length}):</strong></div>`;
      fixaNotes.forEach(n => {
        html += `<div style="padding: 4px 0; font-size: 0.88rem;">📌 ${this._escapeHtml(n.title || 'Sem título')}</div>`;
      });
    }

    html += `<br><span style="font-size: 0.78rem; color: var(--text-muted);">Total: ${activeNotes.length} anotação(ões) ativa(s)</span>`;
    return html;
  },

  _handleFinancesQuery() {
    const transactions = Store.finances ? Store.finances.getTransactions() : [];
    const today = new Date();
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });

    const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const balance = income - expense;

    let html = `
      <strong>💰 Panorama Financeiro deste Mês:</strong><br><br>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px;">
        <div style="background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
          <div style="font-size: 0.7rem; color: #34d399; font-weight: 700;">RECEITAS</div>
          <div style="font-size: 1.1rem; font-weight: 800; color: #34d399;">R$ ${income.toFixed(2)}</div>
        </div>
        <div style="background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
          <div style="font-size: 0.7rem; color: #f87171; font-weight: 700;">DESPESAS</div>
          <div style="font-size: 1.1rem; font-weight: 800; color: #f87171;">R$ ${expense.toFixed(2)}</div>
        </div>
        <div style="background: rgba(0, 229, 255, 0.1); border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
          <div style="font-size: 0.7rem; color: var(--accent); font-weight: 700;">SALDO</div>
          <div style="font-size: 1.1rem; font-weight: 800; color: ${balance >= 0 ? '#34d399' : '#f87171'};">R$ ${balance.toFixed(2)}</div>
        </div>
      </div>
    `;

    if (expense > income && income > 0) {
      html += `<div style="background: rgba(248, 113, 113, 0.08); border: 1px solid rgba(248, 113, 113, 0.2); border-radius: 6px; padding: 8px; font-size: 0.82rem; color: #f87171;">⚠️ <strong>Atenção:</strong> Seus gastos estão maiores que suas receitas este mês. Recomendo revisar os gastos na seção de Finanças.</div>`;
    } else if (balance > 0) {
      html += `<div style="background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 6px; padding: 8px; font-size: 0.82rem; color: #34d399;">✅ Está indo bem! Você tem um saldo positivo este mês. Continue assim!</div>`;
    }

    return html;
  },

  _handleHabitsQuery() {
    const habits = Store.habits ? Store.habits.getAll() : [];
    if (habits.length === 0) {
      return '🔥 Você ainda não criou nenhum hábito. Vá até a seção de Hábitos para começar a rastrear sua rotina!';
    }

    const today = Utils.today();
    let completed = 0;
    let total = habits.length;

    habits.forEach(h => {
      if (h.checks && h.checks[today]) {
        completed++;
      }
    });

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    let html = `
      <strong>🔥 Status dos Hábitos de Hoje:</strong><br><br>
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 0.85rem; font-weight: 600;">${completed} de ${total} completados</span>
          <span style="font-size: 0.85rem; font-weight: 700; color: var(--accent);">${pct}%</span>
        </div>
        <div style="height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, var(--accent), #8b5cf6); border-radius: 4px; transition: width 0.5s;"></div>
        </div>
      </div>
    `;

    habits.forEach(h => {
      const done = !!(h.checks && h.checks[today]);
      const icon = done ? '✅' : '⬜';
      const streak = Store.habits.getStreak(h.id) || 0;
      html += `<div style="padding: 3px 0; font-size: 0.85rem;">${icon} ${this._escapeHtml(h.name)} ${streak > 0 ? `<span style="color: #fbbf24; font-size: 0.75rem;">(${streak}🔥)</span>` : ''}</div>`;
    });

    if (pct < 50) {
      html += `<br><div style="font-size: 0.82rem; color: #fbbf24;">💪 Ainda dá tempo de completar mais hábitos hoje! Não desista.</div>`;
    } else if (pct === 100) {
      html += `<br><div style="font-size: 0.82rem; color: #34d399;">🏆 Incrível! Todos os hábitos completados hoje! Parabéns!</div>`;
    }

    return html;
  },

  _handleGoalsQuery() {
    const goals = Store.goals ? Store.goals.getAll() : [];
    if (goals.length === 0) {
      return '🎯 Você não tem metas cadastradas. Crie suas metas na seção de Metas para eu poder acompanhar seu progresso!';
    }

    let html = '<strong>🎯 Suas Metas Ativas:</strong><br><br>';
    
    goals.forEach(g => {
      const progress = g.progress || 0;
      const statusIcon = progress >= 100 ? '✅' : progress >= 50 ? '🟡' : '🔴';
      html += `
        <div style="margin-bottom: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85rem; font-weight: 600;">${statusIcon} ${this._escapeHtml(g.title || g.name || 'Meta')}</span>
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent);">${progress}%</span>
          </div>
          <div style="height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; margin-top: 4px; overflow: hidden;">
            <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, var(--accent), #8b5cf6); border-radius: 2px;"></div>
          </div>
        </div>
      `;
    });

    return html;
  },

  _handleAchievementsQuery() {
    const achievements = Store.achievements ? Store.achievements.getAll() : [];
    if (achievements.length === 0) {
      return '🏆 Nenhuma conquista registrada ainda. Vá até Conquistas para começar a rastrear seus feitos!';
    }

    let html = `<strong>🏆 Suas Conquistas (${achievements.length}):</strong><br><br>`;
    const recent = achievements.slice(-5).reverse();
    recent.forEach(a => {
      const emoji = a.emoji || '🏆';
      html += `<div style="padding: 3px 0; font-size: 0.85rem;">${emoji} ${this._escapeHtml(a.name || a.title || 'Conquista')} <span style="color: var(--text-muted); font-size: 0.75rem;">(${a.currentStreak || a.days || 0} dias)</span></div>`;
    });

    if (achievements.length > 5) {
      html += `<br><span style="font-size: 0.78rem; color: var(--text-muted);">Mostrando as 5 mais recentes de ${achievements.length} total.</span>`;
    }

    return html;
  },

  _handleTimerQuery() {
    const sessions = Store.timer ? Store.timer.getSessions() : [];
    if (sessions.length === 0) {
      return '⏱️ Nenhuma sessão de foco registrada. Use o Cronômetro para rastrear seu tempo de estudo e produtividade!';
    }

    const today = Utils.today();
    const todaySessions = sessions.filter(s => s.date === today || (s.startTime && s.startTime.startsWith(today)));
    const todayMs = todaySessions.reduce((s, t) => s + (t.duration || 0), 0);

    const totalMs = sessions.reduce((s, t) => s + (t.duration || 0), 0);

    return `
      <strong>⏱️ Produtividade e Foco:</strong><br><br>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 0.7rem; color: var(--accent); font-weight: 700;">HOJE</div>
          <div style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary);">${Utils.formatDurationShort(todayMs) || '0m'}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted);">${todaySessions.length} sessão(ões)</div>
        </div>
        <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 0.7rem; color: #8b5cf6; font-weight: 700;">TOTAL</div>
          <div style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary);">${Utils.formatDurationShort(totalMs) || '0m'}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted);">${sessions.length} sessão(ões)</div>
        </div>
      </div>
    `;
  },

  _handleMemoriesQuery(normalizedText) {
    const memories = Store.haven.getMemories();
    if (memories.length === 0) {
      return '🧠 Sua memória está vazia. Me diga algo para eu guardar! Ex: <em>"Salvar: reunião com o João na terça às 14h"</em>';
    }

    let html = `<strong>🧠 Memórias Salvas (${memories.length}):</strong><br><br>`;

    const recent = memories.slice(-8).reverse();
    recent.forEach(m => {
      const icon = this._getMemoryIcon(m.category);
      html += `
        <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: flex-start; gap: 8px;">
          <span>${icon}</span>
          <div>
            <div style="font-size: 0.85rem;">${this._escapeHtml(m.content)}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${this._getCategoryLabel(m.category)} · ${this._timeAgo(m.createdAt)}</div>
          </div>
        </div>
      `;
    });

    if (memories.length > 8) {
      html += `<br><span style="font-size: 0.78rem; color: var(--text-muted);">Mostrando as 8 mais recentes. Clique em "Memórias" para ver todas.</span>`;
    }

    return html;
  },

  _handleSearchIntent(originalText, normalizedText) {
    const searchKeywords = ['buscar ', 'procurar ', 'encontrar ', 'achar ', 'onde esta ', 'cade '];
    let query = originalText;

    for (const kw of searchKeywords) {
      const idx = normalizedText.indexOf(kw);
      if (idx !== -1) {
        query = originalText.substring(idx + kw.length).trim();
        break;
      }
    }

    if (query.length < 2) {
      return '🔍 O que você gostaria de buscar? Me diga o que está procurando.';
    }

    // Buscar nas memórias
    const memories = Store.haven.getMemories();
    const qLower = query.toLowerCase();
    const found = memories.filter(m => m.content.toLowerCase().includes(qLower));

    if (found.length === 0) {
      return `🔍 Não encontrei nada sobre "<em>${this._escapeHtml(query)}</em>" nas suas memórias. Tente outra busca ou salve essa informação.`;
    }

    let html = `<strong>🔍 Encontrei ${found.length} resultado(s) para "${this._escapeHtml(query)}":</strong><br><br>`;
    found.slice(0, 5).forEach(m => {
      html += `
        <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="font-size: 0.85rem;">${this._getMemoryIcon(m.category)} ${this._escapeHtml(m.content)}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted);">${this._timeAgo(m.createdAt)}</div>
        </div>
      `;
    });

    return html;
  },

  _handleGenericMessage(text, userName) {
    // Se a mensagem parece uma informação importante, sugerir salvar
    if (text.length > 15) {
      this._pendingSave = text;
      return `
        Entendi, ${this._escapeHtml(userName)}. Gostaria que eu salvasse isso na sua memória? 
        <br><br>
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <button class="haven-inline-btn" onclick="Haven._saveFromChat()">💾 Salvar</button>
          <button class="haven-inline-btn secondary" onclick="Haven.quickAction('ajuda')">❓ O que posso fazer</button>
        </div>
      `;
    }

    return `
      Não tenho certeza do que você quer dizer, ${userName}. Posso te ajudar com:
      <br><br>
      • 📋 <strong>Resumo do dia</strong> — visão geral completa<br>
      • 💾 <strong>Salvar informação</strong> — guardar na memória<br>
      • 🔍 <strong>Buscar</strong> — encontrar nas memórias<br>
      • 💰 <strong>Finanças</strong> — panorama financeiro<br>
      • 🔥 <strong>Hábitos</strong> — status de hoje<br>
      • 🎯 <strong>Metas</strong> — progresso<br>
      <br>
      <span style="font-size: 0.82rem; color: var(--text-muted);">Tente dizer algo como: "Resumo do dia", "Salvar: reunião às 14h", ou "Como estão meus hábitos?"</span>
    `;
  },

  _saveFromChat() {
    const text = this._pendingSave;
    if (!text) {
      this._addBotMessage('🤔 Não encontrei a mensagem pendente. Diga <em>"Salvar: ..."</em> seguido da informação.');
      return;
    }
    this._pendingSave = null;
    const category = this._detectCategory(text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    Store.haven.addMemory({
      content: text,
      category: category,
      source: 'chat-save'
    });
    this._addBotMessage(`💾 Informação salva com sucesso na categoria <strong>${this._getCategoryLabel(category)}</strong>!`);
  },

  // ============================================
  // RECONHECIMENTO DE VOZ (Web Speech API)
  // ============================================
  _mediaRecorder: null,
  _audioChunks: [],
  _audioStream: null,

  toggleVoice() {
    if (this._isListening) {
      // Desbloquear áudio no toque de envio (sem conflitar com a captura do microfone no iOS)
      this._unlockAudio();
      this.stopVoice();
    } else {
      this.stopSpeaking();
      this.startVoice();
    }
  },

  startVoice() {
    // Quando a IA Gemini está ativa, gravar áudio real (funciona no iPhone PWA e Android!)
    if (HavenAI.isReady() && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) {
      this._startAudioRecording();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      Utils.toast('Para gravar áudio neste aparelho, ative a IA do Gemini em ⚙️ Configurar IA.', 'warning');
      return;
    }

    this._voiceTranscript = '';
    this._voiceSent = false;

    this._recognition = new SpeechRecognition();
    this._recognition.lang = 'pt-BR';
    this._recognition.interimResults = true;
    this._recognition.continuous = false;
    this._recognition.maxAlternatives = 1;

    this._recognition.onstart = () => {
      this._isListening = true;
      const orb = document.getElementById('haven-mic-orb');
      if (orb) orb.classList.add('is-listening');
      if (typeof HavenOrb !== 'undefined') HavenOrb.setState('listening');
    };

    this._recognition.onresult = (event) => {
      let full = '';
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      this._voiceTranscript = full.trim();

      const stateText = document.getElementById('haven-orb-state-text');
      if (stateText && this._voiceTranscript) {
        stateText.textContent = `“${this._voiceTranscript}”`;
      }

      const last = event.results[event.results.length - 1];
      if (last && last.isFinal && this._voiceTranscript && !this._voiceSent) {
        this._voiceSent = true;
        const finalText = this._voiceTranscript;
        this.stopVoice();
        this._sendVoiceTranscript(finalText);
      }
    };

    this._recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this._voiceSent = true;
      this.stopVoice();

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        Utils.toast('Microfone bloqueado pelo navegador. Ative a IA do Gemini em ⚙️ para gravar áudio real.', 'error');
      } else if (event.error === 'no-speech') {
        Utils.toast('Nenhuma fala detectada. Tente novamente.', 'warning');
      } else if (event.error === 'audio-capture') {
        Utils.toast('Nenhum microfone encontrado.', 'error');
      } else if (event.error === 'network') {
        Utils.toast('Erro de rede no reconhecimento de voz.', 'error');
      }
    };

    this._recognition.onend = () => {
      const pending = (this._voiceTranscript || '').trim();
      const alreadySent = this._voiceSent;
      this.stopVoice();
      if (!alreadySent && pending) {
        this._voiceSent = true;
        this._sendVoiceTranscript(pending);
      }
    };

    try {
      this._recognition.start();
    } catch (e) {
      Utils.toast('Erro ao iniciar reconhecimento de voz.', 'error');
    }
  },

  async _startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this._audioStream = stream;
      this._audioChunks = [];

      const mimeTypes = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
      const chosenMime = mimeTypes.find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
      const recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
      this._mediaRecorder = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this._audioChunks.push(e.data);
      };

      recorder.onstop = () => {
        const chunks = this._audioChunks.slice();
        const mime = recorder.mimeType || chosenMime || 'audio/mp4';
        this._cleanupAudioStream();
        if (!chunks.length) {
          Utils.toast('Nenhum áudio captado — tente falar mais perto do microfone.', 'warning');
          return;
        }
        const blob = new Blob(chunks, { type: mime });
        if (blob.size < 400) {
          Utils.toast('Áudio muito curto — fale por pelo menos 1 segundo.', 'warning');
          return;
        }
        this._processAudioBlob(blob, mime);
      };

      recorder.start(250);
      this._isListening = true;
      const orb = document.getElementById('haven-mic-orb');
      if (orb) orb.classList.add('is-listening');
      if (typeof HavenOrb !== 'undefined') HavenOrb.setState('listening');
      const stateText = document.getElementById('haven-orb-state-text');
      if (stateText) stateText.textContent = 'Ouvindo... toque no microfone para enviar';
    } catch (err) {
      this._cleanupAudioStream();
      this._isListening = false;
      Utils.toast('Permissão de microfone negada no aparelho.', 'error');
    }
  },

  _cleanupAudioStream() {
    if (this._audioStream) {
      this._audioStream.getTracks().forEach(t => t.stop());
      this._audioStream = null;
    }
    this._mediaRecorder = null;
  },

  _processAudioBlob(blob, mimeType) {
    if (this._isProcessing) return;
    this._isProcessing = true;
    this._addUserMessage('🎤 Mensagem de voz');
    this._showTypingIndicator();
    if (typeof HavenOrb !== 'undefined') HavenOrb.setState('thinking');

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.split(',')[1] || '';
      if (!base64) {
        this._removeTypingIndicator();
        this._isProcessing = false;
        if (typeof HavenOrb !== 'undefined') HavenOrb.setState('idle');
        return;
      }
      let cleanMime = (mimeType || 'audio/mp4').split(';')[0].trim().toLowerCase();
      if (!cleanMime || cleanMime === 'video/mp4') cleanMime = 'audio/mp4';
      HavenAI.ask('Ouça o áudio do usuário em português e responda naturalmente.', '', {
        inlineData: { mimeType: cleanMime, data: base64 }
      })
        .then(html => {
          this._removeTypingIndicator();
          this._addBotMessage(html, 'ai');
          this._isProcessing = false;
          this._refreshAIStatus();
          const voiceCfg = Store.haven.getVoiceConfig();
          if (voiceCfg.autoSpeak !== false) {
            this.speak(this._chatHistory.length - 1);
          } else if (typeof HavenOrb !== 'undefined') {
            HavenOrb.setState('idle');
          }
        })
        .catch(err => {
          this._removeTypingIndicator();
          this._addBotMessage(this._aiNotice(HavenAI.friendlyError(err)), 'local');
          this._isProcessing = false;
          this._refreshAIStatus();
          if (typeof HavenOrb !== 'undefined') HavenOrb.setState('idle');
        });
    };
    reader.readAsDataURL(blob);
  },

  stopVoice() {
    this._isListening = false;

    if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
      try { if (typeof this._mediaRecorder.requestData === 'function') this._mediaRecorder.requestData(); } catch (e) {}
      try { this._mediaRecorder.stop(); } catch (e) { this._cleanupAudioStream(); }
    }
    if (this._recognition) {
      try { this._recognition.stop(); } catch (e) {}
    }

    const orb = document.getElementById('haven-mic-orb');
    if (orb) orb.classList.remove('is-listening');

    if (typeof HavenOrb !== 'undefined' && !this._isProcessing) HavenOrb.setState('idle');
  },

  // ============================================
  // ATALHOS RÁPIDOS
  // ============================================
  quickAction(action) {
    const actions = {
      resumo: 'Me dê o resumo completo do dia',
      planejar: 'Me ajude a planejar meu dia com base nos meus dados',
      tarefas: 'Quais são minhas tarefas e anotações pendentes?',
      financas: 'Como estão minhas finanças este mês?',
      habitos: 'Como estão meus hábitos hoje?',
      metas: 'Qual o progresso das minhas metas?',
      salvar: '',
      ajuda: 'O que você pode fazer por mim?'
    };

    const text = actions[action];
    if (action === 'salvar') {
      const input = document.getElementById('haven-text-input');
      if (input) {
        input.value = 'Salvar: ';
        input.focus();
        this.autoResizeInput();
      }
      return;
    }

    if (text) {
      if (['resumo', 'financas', 'habitos', 'metas'].includes(action)) {
        this._forceLocalOnce = true;
      }
      this._addUserMessage(text);
      this._processMessage(text);
    }
  },

  // ============================================
  // RESUMO DIÁRIO INTELIGENTE
  // ============================================
  _generateDailySummary() {
    const parts = [];
    const today = Utils.today();

    // Hábitos
    const habits = Store.habits ? Store.habits.getAll() : [];
    if (habits.length > 0) {
      const completedToday = habits.filter(h => h.checks && h.checks[today]).length;
      const pct = Math.round((completedToday / habits.length) * 100);
      parts.push(`
        <div class="haven-summary-item">
          <span class="haven-summary-icon">🔥</span>
          <div>
            <div class="haven-summary-item-title">Hábitos</div>
            <div class="haven-summary-item-value">${completedToday}/${habits.length} completados (${pct}%)</div>
          </div>
        </div>
      `);
    }

    // Finanças do mês
    const transactions = Store.finances ? Store.finances.getTransactions() : [];
    if (transactions.length > 0) {
      const thisMonth = transactions.filter(t => {
        const d = new Date(t.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
      const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
      parts.push(`
        <div class="haven-summary-item">
          <span class="haven-summary-icon">💰</span>
          <div>
            <div class="haven-summary-item-title">Finanças do Mês</div>
            <div class="haven-summary-item-value" style="color: ${income - expense >= 0 ? '#34d399' : '#f87171'};">Saldo: R$ ${(income - expense).toFixed(2)}</div>
          </div>
        </div>
      `);
    }

    // Metas
    const goals = Store.goals ? Store.goals.getAll() : [];
    if (goals.length > 0) {
      const avgProgress = Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length);
      parts.push(`
        <div class="haven-summary-item">
          <span class="haven-summary-icon">🎯</span>
          <div>
            <div class="haven-summary-item-title">Metas (${goals.length})</div>
            <div class="haven-summary-item-value">Progresso médio: ${avgProgress}%</div>
          </div>
        </div>
      `);
    }

    // Anotações ativas
    const notes = Store.notes ? Store.notes.getAll() : [];
    const activeNotes = notes.filter(n => !n.expired);
    if (activeNotes.length > 0) {
      const important = activeNotes.filter(n => n.importance === 'super' || n.importance === 'importante');
      parts.push(`
        <div class="haven-summary-item">
          <span class="haven-summary-icon">📝</span>
          <div>
            <div class="haven-summary-item-title">Anotações Ativas</div>
            <div class="haven-summary-item-value">${activeNotes.length} ativas${important.length > 0 ? `, <span style="color: #f87171;">${important.length} importante(s)!</span>` : ''}</div>
          </div>
        </div>
      `);
    }

    // Memórias recentes
    const memories = Store.haven.getMemories();
    if (memories.length > 0) {
      const recentCount = memories.filter(m => {
        const diff = Date.now() - new Date(m.createdAt).getTime();
        return diff < 24 * 60 * 60 * 1000; // últimas 24h
      }).length;
      if (recentCount > 0) {
        parts.push(`
          <div class="haven-summary-item">
            <span class="haven-summary-icon">🧠</span>
            <div>
              <div class="haven-summary-item-title">Memórias</div>
              <div class="haven-summary-item-value">${recentCount} nova(s) nas últimas 24h</div>
            </div>
          </div>
        `);
      }
    }

    if (parts.length === 0) {
      parts.push(`
        <div class="haven-summary-item">
          <span class="haven-summary-icon">✨</span>
          <div>
            <div class="haven-summary-item-title">Tudo limpo!</div>
            <div class="haven-summary-item-value">Nenhuma pendência ou informação registrada. Comece adicionando dados ao dashboard.</div>
          </div>
        </div>
      `);
    }

    return `<div class="haven-summary-grid">${parts.join('')}</div>`;
  },

  toggleSummary() {
    const body = document.getElementById('haven-summary-body');
    const btn = document.getElementById('haven-toggle-summary-btn');
    if (!body) return;

    body.classList.toggle('collapsed');
    if (btn) {
      btn.style.transform = body.classList.contains('collapsed') ? 'rotate(180deg)' : '';
    }
  },

  // ============================================
  // MODAL DE MEMÓRIAS
  // ============================================
  openMemories() {
    const memories = Store.haven.getMemories();

    let existingModal = document.getElementById('haven-memories-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'haven-memories-modal';
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal" style="max-width: 600px; max-height: 85vh;">
        <div class="modal-header">
          <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Memórias do Haven
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 400;">(${memories.length})</span>
          </h3>
          <button class="modal-close" onclick="Haven.closeMemories()">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body" style="max-height: 60vh; overflow-y: auto; padding: var(--space-4);">
          ${memories.length === 0 
            ? '<div style="text-align: center; padding: var(--space-8); color: var(--text-muted);">Nenhuma memória salva ainda.<br>Diga ao Haven para salvar informações!</div>'
            : memories.slice().reverse().map((m, i) => `
                <div class="haven-memory-item" style="padding: var(--space-3); border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; gap: var(--space-3);">
                  <span style="font-size: 1.1rem; flex-shrink: 0;">${this._getMemoryIcon(m.category)}</span>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.9rem; color: var(--text-primary); word-break: break-word;">${this._escapeHtml(m.content)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 8px;">
                      <span style="color: var(--accent);">${this._getCategoryLabel(m.category)}</span>
                      <span>·</span>
                      <span>${this._timeAgo(m.createdAt)}</span>
                    </div>
                  </div>
                  <button class="btn btn-ghost sm" onclick="Haven.deleteMemory('${m.id}')" title="Apagar" style="color: var(--text-muted); padding: 4px;">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              `).join('')
          }
        </div>
        <div class="modal-footer">
          ${memories.length > 0 ? '<button class="btn btn-secondary sm" onclick="Haven.clearAllMemories()">Apagar Todas</button>' : ''}
          <button class="btn btn-primary sm" onclick="Haven.closeMemories()">Fechar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 30);

    if (cfg.elevenLabsKey) {
      const credEl = document.getElementById('haven-eleven-credits');
      fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': cfg.elevenLabsKey.trim() }
      })
        .then(r => r.ok ? r.json() : null)
        .then(sub => {
          if (!credEl || !sub) return;
          const used = sub.character_count ?? 0;
          const limit = sub.character_limit ?? 10000;
          const lc = localStorage.getItem('haven_eleven_last_cost');
          credEl.innerHTML = `Créditos ElevenLabs: <strong>${used.toLocaleString('pt-BR')} / ${limit.toLocaleString('pt-BR')}</strong> usados${lc ? ` · Última fala: ~${lc}` : ''}`;
        })
        .catch(() => {});
    }
  },

  closeMemories() {
    const modal = document.getElementById('haven-memories-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    }
  },

  deleteMemory(id) {
    Store.haven.deleteMemory(id);
    this.openMemories(); // Refresh
    Utils.toast('Memória apagada.', 'success');
  },

  clearAllMemories() {
    Utils.confirm('Tem certeza que deseja apagar TODAS as memórias do Haven?', () => {
      Store.haven.clearMemories();
      this.closeMemories();
      Utils.toast('Todas as memórias foram apagadas.', 'success');
    });
  },

  clearChat() {
    Utils.confirm('Limpar todo o histórico de conversa com o Haven?', () => {
      this._chatHistory = [];
      Store.haven.saveChatHistory([]);
      this._renderChatArea();
      this._addBotMessage(this._getWelcomeMessage());
      Utils.toast('Chat limpo!', 'success');
    });
  },

  // ============================================
  // DETECÇÃO DE CATEGORIA INTELIGENTE
  // ============================================
  _detectCategory(text) {
    const categoryKeywords = {
      finance: ['dinheiro', 'gasto', 'pagar', 'receber', 'salario', 'boleto', 'financ', 'preco', 'valor', 'compra', 'venda', 'investir', 'invest', 'pix', 'conta', 'banco'],
      health: ['saude', 'medico', 'consulta', 'remedio', 'academia', 'exercicio', 'treino', 'dieta', 'peso', 'dormir', 'sono'],
      work: ['trabalho', 'reuniao', 'meeting', 'projeto', 'cliente', 'entrega', 'deadline', 'prazo', 'empresa', 'chefe', 'oferta', 'anuncio', 'facebook', 'ads', 'marketing', 'campanha'],
      personal: ['pessoal', 'familia', 'amigo', 'aniversario', 'viagem', 'lazer', 'hobby', 'namorad', 'casa'],
      study: ['estudo', 'curso', 'aula', 'livro', 'aprender', 'escola', 'universidade', 'prova', 'certificac'],
      idea: ['ideia', 'inspiracao', 'criar', 'inovar', 'pensar', 'brainstorm', 'conceito']
    };

    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(k => text.includes(k))) return cat;
    }

    return 'general';
  },

  _getCategoryLabel(category) {
    const labels = {
      word: '🔤 Palavras',
      finance: '💰 Finanças',
      health: '🏥 Saúde',
      work: '💼 Trabalho',
      personal: '👤 Pessoal',
      study: '📚 Estudos',
      idea: '💡 Ideia',
      general: '📌 Geral'
    };
    return labels[category] || '📌 Geral';
  },

  _getMemoryIcon(category) {
    const icons = {
      word: '🔤', finance: '💰', health: '🏥', work: '💼',
      personal: '👤', study: '📚', idea: '💡', general: '📌'
    };
    return icons[category] || '📌';
  },

  // ============================================
  // CONFIGURAÇÕES DA IA (GEMINI)
  // ============================================
  openAISettings() {
    const existing = document.getElementById('haven-ai-modal');
    if (existing) existing.remove();

    const cfg = Store.haven.getAIConfig();
    const usage = Store.haven.getAIUsage();
    const models = cfg.availableModels && cfg.availableModels.length > 0
      ? cfg.availableModels
      : (cfg.model ? [cfg.model] : ['gemini-3.8-flash']);

    const modal = document.createElement('div');
    modal.id = 'haven-ai-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <span>✨</span> Configurar IA do Haven (Gemini)
          </h3>
          <button class="modal-close" onclick="Haven.closeAISettings()">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="haven-ai-info-box">
            <strong>Modo Híbrido:</strong> Comandos locais (resumo, finanças, hábitos, salvar) continuam instantâneos e grátis. A IA entra só quando você faz perguntas abertas ou precisa de ajuda inteligente.
          </div>

          <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--bg-surface-alt); border: 1px solid var(--border); border-radius: var(--radius-md);">
            <div>
              <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">Usar IA quando eu não entender</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Uso de hoje: <strong>${usage.count}/${cfg.dailyLimit || 50}</strong> mensagens</div>
            </div>
            <label class="haven-switch">
              <input type="checkbox" id="haven-ai-enabled" ${cfg.enabled ? 'checked' : ''}>
              <span class="haven-switch-slider"></span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
              <span>Chave da API (Google AI Studio)</span>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="font-size: 0.75rem; color: var(--accent);">Criar chave grátis ↗</a>
            </label>
            <div style="display: flex; gap: 6px;">
              <input type="password" class="form-input" id="haven-ai-key" value="${this._escapeHtml(cfg.apiKey)}" placeholder="Cole sua chave AIza..." autocomplete="off">
              <button type="button" class="btn btn-secondary sm" onclick="Haven.toggleAIKeyVisibility()" id="haven-key-eye" title="Mostrar/Ocultar">👁️</button>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
              🔒 Fica salva somente neste aparelho e nunca vai para o arquivo de backup.
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 120px; gap: var(--space-3);">
            <div class="form-group">
              <label class="form-label">Modelo Gemini</label>
              <select class="form-select" id="haven-ai-model">
                ${models.map(m => `<option value="${this._escapeHtml(m)}" ${m === cfg.model ? 'selected' : ''}>${this._escapeHtml(m)}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Limite/Dia</label>
              <input type="number" class="form-input" id="haven-ai-limit" value="${cfg.dailyLimit || 50}" min="1" max="1000">
            </div>
          </div>

          <div id="haven-ai-test-result" style="display: none; margin-top: 4px; padding: 10px 12px; border-radius: var(--radius-sm); font-size: 0.82rem;"></div>
        </div>

        <div class="modal-footer" style="justify-content: space-between;">
          <button type="button" class="btn btn-secondary sm" onclick="Haven.testAIConnection()" id="haven-ai-test-btn">
            🔌 Testar Conexão
          </button>
          <div style="display: flex; gap: var(--space-2);">
            <button type="button" class="btn btn-secondary sm" onclick="Haven.closeAISettings()">Cancelar</button>
            <button type="button" class="btn btn-primary sm" onclick="Haven.saveAISettings()">Salvar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 30);

    if (cfg.elevenLabsKey) {
      const credEl = document.getElementById('haven-eleven-credits');
      fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': cfg.elevenLabsKey.trim() }
      })
        .then(r => r.ok ? r.json() : null)
        .then(sub => {
          if (!credEl || !sub) return;
          const used = sub.character_count ?? 0;
          const limit = sub.character_limit ?? 10000;
          const lc = localStorage.getItem('haven_eleven_last_cost');
          credEl.innerHTML = `Créditos ElevenLabs: <strong>${used.toLocaleString('pt-BR')} / ${limit.toLocaleString('pt-BR')}</strong> usados${lc ? ` · Última fala: ~${lc}` : ''}`;
        })
        .catch(() => {});
    }
  },

  closeAISettings() {
    const modal = document.getElementById('haven-ai-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    }
  },

  // ============================================
  // CONFIGURAÇÕES DE VOZ (FLUIDEZ & ESCOLHA DE VOZ)
  // ============================================
  openVoiceSettings() {
    const existing = document.getElementById('haven-voice-modal');
    if (existing) existing.remove();

    const cfg = Store.haven.getVoiceConfig();
    const aiCfg = Store.haven.getAIConfig();
    const hasGeminiKey = !!(aiCfg.apiKey && aiCfg.apiKey.trim());
    const voices = this._getPortugueseVoices();
    const bestAuto = voices[0];

    const geminiVoices = [
      { id: 'Charon', label: '👨 Charon — Masculina grave e serena' },
      { id: 'Fenrir', label: '👨 Fenrir — Masculina firme e marcante' },
      { id: 'Orus', label: '👨 Orus — Masculina equilibrada e natural' },
      { id: 'Puck', label: '👨 Puck — Masculina leve e descontraída' },
      { id: 'Kore', label: '👩 Kore — Feminina firme e clara' },
      { id: 'Aoede', label: '👩 Aoede — Feminina suave e envolvente' },
      { id: 'Zephyr', label: '👩 Zephyr — Feminina leve e conversacional' }
    ];

    const elevenDefaultVoices = [
      { id: 'pNInz6obpgDQGcFmaJgB', label: '👨 Adam — Masculina firme e natural' },
      { id: 'TxGEqnHWrfWFTfGW9XjX', label: '👨 Josh — Masculina jovem e fluida' },
      { id: 'ErXwobaYiN019PkySvjV', label: '👨 Antoni — Masculina calma e clara' },
      { id: 'VR6AewLTigWG4xSOukaG', label: '👨 Arnold — Masculina grave e marcante' },
      { id: '21m00Tcm4TlvDq8ikWAM', label: '👩 Rachel — Feminina clara e natural' },
      { id: 'EXAVITQu4vr4xnSDxMaL', label: '👩 Bella — Feminina suave' }
    ];
    const customEleven = Array.isArray(cfg.elevenLabsVoices) && cfg.elevenLabsVoices.length > 0
      ? cfg.elevenLabsVoices
      : [];
    const elevenVoices = customEleven.length > 0
      ? [...customEleven, ...elevenDefaultVoices.filter(d => !customEleven.some(c => c.id === d.id))]
      : elevenDefaultVoices;

    const voiceLabel = (v) => {
      const n = v.name || '';
      const isNatural = /natural|online|google/i.test(n);
      const clean = n.replace(/Microsoft\s+/i, '').replace(/\s*-\s*Portuguese.*$/i, '');
      return `${isNatural ? '✨ ' : ''}${clean} (${v.lang})`;
    };

    const modal = document.createElement('div');
    modal.id = 'haven-voice-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <span>🎙️</span> Voz do Haven
          </h3>
          <button class="modal-close" onclick="Haven.closeVoiceSettings()">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="haven-ai-info-box">
            <strong>🌟 ElevenLabs (10k/mês grátis):</strong> Voz humana ultra-realista em português, sem depender da cota de áudio do Gemini.
          </div>

          <div class="form-group">
            <label class="form-label">Motor de Voz</label>
            <select class="form-select" id="haven-voice-provider">
              <option value="auto" ${cfg.provider === 'auto' ? 'selected' : ''}>Automático (ElevenLabs → Gemini → Aparelho)</option>
              <option value="elevenlabs" ${cfg.provider === 'elevenlabs' ? 'selected' : ''}>🌟 ElevenLabs (Ultra-realista)</option>
              <option value="gemini" ${cfg.provider === 'gemini' ? 'selected' : ''}>✨ Gemini Neural</option>
              <option value="browser" ${cfg.provider === 'browser' ? 'selected' : ''}>🌐 Aparelho (Offline)</option>
            </select>
            ${!hasGeminiKey && !cfg.elevenLabsKey ? `
              <div style="font-size: 0.75rem; color: #fbbf24; margin-top: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <span>Nenhuma chave neural configurada ainda.</span>
                <button type="button" class="btn btn-secondary sm" onclick="Haven.closeVoiceSettings(); Haven.openAISettings();" style="padding: 3px 8px; font-size: 0.72rem;">Configurar ⚙️ IA</button>
              </div>
            ` : ''}
          </div>

          <div class="form-group" style="padding: 10px 12px; background: var(--bg-surface-alt); border: 1px solid var(--border); border-radius: var(--radius-md);">
            <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
              <span>Chave ElevenLabs (grátis)</span>
              <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener" style="font-size: 0.74rem; color: var(--accent);">Criar chave ↗</a>
            </label>
            <input type="password" class="form-input" id="haven-voice-eleven-key" value="${this._escapeHtml(cfg.elevenLabsKey || '')}" placeholder="Cole sua chave sk_... da ElevenLabs" autocomplete="off" style="margin-bottom: 8px;">
            <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
              <span>Voz ElevenLabs (PT-BR)</span>
              <button type="button" class="btn btn-secondary sm" onclick="Haven.loadElevenLabsVoices()" id="haven-eleven-refresh-btn" style="padding: 2px 8px; font-size: 0.7rem;">🔄 Minhas Vozes</button>
            </label>
            <select class="form-select" id="haven-voice-eleven-id">
              ${elevenVoices.map(ev => `
                <option value="${this._escapeHtml(ev.id)}" ${(cfg.elevenLabsVoiceId || 'pNInz6obpgDQGcFmaJgB') === ev.id ? 'selected' : ''}>${this._escapeHtml(ev.label)}</option>
              `).join('')}
            </select>
            <div id="haven-eleven-credits" style="font-size: 0.74rem; color: var(--text-muted); margin-top: 6px;">
              ${(() => {
                const lc = localStorage.getItem('haven_eleven_last_cost');
                return lc ? `Última fala: ~${lc} crédito(s) (1 letra ≈ 0,5 crédito).` : 'Modelo rápido PT-BR: ~0,5 crédito por letra.';
              })()}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Voz Neural (Gemini)</label>
            <select class="form-select" id="haven-voice-gemini">
              ${geminiVoices.map(gv => `
                <option value="${gv.id}" ${(cfg.geminiVoice || 'Kore') === gv.id ? 'selected' : ''}>${gv.label}</option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Voz Alternativa do Navegador (Fallback)</label>
            <select class="form-select" id="haven-voice-name">
              <option value="" ${!cfg.voiceName ? 'selected' : ''}>
                Automática${bestAuto ? ` (${bestAuto.name.replace(/Microsoft\s+/i, '').split(' - ')[0]})` : ''}
              </option>
              ${voices.map(v => `
                <option value="${this._escapeHtml(v.name)}" ${v.name === cfg.voiceName ? 'selected' : ''}>
                  ${this._escapeHtml(voiceLabel(v))}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" style="display: flex; justify-content: space-between;">
              <span>Velocidade (Fluidez)</span>
              <strong id="haven-voice-rate-val">${(cfg.rate || 1.05).toFixed(2)}x</strong>
            </label>
            <input type="range" id="haven-voice-rate" min="0.80" max="1.40" step="0.05" value="${cfg.rate || 1.05}"
                   oninput="document.getElementById('haven-voice-rate-val').textContent = Number(this.value).toFixed(2) + 'x'"
                   style="width: 100%; accent-color: var(--accent);">
          </div>

          <div class="form-group">
            <label class="form-label" style="display: flex; justify-content: space-between;">
              <span>Tom da Voz (Navegador)</span>
              <strong id="haven-voice-pitch-val">${(cfg.pitch || 1.02).toFixed(2)}</strong>
            </label>
            <input type="range" id="haven-voice-pitch" min="0.80" max="1.25" step="0.02" value="${cfg.pitch || 1.02}"
                   oninput="document.getElementById('haven-voice-pitch-val').textContent = Number(this.value).toFixed(2)"
                   style="width: 100%; accent-color: var(--accent);">
          </div>

          <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--bg-surface-alt); border: 1px solid var(--border); border-radius: var(--radius-md);">
            <div>
              <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">Falar automaticamente</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Ler a resposta em voz alta quando você usar o microfone</div>
            </div>
            <label class="haven-switch">
              <input type="checkbox" id="haven-voice-autospeak" ${cfg.autoSpeak !== false ? 'checked' : ''}>
              <span class="haven-switch-slider"></span>
            </label>
          </div>
        </div>

        <div class="modal-footer" style="justify-content: space-between;">
          <button type="button" class="btn btn-secondary sm" onclick="Haven.testVoiceSettings()">
            🔊 Testar Voz
          </button>
          <div style="display: flex; gap: var(--space-2);">
            <button type="button" class="btn btn-secondary sm" onclick="Haven.closeVoiceSettings()">Cancelar</button>
            <button type="button" class="btn btn-primary sm" onclick="Haven.saveVoiceSettings()">Salvar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 30);

    if (cfg.elevenLabsKey) {
      const credEl = document.getElementById('haven-eleven-credits');
      fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': cfg.elevenLabsKey.trim() }
      })
        .then(r => r.ok ? r.json() : null)
        .then(sub => {
          if (!credEl || !sub) return;
          const used = sub.character_count ?? 0;
          const limit = sub.character_limit ?? 10000;
          const lc = localStorage.getItem('haven_eleven_last_cost');
          credEl.innerHTML = `Créditos ElevenLabs: <strong>${used.toLocaleString('pt-BR')} / ${limit.toLocaleString('pt-BR')}</strong> usados${lc ? ` · Última fala: ~${lc}` : ''}`;
        })
        .catch(() => {});
    }
  },

  closeVoiceSettings() {
    const modal = document.getElementById('haven-voice-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    }
  },

  _readVoiceModalValues() {
    return {
      provider: document.getElementById('haven-voice-provider')?.value || 'auto',
      elevenLabsKey: (document.getElementById('haven-voice-eleven-key')?.value || '').trim(),
      elevenLabsVoiceId: document.getElementById('haven-voice-eleven-id')?.value || 'pNInz6obpgDQGcFmaJgB',
      geminiVoice: document.getElementById('haven-voice-gemini')?.value || 'Charon',
      voiceName: document.getElementById('haven-voice-name')?.value || '',
      rate: parseFloat(document.getElementById('haven-voice-rate')?.value || '1.0'),
      pitch: parseFloat(document.getElementById('haven-voice-pitch')?.value || '1.0'),
      autoSpeak: !!document.getElementById('haven-voice-autospeak')?.checked
    };
  },

  async loadElevenLabsVoices() {
    const key = (document.getElementById('haven-voice-eleven-key')?.value || '').trim();
    if (!key) {
      Utils.toast('Cole sua chave da ElevenLabs primeiro.', 'warning');
      return;
    }
    const btn = document.getElementById('haven-eleven-refresh-btn');
    if (btn) btn.disabled = true;
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': key }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = (data.voices || []).map(v => ({
        id: v.voice_id,
        label: `${v.labels?.gender === 'female' ? '👩' : '👨'} ${v.name}${v.labels?.accent ? ` (${v.labels.accent})` : ''}`
      }));
      if (list.length > 0) {
        Store.haven.saveVoiceConfig({ elevenLabsVoices: list, elevenLabsKey: key });
        const sel = document.getElementById('haven-voice-eleven-id');
        if (sel) {
          sel.innerHTML = list.map(v => `<option value="${this._escapeHtml(v.id)}">${this._escapeHtml(v.label)}</option>`).join('');
        }
        Utils.toast(`${list.length} voz(es) carregada(s) da sua conta ElevenLabs!`, 'success');
      }
    } catch (err) {
      Utils.toast('Erro ao buscar vozes da ElevenLabs — confira sua chave.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  testVoiceSettings() {
    this._unlockAudio();
    const cfg = this._readVoiceModalValues();
    this._speakText('Olá! Eu sou o Haven. Agora estou falando de um jeito mais natural e fluido com você.', cfg);
  },

  saveVoiceSettings() {
    const cfg = this._readVoiceModalValues();
    Store.haven.saveVoiceConfig(cfg);
    this.closeVoiceSettings();
    Utils.toast('Configurações de voz salvas!', 'success');
  },

  toggleAIKeyVisibility() {
    const input = document.getElementById('haven-ai-key');
    const eye = document.getElementById('haven-key-eye');
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    if (eye) eye.textContent = isPass ? '🙈' : '👁️';
  },

  async testAIConnection() {
    const keyInput = document.getElementById('haven-ai-key');
    const btn = document.getElementById('haven-ai-test-btn');
    const resBox = document.getElementById('haven-ai-test-result');
    const select = document.getElementById('haven-ai-model');
    if (!keyInput || !resBox) return;

    const apiKey = keyInput.value.trim();
    if (!apiKey) {
      resBox.style.display = 'block';
      resBox.style.background = 'var(--danger-soft)';
      resBox.style.color = 'var(--danger)';
      resBox.textContent = 'Cole sua chave da API antes de testar.';
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Testando...'; }
    resBox.style.display = 'block';
    resBox.style.background = 'var(--accent-soft)';
    resBox.style.color = 'var(--accent)';
    resBox.textContent = 'Conectando ao Google Gemini...';

    const res = await HavenAI.testConnection(apiKey);
    if (btn) { btn.disabled = false; btn.textContent = '🔌 Testar Conexão'; }

    if (res.ok) {
      resBox.style.background = 'var(--success-soft)';
      resBox.style.color = 'var(--success)';
      resBox.textContent = `✅ Conectado! ${res.models.length} modelo(s) disponível(is). Recomendado: ${res.recommendedModel}`;
      if (select && res.models.length > 0) {
        select.innerHTML = res.models.map(m => `<option value="${this._escapeHtml(m)}" ${m === res.recommendedModel ? 'selected' : ''}>${this._escapeHtml(m)}</option>`).join('');
      }
      Store.haven.saveAIConfig({ availableModels: res.models });
    } else {
      resBox.style.background = 'var(--danger-soft)';
      resBox.style.color = 'var(--danger)';
      resBox.textContent = `❌ ${res.error}`;
    }
  },

  saveAISettings() {
    const enabled = !!document.getElementById('haven-ai-enabled')?.checked;
    const apiKey = (document.getElementById('haven-ai-key')?.value || '').trim();
    const model = document.getElementById('haven-ai-model')?.value || 'gemini-3.8-flash';
    const limitRaw = parseInt(document.getElementById('haven-ai-limit')?.value, 10);
    const dailyLimit = isNaN(limitRaw) || limitRaw < 1 ? 50 : limitRaw;

    if (enabled && apiKey.length < 10) {
      Utils.toast('Cole uma chave da API válida para ativar a IA.', 'warning');
      return;
    }

    Store.haven.saveAIConfig({ enabled, apiKey, model, dailyLimit });
    this._refreshAIStatus();
    this.closeAISettings();
    Utils.toast(enabled ? '✨ IA do Haven ativada!' : 'Configurações salvas (modo local).', 'success');
  },

  // ============================================
  // MENSAGENS ESPECIAIS
  // ============================================
  _getWelcomeMessage() {
    const userName = Store.settings.get().userName || 'Usuário';
    const hour = new Date().getHours();
    let greeting = 'Olá';
    if (hour < 12) greeting = 'Bom dia';
    else if (hour < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';

    return `
      <strong>${greeting}, ${this._escapeHtml(userName)}!</strong><br>
      <span style="color: var(--text-secondary);">Toque no microfone para conversar ou escreva abaixo.</span>
      ${!HavenAI.isReady() ? `<div style="margin-top: 10px;"><button class="haven-inline-btn" onclick="Haven.openAISettings()">✨ Ativar IA Gemini (Voz + Respostas)</button></div>` : ''}
    `;
  },

  _getGreeting(userName) {
    const hour = new Date().getHours();
    let greeting = 'Olá';
    if (hour < 12) greeting = 'Bom dia';
    else if (hour < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';

    return `${greeting}, ${this._escapeHtml(userName)}! 😊 Como posso te ajudar agora? Precisa de um resumo do dia, salvar algo ou consultar algum dado?`;
  },

  _getHelpMessage() {
    return `
      <strong>🤖 O que o Haven pode fazer por você:</strong><br><br>
      <div style="display: grid; gap: 6px;">
        <div>🎤 <strong>"Salvar: [informação]"</strong> — Guarda na memória</div>
        <div>📋 <strong>"Resumo do dia"</strong> — Panorama completo</div>
        <div>💰 <strong>"Minhas finanças"</strong> — Balanço do mês</div>
        <div>🔥 <strong>"Meus hábitos"</strong> — Status de hoje</div>
        <div>🎯 <strong>"Minhas metas"</strong> — Progresso das metas</div>
        <div>📝 <strong>"Minhas tarefas"</strong> — Anotações ativas</div>
        <div>⏱️ <strong>"Cronômetro"</strong> — Tempo de foco</div>
        <div>🔍 <strong>"Buscar [termo]"</strong> — Procura nas memórias</div>
        <div>🧠 <strong>"Minhas memórias"</strong> — Lista o que salvou</div>
      </div>
      <br>
      <span style="font-size: 0.82rem; color: var(--text-muted);">Você também pode usar o 🎤 para falar por voz!</span>
    `;
  },

  // ============================================
  // UTILITÁRIOS
  // ============================================
  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  _truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  },

  _timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}min atrás`;
    if (diffH < 24) return `${diffH}h atrás`;
    if (diffD < 7) return `${diffD}d atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  },

  _getTodayFormatted() {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
};



/* ============================================
   HAVEN AI — Cliente Gemini (Modo Híbrido)
   ============================================ */
const HavenAI = {
  API_BASE: 'https://generativelanguage.googleapis.com/v1beta',

  isReady() {
    const cfg = Store.haven.getAIConfig();
    return !!(cfg.enabled && cfg.apiKey && cfg.apiKey.trim().length > 10);
  },

  canUse() {
    const cfg = Store.haven.getAIConfig();
    const usage = Store.haven.getAIUsage();
    return usage.count < (cfg.dailyLimit || 50);
  },

  statusLabel() {
    if (!this.isReady()) return '⚡ Só Local';
    const cfg = Store.haven.getAIConfig();
    const usage = Store.haven.getAIUsage();
    return `✨ IA: ${usage.count}/${cfg.dailyLimit || 50}`;
  },

  async testConnection(apiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const resp = await fetch(`${this.API_BASE}/models?key=${encodeURIComponent(apiKey)}`, { signal: controller.signal });
      clearTimeout(timer);

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const msg = errData?.error?.message || `Erro HTTP ${resp.status}`;
        return { ok: false, error: resp.status === 400 || resp.status === 401 || resp.status === 403 ? 'Chave de API inválida ou sem permissão.' : msg };
      }

      const data = await resp.json();
      const rawModels = (data.models || [])
        .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''))
        .filter(name => name.includes('gemini') && !/embedding|imagen|veo|tts|audio|robotics/i.test(name));

      // Ordena priorizando os modelos Flash mais recentes (pela versão numérica)
      rawModels.sort((a, b) => {
        const score = (n) => {
          let s = 0;
          const v = n.match(/gemini-(\d+(?:\.\d+)?)/i);
          if (v) s += parseFloat(v[1]) * 100;
          if (/flash/i.test(n)) s += 50;
          if (/lite/i.test(n)) s -= 20;
          if (/exp|preview/i.test(n)) s -= 10;
          if (/pro/i.test(n)) s -= 5;
          return s;
        };
        return score(b) - score(a);
      });

      if (rawModels.length === 0) {
        return { ok: false, error: 'Nenhum modelo Gemini compatível encontrado para esta chave.' };
      }

      return { ok: true, models: rawModels, recommendedModel: rawModels[0] };
    } catch (err) {
      return { ok: false, error: this.friendlyError(err) };
    }
  },

  // Se o modelo salvo foi descontinuado (404), descobre um novo e salva automaticamente
  async _callGeminiAutoModel(payload, apiKey, model) {
    try {
      return { data: await this._callGemini(payload, apiKey, model), model };
    } catch (err) {
      const isGone = err && (err.status === 404 || /no longer available|not found/i.test(err.message || ''));
      if (!isGone) throw err;

      let newModel = null;
      const suggested = String(err.message || '').match(/models\/(gemini-[\w.\-]+)/gi) || [];
      const candidates = suggested.map(s => s.replace(/^models\//i, '')).filter(m => m !== model);
      if (candidates.length) newModel = candidates[0];

      if (!newModel) {
        const res = await this.testConnection(apiKey);
        if (res.ok) {
          newModel = res.models.find(m => m !== model) || null;
          Store.haven.saveAIConfig({ availableModels: res.models });
        }
      }
      if (!newModel) throw err;

      Store.haven.saveAIConfig({ model: newModel });
      return { data: await this._callGemini(payload, apiKey, newModel), model: newModel };
    }
  },

  async ask(userText, userLower, audioPart = null) {
    const cfg = Store.haven.getAIConfig();
    let model = cfg.model || 'gemini-3.8-flash';
    const apiKey = cfg.apiKey.trim();

    const userParts = audioPart
      ? [{ text: userText || 'Ouça o áudio do usuário em português e responda naturalmente.' }, audioPart]
      : [{ text: userText }];

    const contents = [
      ...this._buildHistoryContents(true),
      { role: 'user', parts: userParts }
    ];

    const systemInstruction = { parts: [{ text: this._buildSystemPrompt(userLower) }] };
    const tools = [{ functionDeclarations: this._toolDeclarations() }];

    Store.haven.incrementAIUsage();
    const first = await this._callGeminiAutoModel({ contents, systemInstruction, tools }, apiKey, model);
    let data = first.data;
    model = first.model;

    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const fnCalls = parts.filter(p => p.functionCall);

    let actionBadges = [];

    // Executa ações pedidas pela IA (function calling) e pede a resposta final
    if (fnCalls.length > 0) {
      const fnResponses = [];
      for (const part of fnCalls) {
        const { name, args } = part.functionCall;
        const exec = this._executeTool(name, args || {});
        if (exec.badgeHtml) actionBadges.push(exec.badgeHtml);
        fnResponses.push({
          functionResponse: { name, response: exec.result }
        });
      }

      const nextContents = [
        ...contents,
        { role: 'model', parts },
        { role: 'user', parts: fnResponses }
      ];

      data = await this._callGemini({ contents: nextContents, systemInstruction, tools }, apiKey, model);
    }

    const finalParts = data?.candidates?.[0]?.content?.parts || [];
    const textReply = finalParts.filter(p => p.text).map(p => p.text).join('\n').trim();

    let html = textReply ? this._formatMarkdown(textReply) : 'Pronto! Ação executada.';
    if (actionBadges.length > 0) {
      html += `<div class="haven-ai-actions-box">${actionBadges.join('')}</div>`;
    }
    return html;
  },

  async _callGemini(payload, apiKey, model) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const url = `${this.API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        const err = new Error(errBody?.error?.message || `HTTP ${resp.status}`);
        err.status = resp.status;
        throw err;
      }
      return await resp.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  },

  _buildSystemPrompt(userLower) {
    const userName = Store.settings.get().userName || 'Usuário';
    const now = new Date();
    const todayIso = Utils.today();
    const lines = [
      `Você é o Haven, assistente pessoal inteligente do(a) ${userName} no dashboard Korhaven.`,
      `Responda sempre em português do Brasil, de forma direta, prática e amigável.`,
      `Data e hora atuais: ${Haven._formatMemoryDate(now.toISOString())}.`,
      `Você TEM ferramentas reais para agir dentro do Korhaven:`,
      `- Se o usuário pedir para registrar gasto, despesa, compra, receita, ganho ou alterar saldo, SEMPRE chame registrar_transacao (NÃO use salvar_memoria para lançamentos financeiros).`,
      `- Se o usuário pedir para marcar/concluir um hábito de hoje, chame concluir_habito.`,
      `- Se o usuário pedir para criar um hábito (com ou sem lembrete), chame criar_habito.`,
      `- Se o usuário pedir para criar uma meta, chame criar_meta.`,
      `- Se pedir para anotar uma tarefa ou lembrete com data/hora, chame criar_anotacao_diaria.`,
      `- Se pedir para guardar uma palavra, ideia ou fato pessoal na memória, chame salvar_memoria.`,
      `Se o usuário perguntar sobre algo que disse/ouviu/salvou antes, procure primeiro nas memórias abaixo (atenção às datas!).`
    ];

    // Hábitos
    const habits = Store.habits ? Store.habits.getAll() : [];
    if (habits.length > 0) {
      const hList = habits.map(h => {
        const done = !!(h.checks && h.checks[todayIso]);
        const streak = Store.habits.getStreak(h.id) || 0;
        return `${h.name} (${done ? 'feito hoje' : 'pendente'}, ${streak}d seguidos)`;
      });
      lines.push(`HÁBITOS HOJE: ${hList.join('; ')}`);
    }

    // Finanças do mês
    const txs = Store.finances ? Store.finances.getTransactions() : [];
    if (txs.length > 0) {
      const monthTx = txs.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
      const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
      const byCat = {};
      monthTx.filter(t => t.type === 'expense').forEach(t => {
        const c = t.category || 'Outros';
        byCat[c] = (byCat[c] || 0) + (t.amount || 0);
      });
      const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, v]) => `${c}: R$${v.toFixed(0)}`);
      lines.push(`FINANÇAS DO MÊS: Receitas R$${inc.toFixed(2)}, Despesas R$${exp.toFixed(2)}, Saldo R$${(inc - exp).toFixed(2)}${topCats.length ? ` (Maiores gastos: ${topCats.join(', ')})` : ''}`);
    }

    // Metas
    const goals = Store.goals ? Store.goals.getAll() : [];
    if (goals.length > 0) {
      lines.push(`METAS: ${goals.map(g => `${g.title || g.name} (${g.progress || 0}%)`).join('; ')}`);
    }

    // Anotações ativas
    const notes = Store.notes ? Store.notes.getAll().filter(n => !n.expired) : [];
    if (notes.length > 0) {
      const nList = notes.slice(0, 12).map(n => `[${n.type}${n.importance ? '/' + n.importance : ''}] ${n.title || 'Sem título'}${n.deadlineDate ? ' (prazo ' + n.deadlineDate + ')' : ''}`);
      lines.push(`ANOTAÇÕES ATIVAS: ${nList.join('; ')}`);
    }

    // Memórias (relevantes para a pergunta + 20 mais recentes)
    const allMem = Store.haven.getMemories();
    if (allMem.length > 0) {
      const { results } = Haven._findRelevantMemories(userLower || '');
      const mergedMap = new Map();
      results.slice(-15).forEach(m => mergedMap.set(m.id, m));
      allMem.slice(-20).forEach(m => mergedMap.set(m.id, m));
      const memLines = Array.from(mergedMap.values()).map(m => `- [${Haven._formatMemoryDate(m.createdAt)} | ${m.category || 'general'}] ${m.content}`);
      lines.push(`MEMÓRIAS SALVAS:\n${memLines.join('\n')}`);
    }

    return lines.join('\n\n');
  },

  _buildHistoryContents(excludeLastUser = false) {
    let history = Store.haven.getChatHistory().slice(-11);
    if (excludeLastUser && history.length > 0 && history[history.length - 1].role === 'user') {
      history = history.slice(0, -1);
    }
    history = history.slice(-10);

    const contents = [];
    for (const msg of history) {
      let txt = msg.content || '';
      if (msg.role !== 'user') {
        const tmp = document.createElement('div');
        tmp.innerHTML = txt;
        tmp.querySelectorAll('button, .haven-ai-notice').forEach(el => el.remove());
        txt = tmp.textContent.replace(/\s+/g, ' ').trim();
      }
      if (!txt) continue;

      const role = msg.role === 'user' ? 'user' : 'model';
      // Gemini exige alternância user -> model e nunca começar com model
      if (contents.length === 0 && role !== 'user') continue;
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += '\n' + txt.slice(0, 400);
        continue;
      }
      contents.push({
        role,
        parts: [{ text: txt.slice(0, 800) }]
      });
    }
    // Se terminar com 'user', remover para não colidir com a nova mensagem 'user'
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents.pop();
    }
    return contents;
  },

  _toolDeclarations() {
    return [
      {
        name: 'salvar_memoria',
        description: 'Salva uma informação, palavra nova, lembrete ou fato na memória permanente do Haven.',
        parameters: {
          type: 'OBJECT',
          properties: {
            conteudo: { type: 'STRING', description: 'Texto completo do que deve ser memorizado.' },
            categoria: { type: 'STRING', description: 'Uma de: word, finance, health, work, personal, study, idea, general' }
          },
          required: ['conteudo']
        }
      },
      {
        name: 'criar_anotacao_diaria',
        description: 'Cria uma anotação diária na aba Anotações do Korhaven.',
        parameters: {
          type: 'OBJECT',
          properties: {
            titulo: { type: 'STRING', description: 'Título curto da tarefa ou anotação.' },
            conteudo: { type: 'STRING', description: 'Detalhes da anotação.' },
            importancia: { type: 'STRING', description: 'normal, importante ou super' },
            prazo_data: { type: 'STRING', description: 'Data limite YYYY-MM-DD (opcional)' },
            prazo_hora: { type: 'STRING', description: 'Hora limite HH:MM (opcional)' }
          },
          required: ['titulo']
        }
      },
      {
        name: 'buscar_memorias',
        description: 'Busca nas memórias salvas por uma palavra-chave ou termo.',
        parameters: {
          type: 'OBJECT',
          properties: {
            termo: { type: 'STRING', description: 'Palavra ou termo a buscar.' }
          },
          required: ['termo']
        }
      },
      {
        name: 'registrar_transacao',
        description: 'Registra uma despesa (gasto) ou receita (entrada) real na aba Finanças do Korhaven, atualizando o saldo.',
        parameters: {
          type: 'OBJECT',
          properties: {
            tipo: { type: 'STRING', description: 'expense (despesa/gasto) ou income (receita/ganho)' },
            valor: { type: 'NUMBER', description: 'Valor numérico em reais (ex: 250)' },
            descricao: { type: 'STRING', description: 'Descrição curta (ex: Mercado, Uber, Salário)' },
            categoria: { type: 'STRING', description: 'Categoria (ex: Alimentação, Transporte, Lazer, Moradia, Saúde, Trabalho, Outros)' },
            data: { type: 'STRING', description: 'Data YYYY-MM-DD (opcional, padrão hoje)' }
          },
          required: ['tipo', 'valor', 'descricao']
        }
      },
      {
        name: 'concluir_habito',
        description: 'Marca um hábito existente como concluído hoje na aba Hábitos.',
        parameters: {
          type: 'OBJECT',
          properties: {
            nome_habito: { type: 'STRING', description: 'Nome ou parte do nome do hábito a marcar como feito.' }
          },
          required: ['nome_habito']
        }
      },
      {
        name: 'criar_habito',
        description: 'Cria um novo hábito na aba Hábitos do Korhaven (opcionalmente com horário de lembrete).',
        parameters: {
          type: 'OBJECT',
          properties: {
            nome: { type: 'STRING', description: 'Nome do hábito.' },
            categoria: { type: 'STRING', description: 'saúde, foco, estudo, fitness, financeiro ou pessoal' },
            horario_lembrete: { type: 'STRING', description: 'Horário HH:MM para notificar (opcional)' }
          },
          required: ['nome']
        }
      },
      {
        name: 'criar_meta',
        description: 'Cria uma nova meta na aba Metas do Korhaven.',
        parameters: {
          type: 'OBJECT',
          properties: {
            titulo: { type: 'STRING', description: 'Título da meta.' },
            progresso: { type: 'NUMBER', description: 'Progresso inicial de 0 a 100 (padrão 0).' }
          },
          required: ['titulo']
        }
      }
    ];
  },

  _executeTool(name, args) {
    if (name === 'salvar_memoria') {
      const validCats = ['word', 'finance', 'health', 'work', 'personal', 'study', 'idea', 'general'];
      const cat = validCats.includes(args.categoria) ? args.categoria : Haven._detectCategory(Haven._norm(args.conteudo || ''));
      const mem = Store.haven.addMemory({
        content: String(args.conteudo || '').trim(),
        category: cat,
        source: 'ai-tool'
      });
      return {
        result: { ok: true, id: mem.id, category: cat },
        badgeHtml: `<div class="haven-ai-action-chip">💾 Salvo na memória (${Haven._getCategoryLabel(cat)}): "${Haven._escapeHtml(mem.content)}"</div>`
      };
    }

    if (name === 'criar_anotacao_diaria' && Store.notes) {
      const imp = ['normal', 'importante', 'super'].includes(args.importancia) ? args.importancia : 'normal';
      const today = Utils.today();
      const note = Store.notes.save({
        type: 'diaria',
        category: 'Geral',
        title: String(args.titulo || 'Anotação do Haven').trim(),
        content: String(args.conteudo || args.titulo || '').trim(),
        importance: imp,
        date: today,
        time: '09:00',
        deadlineDate: args.prazo_data || today,
        deadlineTime: args.prazo_hora || '23:59',
        notifyMessage: String(args.titulo || '').trim(),
        expired: false,
        reminder: { enabled: false }
      });
      return {
        result: { ok: true, id: note.id, title: note.title },
        badgeHtml: `<div class="haven-ai-action-chip">📝 Anotação diária criada: "${Haven._escapeHtml(note.title)}"</div>`
      };
    }

    if (name === 'buscar_memorias') {
      const found = Store.haven.searchMemories(String(args.termo || ''));
      return {
        result: {
          count: found.length,
          memories: found.slice(-10).map(m => ({ content: m.content, category: m.category, date: Haven._formatMemoryDate(m.createdAt) }))
        },
        badgeHtml: ''
      };
    }

    if (name === 'registrar_transacao' && Store.finances) {
      const tipo = args.tipo === 'income' ? 'income' : 'expense';
      const valor = Math.abs(parseFloat(args.valor) || 0);
      if (!valor) return { result: { ok: false, error: 'Valor inválido' }, badgeHtml: '' };

      const tx = Store.finances.saveTransaction({
        type: tipo,
        amount: valor,
        description: String(args.descricao || (tipo === 'income' ? 'Receita (Haven)' : 'Despesa (Haven)')).trim(),
        category: String(args.categoria || 'Outros').trim(),
        date: args.data || Utils.today()
      });

      const sign = tipo === 'income' ? '+' : '-';
      return {
        result: { ok: true, id: tx.id, type: tipo, amount: valor, description: tx.description },
        badgeHtml: `<div class="haven-ai-action-chip">${tipo === 'income' ? '💰' : '💸'} ${tipo === 'income' ? 'Receita' : 'Despesa'} registrada em Finanças: ${sign}R$ ${valor.toFixed(2)} (${Haven._escapeHtml(tx.description)})</div>`
      };
    }

    if (name === 'concluir_habito' && Store.habits) {
      const query = Haven._norm(args.nome_habito || '');
      const habits = Store.habits.getAll();
      const match = habits.find(h => Haven._norm(h.name || '').includes(query));
      if (!match) {
        return { result: { ok: false, error: `Hábito "${args.nome_habito}" não encontrado.` }, badgeHtml: '' };
      }
      const today = Utils.today();
      const already = !!(match.checks && match.checks[today]);
      if (!already) Store.habits.toggleCheck(match.id, today, true);
      return {
        result: { ok: true, id: match.id, name: match.name, alreadyDone: already },
        badgeHtml: `<div class="haven-ai-action-chip">🔥 Hábito "${Haven._escapeHtml(match.name)}" marcado como feito hoje!</div>`
      };
    }

    if (name === 'criar_habito' && Store.habits) {
      const hora = (args.horario_lembrete || '').trim();
      const habit = Store.habits.save({
        name: String(args.nome || 'Novo Hábito').trim(),
        category: String(args.categoria || 'pessoal').trim(),
        type: 'do',
        frequency: 'daily',
        reminder: hora ? { enabled: true, time: hora, days: [0, 1, 2, 3, 4, 5, 6] } : { enabled: false }
      });
      if (hora && window.PWA && typeof PWA.syncRemindersToWorker === 'function') {
        PWA.syncRemindersToWorker().catch(() => {});
      }
      return {
        result: { ok: true, id: habit.id, name: habit.name, reminder: hora || null },
        badgeHtml: `<div class="haven-ai-action-chip">✅ Hábito criado: "${Haven._escapeHtml(habit.name)}"${hora ? ` (alerta às ${hora})` : ''}</div>`
      };
    }

    if (name === 'criar_meta' && Store.goals) {
      const prog = Math.min(100, Math.max(0, Number(args.progresso) || 0));
      const goal = Store.goals.save({
        title: String(args.titulo || 'Nova Meta').trim(),
        progress: prog,
        category: 'pessoal'
      });
      return {
        result: { ok: true, id: goal.id, title: goal.title, progress: prog },
        badgeHtml: `<div class="haven-ai-action-chip">🎯 Meta criada: "${Haven._escapeHtml(goal.title)}" (${prog}%)</div>`
      };
    }

    return { result: { ok: false, error: 'Ação desconhecida' }, badgeHtml: '' };
  },

  _formatMarkdown(md) {
    let safe = Haven._escapeHtml(md);
    // Negrito, itálico e código inline
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    safe = safe.replace(/`([^`]+)`/g, '<code class="haven-inline-code">$1</code>');
    // Listas simples (- ou *)
    const lines = safe.split('\n').map(line => {
      if (/^\s*[-*]\s+/.test(line)) {
        return `<div class="haven-md-li">• ${line.replace(/^\s*[-*]\s+/, '')}</div>`;
      }
      return line;
    });
    return lines.join('<br>').replace(/(<\/div>)<br>/g, '$1');
  },

  friendlyError(err) {
    if (!err) return 'Não consegui falar com a IA — respondi no modo local.';
    if (err.name === 'AbortError') return 'A IA demorou demais para responder — usei o modo local.';
    if (err.status === 400 || err.status === 401 || err.status === 403) return `Erro na API (${err.status}): ${(err.message || 'confira chave/modelo em ⚙️').slice(0, 90)}`;
    if (err.status === 404) return 'Modelo Gemini indisponível — toque em ⚙️ → 🔌 Testar Conexão para atualizar.';
    if (err.status === 429) return 'Limite grátis da IA atingido por agora — voltando ao modo local.';
    if (!navigator.onLine) return 'Sem internet no momento — respondi no modo local.';
    const detail = [err.status || err.name, err.message].filter(Boolean).join(': ').slice(0, 100);
    return `Erro ao consultar a IA (${detail || 'desconhecido'}) — respondi no modo local.`;
  }
};


/* ============================================
   HAVEN ORB — Animação do Agente
   - Idle/Listening/Thinking: Orbe 3D de Plasma no centro da tela
   - Speaking: Onda Azul de Energia com Partículas
   ============================================ */
const HavenOrb = {
  _raf: null,
  _orbCanvasId: null,
  _waveCanvasId: null,
  _state: 'idle',
  _t: 0,
  _sparks: [],

  _ribbons: [
    { tiltX: 0.35, tiltZ: 0.15, speed:  0.85, phase: 0.0, width: 2.2, color: 'rgba(192, 132, 252, 0.90)' },
    { tiltX: -0.55, tiltZ: 0.85, speed: -1.05, phase: 1.3, width: 2.0, color: 'rgba(56, 189, 248, 0.88)' },
    { tiltX: 0.85, tiltZ: -0.45, speed:  1.15, phase: 2.6, width: 1.8, color: 'rgba(232, 121, 249, 0.82)' },
    { tiltX: -0.25, tiltZ: -0.90, speed: -0.75, phase: 3.9, width: 1.6, color: 'rgba(129, 140, 248, 0.86)' },
    { tiltX: 0.55, tiltZ: 0.60, speed:  1.30, phase: 5.1, width: 1.4, color: 'rgba(224, 242, 254, 0.72)' }
  ],

  _waves: [
    { amp: 20, freq: 2.1, speed:  1.8, phase: 0.0, color: 'rgba(56, 189, 248, 0.75)',  fill: 'rgba(37, 99, 235, 0.14)',  width: 2.2 },
    { amp: 15, freq: 3.0, speed: -2.2, phase: 1.4, color: 'rgba(96, 165, 250, 0.85)',  fill: 'rgba(56, 189, 248, 0.12)', width: 1.8 },
    { amp: 24, freq: 1.6, speed:  1.3, phase: 2.7, color: 'rgba(147, 197, 253, 0.90)', fill: 'rgba(59, 130, 246, 0.10)', width: 2.0 },
    { amp: 12, freq: 4.2, speed:  2.7, phase: 4.1, color: 'rgba(125, 211, 252, 0.95)', fill: null,                      width: 1.4 },
    { amp: 18, freq: 2.6, speed: -1.5, phase: 5.0, color: 'rgba(224, 242, 254, 0.90)', fill: null,                      width: 1.2 }
  ],

  init(orbCanvasId, waveCanvasId) {
    this._orbCanvasId = orbCanvasId;
    this._waveCanvasId = waveCanvasId;
    if (this._sparks.length === 0) {
      for (let i = 0; i < 24; i++) {
        this._sparks.push({
          x: Math.random(),
          y: 0.35 + Math.random() * 0.3,
          vy: (Math.random() - 0.5) * 0.004,
          vx: (Math.random() - 0.5) * 0.002,
          r: 1 + Math.random() * 1.8,
          a: 0.3 + Math.random() * 0.7
        });
      }
    }
    this.setState(this._state);
    this._startLoop();
  },

  setState(state) {
    this._state = state || 'idle';
    const stage = document.getElementById('haven-voice-stage');
    const stateEl = document.getElementById('haven-orb-state');
    const textEl = document.getElementById('haven-orb-state-text');
    if (stage) stage.setAttribute('data-state', this._state);
    if (stateEl) stateEl.className = `haven-orb-state is-${this._state}`;
    if (textEl) {
      const labels = {
        idle: '',
        listening: 'Ouvindo você... fale agora',
        thinking: 'Pensando...',
        speaking: 'Falando... toque na onda para silenciar'
      };
      textEl.textContent = labels[this._state] ?? '';
    }
    this._startLoop();
  },

  _startLoop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    const loop = () => {
      const orbCanvas = this._orbCanvasId ? document.getElementById(this._orbCanvasId) : null;
      const waveCanvas = this._waveCanvasId ? document.getElementById(this._waveCanvasId) : null;
      if (!orbCanvas && !waveCanvas) {
        this._raf = null;
        return;
      }

      if (this._state === 'speaking' && waveCanvas) {
        this._drawWave(waveCanvas);
      } else if (orbCanvas) {
        this._drawOrb(orbCanvas);
      }

      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  },

  _drawOrb(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.min(canvas.clientWidth || 176, canvas.clientHeight || 176);
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const speedMul = this._state === 'thinking' ? 2.1 : this._state === 'listening' ? 1.55 : 1.0;
    this._t += 0.022 * speedMul;

    const cx = size / 2;
    const cy = size / 2;
    const pulse = 1 + 0.03 * Math.sin(this._t * 1.8);
    const R = size * 0.34 * pulse;

    // Halo externo roxo/ciano
    const halo = ctx.createRadialGradient(cx, cy, R * 0.25, cx, cy, size * 0.49);
    halo.addColorStop(0, this._state === 'listening' ? 'rgba(56, 189, 248, 0.32)' : 'rgba(168, 85, 247, 0.30)');
    halo.addColorStop(0.55, 'rgba(99, 102, 241, 0.14)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    // Esfera base translúcida com profundidade 3D
    const sphereGrad = ctx.createRadialGradient(cx - R * 0.28, cy - R * 0.28, R * 0.08, cx, cy, R);
    sphereGrad.addColorStop(0, 'rgba(196, 181, 253, 0.38)');
    sphereGrad.addColorStop(0.45, 'rgba(124, 58, 237, 0.28)');
    sphereGrad.addColorStop(0.85, 'rgba(30, 27, 75, 0.55)');
    sphereGrad.addColorStop(1, 'rgba(56, 189, 248, 0.35)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = sphereGrad;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';

    // Fitas 3D de plasma girando dentro da esfera
    const steps = 64;
    for (const rb of this._ribbons) {
      ctx.beginPath();
      const rot = this._t * rb.speed + rb.phase;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const wave = 1 + 0.08 * Math.sin(a * 3 + this._t * 2.2 + rb.phase);
        let x = Math.cos(a) * R * 0.94 * wave;
        let y = Math.sin(a) * R * 0.94 * wave;
        let z = 0;

        // Rotação Y dinâmica
        const x1 = x * Math.cos(rot) - z * Math.sin(rot);
        const z1 = x * Math.sin(rot) + z * Math.cos(rot);
        // Inclinação X
        const y2 = y * Math.cos(rb.tiltX) - z1 * Math.sin(rb.tiltX);
        // Inclinação Z
        const x3 = x1 * Math.cos(rb.tiltZ) - y2 * Math.sin(rb.tiltZ);
        const y3 = x1 * Math.sin(rb.tiltZ) + y2 * Math.cos(rb.tiltZ);

        if (i === 0) ctx.moveTo(cx + x3, cy + y3);
        else ctx.lineTo(cx + x3, cy + y3);
      }
      ctx.strokeStyle = rb.color;
      ctx.lineWidth = rb.width;
      ctx.shadowColor = rb.color;
      ctx.shadowBlur = 12;
      ctx.stroke();
    }

    // Núcleo de energia no centro
    const core = ctx.createRadialGradient(cx, cy, 1, cx, cy, R * 0.55);
    core.addColorStop(0, 'rgba(240, 249, 255, 0.55)');
    core.addColorStop(0.45, 'rgba(168, 85, 247, 0.25)');
    core.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = core;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    ctx.restore();

    // Borda cristalina sutil da esfera
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = this._state === 'listening' ? 'rgba(125, 211, 252, 0.65)' : 'rgba(216, 180, 254, 0.50)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  },

  _drawWave(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 340;
    const h = canvas.clientHeight || 130;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    this._t += 0.038;
    const cy = h / 2;

    // Brilho azul central suave
    const bg = ctx.createRadialGradient(w / 2, cy, 4, w / 2, cy, w * 0.48);
    bg.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
    bg.addColorStop(0.55, 'rgba(37, 99, 235, 0.08)');
    bg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const points = 90;
    for (const wv of this._waves) {
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const u = i / points;
        const x = u * w;
        const env = Math.pow(Math.sin(u * Math.PI), 1.6); // afina nas pontas
        const mod = 0.75 + 0.35 * Math.sin(this._t * 2.1 + wv.phase);
        const y = cy + Math.sin(u * Math.PI * wv.freq * 2 + this._t * wv.speed + wv.phase) * wv.amp * env * mod;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = wv.color;
      ctx.lineWidth = wv.width;
      ctx.shadowColor = wv.color;
      ctx.shadowBlur = 12;
      ctx.stroke();

      if (wv.fill) {
        ctx.lineTo(w, cy);
        ctx.lineTo(0, cy);
        ctx.closePath();
        ctx.fillStyle = wv.fill;
        ctx.shadowBlur = 0;
        ctx.fill();
      }
    }

    // Partículas brilhantes flutuando ao redor da onda
    for (const sp of this._sparks) {
      sp.x += sp.vx;
      sp.y += sp.vy;
      if (sp.x < 0.05 || sp.x > 0.95) sp.vx *= -1;
      if (sp.y < 0.15 || sp.y > 0.85) sp.vy *= -1;
      const sx = sp.x * w;
      const sy = sp.y * h;
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(this._t * 1.5 + sp.x * 10));
      ctx.beginPath();
      ctx.arc(sx, sy, sp.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(186, 230, 253, ${sp.a * twinkle})`;
      ctx.shadowColor = 'rgba(56, 189, 248, 0.9)';
      ctx.shadowBlur = 8;
      ctx.fill();
    }

    ctx.restore();
  }
};

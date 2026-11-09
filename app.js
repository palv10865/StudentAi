// Main Application Logic
const App = {
  currentSection: 'chat',
  chatHistory: [],
  questionHistory: [],
  currentSubject: 'general',
  currentImage: null,
  currentPDF: null,
  isDarkMode: true,
  isListening: false,
  isSpeaking: false,
  currentFlashcards: [],
  currentFlashcardIndex: 0,
  currentQuiz: [],
  currentQuizIndex: 0,
  quizScore: 0,
  recognition: null,
  synth: window.speechSynthesis,
  pdfDoc: null,

  init() {
    this.loadSettings();
    this.setupEventListeners();
    this.setupSpeechRecognition();
    GeminiAPI.init();
    this.renderSubjectSelector();
    this.showSection('chat');
    this.updateTheme();
    this.renderHistory();
    this.checkApiKey();
    Calculator.init();
    StudyTools.init();
    console.log('StudyMind AI initialized');
  },

  loadSettings() {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkMode = savedTheme !== 'light';
    this.currentSubject = localStorage.getItem('subject') || 'general';
  },

  checkApiKey() {
    const key = localStorage.getItem('gemini_api_key');
    if (!key) {
      setTimeout(() => {
        this.showApiKeyModal();
      }, 1000);
    }
  },

  showApiKeyModal() {
    document.getElementById('api-key-modal').classList.add('active');
  },

  hideApiKeyModal() {
    document.getElementById('api-key-modal').classList.remove('active');
  },

  saveApiKey() {
    const key = document.getElementById('modal-api-key').value.trim();
    if (key) {
      localStorage.setItem('gemini_api_key', key);
      this.hideApiKeyModal();
      showToast('API key saved successfully!', 'success');
    } else {
      showToast('Please enter a valid API key', 'error');
    }
  },

  setupEventListeners() {
    // Chat input
    const input = document.getElementById('chat-input');
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    input?.addEventListener('input', this.autoResize);

    // Image upload
    document.getElementById('image-input')?.addEventListener('change', (e) => {
      this.handleImageUpload(e.target.files[0]);
    });

    // PDF upload
    document.getElementById('pdf-input')?.addEventListener('change', (e) => {
      this.handlePDFUpload(e.target.files[0]);
    });

    // Drag and drop
    const dropZone = document.getElementById('chat-input-wrapper');
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) this.handleImageUpload(file);
        else if (file?.type === 'application/pdf') this.handlePDFUpload(file);
      });
    }

    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        document.getElementById('chat-input')?.focus();
      }
      if (e.key === 'Escape') {
        this.hideApiKeyModal();
      }
    });

    // Converter
    document.getElementById('converter-category')?.addEventListener('change', (e) => {
      this.updateConverterUnits(e.target.value);
    });

    ['converter-from-unit', 'converter-to-unit', 'converter-value'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.doConvert());
      document.getElementById(id)?.addEventListener('change', () => this.doConvert());
    });

    // Graph
    document.getElementById('plot-btn')?.addEventListener('click', () => this.plotGraph());
    document.getElementById('graph-expr')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.plotGraph();
    });

    // Settings
    document.getElementById('save-settings')?.addEventListener('click', () => this.saveSettings());

    // Voice input
    document.getElementById('voice-btn')?.addEventListener('click', () => this.toggleVoiceInput());

    // TTS
    document.getElementById('tts-btn')?.addEventListener('click', () => this.toggleTTS());

    // API modal
    document.getElementById('api-key-modal')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('api-key-modal')) this.hideApiKeyModal();
    });
  },

  autoResize(e) {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  },

  showSection(section) {
    this.currentSection = section;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const sectionEl = document.getElementById(`${section}-section`);
    const navEl = document.querySelector(`.nav-item[data-section="${section}"]`);

    if (sectionEl) sectionEl.classList.add('active');
    if (navEl) navEl.classList.add('active');

    // Section-specific init
    if (section === 'formulas') this.renderFormulas();
    if (section === 'curriculum') this.renderCurriculum();
    if (section === 'periodic') this.renderPeriodicTable();
    if (section === 'converter') this.initConverter();
    if (section === 'logic') this.renderLogicGate();
  },

  toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
    document.getElementById('main-content')?.classList.toggle('sidebar-collapsed');
  },

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.updateTheme();
  },

  updateTheme() {
    document.body.classList.toggle('dark', this.isDarkMode);
    document.body.classList.toggle('light', !this.isDarkMode);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = this.isDarkMode ? '☀️' : '🌙';
  },

  // ============ CHAT FUNCTIONS ============
  async sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input?.value.trim();
    if (!text && !this.currentImage) return;

    const userMessage = text || '[Image attached]';
    input.value = '';
    input.style.height = 'auto';

    // Add to history
    this.chatHistory.push({ role: 'user', content: userMessage });
    this.questionHistory.unshift({ question: userMessage, time: new Date().toLocaleTimeString(), subject: this.currentSubject });
    if (this.questionHistory.length > 50) this.questionHistory.pop();
    localStorage.setItem('question_history', JSON.stringify(this.questionHistory));
    this.renderHistory();

    // Display user message
    this.appendMessage('user', userMessage, this.currentImage);
    this.clearPreview();

    const imageData = this.currentImage;
    const pdfText = this.currentPDF;
    this.currentImage = null;
    this.currentPDF = null;

    // Show typing indicator
    const typingId = this.showTyping();

    try {
      let fullResponse = '';
      const msgEl = this.createAssistantMessage();

      // Stream response
      fullResponse = await GeminiAPI.streamMessage(
        this.chatHistory,
        imageData,
        pdfText,
        (chunk, full) => {
          this.updateAssistantMessage(msgEl, full);
        }
      );

      this.removeTyping(typingId);
      this.chatHistory.push({ role: 'assistant', content: fullResponse });

      // Post-process: render math, code, etc.
      this.postProcessMessage(msgEl, fullResponse);

      // Auto-detect difficulty
      this.showDifficultyBadge(msgEl, fullResponse);

      // Suggest related topics
      this.suggestRelatedTopics(fullResponse);

    } catch (e) {
      this.removeTyping(typingId);
      this.appendMessage('error', `❌ ${e.message}`);
    }

    this.scrollToBottom();
  },

  appendMessage(role, content, imageData = null) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `message ${role}-message`;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (role === 'user') {
      let imgHtml = '';
      if (imageData) {
        imgHtml = `<img src="data:${imageData.mimeType};base64,${imageData.base64}" class="message-image" alt="Uploaded image">`;
      }
      div.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-body">
          ${imgHtml}
          <div class="message-text">${this.escapeHtml(content)}</div>
          <div class="message-time">${time}</div>
        </div>`;
    } else if (role === 'error') {
      div.innerHTML = `
        <div class="message-avatar">⚠️</div>
        <div class="message-body">
          <div class="message-text error-text">${content}</div>
          <div class="message-time">${time}</div>
        </div>`;
    } else {
      div.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-body">
          <div class="message-text markdown-content"></div>
          <div class="message-time">${time}</div>
          <div class="message-actions">
            <button class="action-btn" onclick="App.copyMessage(this)" title="Copy">📋 Copy</button>
            <button class="action-btn" onclick="App.speakMessage(this)" title="Read aloud">🔊 Read</button>
            <button class="action-btn" onclick="App.exportMessage(this)" title="Export">💾 Export</button>
          </div>
        </div>`;
    }

    container.appendChild(div);
    this.scrollToBottom();
    return div;
  },

  createAssistantMessage() {
    return this.appendMessage('assistant', '');
  },

  updateAssistantMessage(msgEl, content) {
    if (!msgEl) return;
    const textEl = msgEl.querySelector('.message-text');
    if (textEl) {
      textEl.innerHTML = this.renderMarkdown(content);
    }
    this.scrollToBottom();
  },

  postProcessMessage(msgEl, content) {
    if (!msgEl) return;
    const textEl = msgEl.querySelector('.message-text');
    if (textEl) {
      textEl.innerHTML = this.renderMarkdown(content);
      // Render math
      this.renderMath(textEl);
      // Syntax highlight
      textEl.querySelectorAll('pre code').forEach(block => {
        if (typeof hljs !== 'undefined') hljs.highlightElement(block);
      });
    }
  },

  renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
      return marked.parse(text);
    }
    // Fallback basic markdown
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  },

  renderMath(el) {
    if (typeof renderMathInElement !== 'undefined') {
      try {
        renderMathInElement(el, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false }
          ],
          throwOnError: false
        });
      } catch(e) {}
    }
  },

  showTyping(id) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    const typingId = 'typing-' + Date.now();
    div.id = typingId;
    div.className = 'message assistant-message typing-message';
    div.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-body">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>`;
    container?.appendChild(div);
    this.scrollToBottom();
    return typingId;
  },

  removeTyping(id) {
    document.getElementById(id)?.remove();
  },

  scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) container.scrollTop = container.scrollHeight;
  },

  showDifficultyBadge(msgEl, content) {
    const words = content.split(' ').length;
    let level = 'Basic';
    let color = '#4ecdc4';
    if (words > 300) { level = 'Advanced'; color = '#ff6b6b'; }
    else if (words > 150) { level = 'Intermediate'; color = '#ffd93d'; }

    const badge = document.createElement('span');
    badge.className = 'difficulty-badge';
    badge.style.background = color;
    badge.textContent = level;
    msgEl.querySelector('.message-actions')?.prepend(badge);
  },

  suggestRelatedTopics(content) {
    const topicsEl = document.getElementById('related-topics');
    if (!topicsEl) return;

    // Extract keywords
    const keywords = content.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g) || [];
    const unique = [...new Set(keywords)].slice(0, 5);

    if (unique.length) {
      topicsEl.innerHTML = `
        <div class="related-label">📚 Related topics:</div>
        ${unique.map(k => `<button class="topic-chip" onclick="App.askRelated('${k}')">${k}</button>`).join('')}
      `;
      topicsEl.style.display = 'flex';
    }
  },

  askRelated(topic) {
    document.getElementById('chat-input').value = `Explain ${topic} in detail for BTech students`;
    document.getElementById('chat-input').focus();
  },

  copyMessage(btn) {
    const text = btn.closest('.message-body').querySelector('.message-text').innerText;
    navigator.clipboard.writeText(text);
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = '📋 Copy', 2000);
  },

  speakMessage(btn) {
    const text = btn.closest('.message-body').querySelector('.message-text').innerText;
    if (this.synth.speaking) {
      this.synth.cancel();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    this.synth.speak(utterance);
  },

  async exportMessage(btn) {
    const body = btn.closest('.message-body');
    if (typeof html2canvas !== 'undefined') {
      try {
        const canvas = await html2canvas(body, { backgroundColor: this.isDarkMode ? '#1e1e2e' : '#ffffff' });
        const link = document.createElement('a');
        link.download = 'studymind-solution.png';
        link.href = canvas.toDataURL();
        link.click();
        showToast('Solution exported as image!', 'success');
      } catch(e) {
        showToast('Export failed', 'error');
      }
    } else {
      // Text fallback
      const text = body.querySelector('.message-text').innerText;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'studymind-solution.txt';
      link.href = url;
      link.click();
    }
  },

  clearChat() {
    document.getElementById('chat-messages').innerHTML = '';
    this.chatHistory = [];
    document.getElementById('related-topics').style.display = 'none';
    this.appendWelcomeMessage();
    showToast('Chat cleared');
  },

  appendWelcomeMessage() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'welcome-banner';
    div.innerHTML = `
      <div class="welcome-icon">🧠</div>
      <h2>Welcome to StudyMind AI</h2>
      <p>Your intelligent BTech tutor. Ask me anything about Maths, Physics, Mechanics, Electronics, CS, and more!</p>
      <div class="example-questions">
        <button class="example-btn" onclick="App.setExample(this)">Solve integral of x²sin(x)</button>
        <button class="example-btn" onclick="App.setExample(this)">Explain Fourier Transform</button>
        <button class="example-btn" onclick="App.setExample(this)">Newton's laws of motion</button>
        <button class="example-btn" onclick="App.setExample(this)">Binary search algorithm</button>
        <button class="example-btn" onclick="App.setExample(this)">Derive kinematic equations</button>
        <button class="example-btn" onclick="App.setExample(this)">KVL and KCL examples</button>
      </div>`;
    container.appendChild(div);
  },

  setExample(btn) {
    const input = document.getElementById('chat-input');
    input.value = btn.textContent;
    input.focus();
  },

  // ============ IMAGE/PDF HANDLING ============
  async handleImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1];
      this.currentImage = { base64, mimeType: file.type };
      this.showImagePreview(e.target.result);
      showToast('Image ready to send!', 'success');
    };
    reader.readAsDataURL(file);
  },

  async handlePDFUpload(file) {
    if (!file || file.type !== 'application/pdf') return;
    showToast('Processing PDF...', 'info');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
      }

      this.currentPDF = text;
      this.showPDFPreview(file.name, pdf.numPages);
      showToast(`PDF loaded: ${pdf.numPages} pages`, 'success');
    } catch(e) {
      showToast('PDF processing failed: ' + e.message, 'error');
    }
  },

  showImagePreview(src) {
    const preview = document.getElementById('preview-area');
    if (preview) {
      preview.innerHTML = `
        <div class="preview-item">
          <img src="${src}" alt="Preview" class="preview-img">
          <button class="preview-remove" onclick="App.clearPreview()">✕</button>
        </div>`;
      preview.style.display = 'flex';
    }
  },

  showPDFPreview(name, pages) {
    const preview = document.getElementById('preview-area');
    if (preview) {
      preview.innerHTML = `
        <div class="preview-item pdf-preview">
          <span>📄 ${name} (${pages} pages)</span>
          <button class="preview-remove" onclick="App.clearPreview()">✕</button>
        </div>`;
      preview.style.display = 'flex';
    }
  },

  clearPreview() {
    const preview = document.getElementById('preview-area');
    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
    this.currentImage = null;
    this.currentPDF = null;
    document.getElementById('image-input').value = '';
    document.getElementById('pdf-input').value = '';
  },

  openCamera() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'camera';
    input.onchange = (e) => this.handleImageUpload(e.target.files[0]);
    input.click();
  },

  // ============ VOICE INPUT ============
  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (e) => {
        const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
        document.getElementById('chat-input').value = transcript;
      };

      this.recognition.onend = () => {
        this.isListening = false;
        const btn = document.getElementById('voice-btn');
        if (btn) { btn.textContent = '🎤'; btn.classList.remove('recording'); }
      };

      this.recognition.onerror = (e) => {
        showToast('Voice input error: ' + e.error, 'error');
        this.isListening = false;
      };
    }
  },

  toggleVoiceInput() {
    if (!this.recognition) {
      showToast('Voice input not supported in this browser', 'error');
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.recognition.start();
      this.isListening = true;
      const btn = document.getElementById('voice-btn');
      if (btn) { btn.textContent = '⏹'; btn.classList.add('recording'); }
      showToast('Listening... Speak now!', 'info');
    }
  },

  toggleTTS() {
    if (this.synth.speaking) {
      this.synth.cancel();
      showToast('Speech stopped');
    } else {
      const lastMsg = document.querySelectorAll('.assistant-message .message-text');
      if (lastMsg.length > 0) {
        const text = lastMsg[lastMsg.length - 1].innerText;
        const utterance = new SpeechSynthesisUtterance(text);
        this.synth.speak(utterance);
        showToast('Reading solution aloud...', 'info');
      }
    }
  },

  // ============ SUBJECT SELECTOR ============
  renderSubjectSelector() {
    const container = document.getElementById('subject-pills');
    if (!container) return;
    const subjects = ['general', 'mathematics', 'physics', 'mechanics', 'electronics', 'chemistry', 'programming'];
    const icons = { general: '🎓', mathematics: '∑', physics: '⚛', mechanics: '⚙', electronics: '⚡', chemistry: '🧪', programming: '💻' };
    container.innerHTML = subjects.map(s => `
      <button class="subject-pill ${s === this.currentSubject ? 'active' : ''}" onclick="App.setSubject('${s}')">
        ${icons[s]} ${s.charAt(0).toUpperCase() + s.slice(1)}
      </button>
    `).join('');
  },

  setSubject(subject) {
    this.currentSubject = subject;
    localStorage.setItem('subject', subject);
    document.querySelectorAll('.subject-pill').forEach(p => p.classList.remove('active'));
    document.querySelector(`.subject-pill[onclick*="${subject}"]`)?.classList.add('active');

    const data = SubjectData[subject];
    if (data && data.exampleQuestions) {
      const input = document.getElementById('chat-input');
      const placeholder = data.exampleQuestions[Math.floor(Math.random() * data.exampleQuestions.length)];
      if (input) input.placeholder = `Ask about ${data.name}... e.g., "${placeholder}"`;
    }
    showToast(`Switched to ${subject.charAt(0).toUpperCase() + subject.slice(1)} mode`);
  },

  // ============ FORMULA SHEET ============
  renderFormulas() {
    const container = document.getElementById('formulas-content');
    if (!container) return;

    const subjectKeys = Object.keys(SubjectData);
    let html = `
      <div class="formula-tabs">
        ${subjectKeys.map((k, i) => `<button class="formula-tab ${i === 0 ? 'active' : ''}" onclick="App.showFormulaSubject('${k}', this)">${SubjectData[k].icon} ${SubjectData[k].name}</button>`).join('')}
      </div>
      <div id="formula-display"></div>`;
    container.innerHTML = html;
    this.showFormulaSubject(subjectKeys[0], container.querySelector('.formula-tab'));
  },

  renderCurriculum() {
    const container = document.getElementById('curriculum-content');
    if (!container) return;

    container.innerHTML = Object.entries(CurriculumData).map(([branchKey, branch]) => `
      <section class="curriculum-branch">
        <h3 class="curriculum-branch-title">${this.escapeHtml(branch.name)}</h3>
        ${branch.years.map(year => `
          <div class="curriculum-year">
            <h4 class="curriculum-year-title">${this.escapeHtml(year.name)}</h4>
            <div class="curriculum-semesters">
              ${year.semesters.map(semester => `
                <article class="curriculum-semester">
                  <h4>${this.escapeHtml(semester.name)}</h4>
                  <div class="curriculum-course-list">
                    ${semester.subjects.map(course => `
                      <button class="curriculum-course" onclick="App.startCurriculumCourse(${JSON.stringify(course)}, ${JSON.stringify(branch.name)})">
                        ${this.escapeHtml(course)} <span aria-hidden="true">→</span>
                      </button>
                    `).join('')}
                  </div>
                </article>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </section>
    `).join('');
  },

  startCurriculumCourse(course, branch) {
    const input = document.getElementById('chat-input');
    this.showSection('chat');
    if (input) {
      input.value = `I'm studying ${course} in ${branch}. Explain the key Mumbai University exam topics and show a step-by-step worked example.`;
      input.focus();
      this.autoResize({ target: input });
    }
  },

  showFormulaSubject(subjectKey, btn) {
    document.querySelectorAll('.formula-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const data = SubjectData[subjectKey];
    if (!data) return;
    const display = document.getElementById('formula-display');
    if (!display) return;

    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
      <button class="btn btn-secondary" onclick="App.downloadFormulaSheet('${subjectKey}')">⬇️ Download ${this.escapeHtml(data.name)} Formula Sheet</button>
    </div>`;
    for (const cat of data.formulas) {
      html += `<div class="formula-category">
        <h3 class="formula-cat-title">📐 ${cat.category}</h3>
        <div class="formula-grid">
          ${cat.items.map(item => `
            <div class="formula-card" onclick="App.copyFormula('${item.formula.replace(/'/g, "\\'")}')">
              <div class="formula-name">${item.name}</div>
              <div class="formula-math">\\[${item.formula}\\]</div>
            </div>`).join('')}
        </div>
      </div>`;
    }

    display.innerHTML = html;
    // Render math
    if (typeof renderMathInElement !== 'undefined') {
      try {
        renderMathInElement(display, {
          delimiters: [
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false }
          ],
          throwOnError: false
        });
      } catch(e) {}
    }
  },

  copyFormula(formula) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(`$$${formula}$$`).then(
        () => showToast('Formula copied as LaTeX!'),
        () => showToast('Could not access the clipboard. You can still select the formula.', 'error')
      );
    } else {
      showToast('Clipboard access is unavailable in this browser.', 'error');
    }
  },

  downloadFormulaSheet(subjectKey) {
    const data = SubjectData[subjectKey];
    if (!data) {
      showToast('Formula sheet not found.', 'error');
      return;
    }
    const lines = [`${data.name} Formula Sheet`, 'Created with StudyMind AI', ''];
    data.formulas.forEach(category => {
      lines.push(category.category);
      category.items.forEach(item => lines.push(`${item.name}: ${item.formula}`));
      lines.push('');
    });
    this.downloadTextFile(`${subjectKey}-formula-sheet.txt`, lines.join('\n'));
  },

  downloadFlashcards() {
    if (!this.currentFlashcards.length) {
      showToast('Generate flashcards before downloading.', 'error');
      return;
    }
    const topic = document.getElementById('flashcard-topic')?.value.trim() || 'study';
    const safeTopic = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'study';
    const content = this.currentFlashcards.map((card, index) =>
      `${index + 1}. ${card.front}\nAnswer: ${card.back}`
    ).join('\n\n');
    this.downloadTextFile(`${safeTopic}-flashcards.txt`, `StudyMind AI Flashcards: ${topic}\n\n${content}`);
  },

  downloadTextFile(filename, content) {
    if (window.AndroidDownload && typeof window.AndroidDownload.saveTextFile === 'function') {
      window.AndroidDownload.saveTextFile(filename, content);
      return;
    }
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  // ============ UNIT CONVERTER ============
  initConverter() {
    const catSelect = document.getElementById('converter-category');
    if (catSelect && catSelect.options.length <= 1) {
      catSelect.innerHTML = Object.entries(UnitData).map(([k, v]) =>
        `<option value="${k}">${v.name}</option>`
      ).join('');
    }
    this.updateConverterUnits(catSelect?.value || 'length');
  },

  updateConverterUnits(category) {
    const data = UnitData[category];
    if (!data) return;
    const units = Object.keys(data.units);
    const fromSel = document.getElementById('converter-from-unit');
    const toSel = document.getElementById('converter-to-unit');
    if (fromSel && toSel) {
      const opts = units.map(u => `<option value="${u}">${u}</option>`).join('');
      fromSel.innerHTML = opts;
      toSel.innerHTML = opts;
      if (units.length > 1) toSel.selectedIndex = 1;
    }
    this.doConvert();
  },

  doConvert() {
    const category = document.getElementById('converter-category')?.value;
    const value = document.getElementById('converter-value')?.value;
    const fromUnit = document.getElementById('converter-from-unit')?.value;
    const toUnit = document.getElementById('converter-to-unit')?.value;
    const result = Converter.convert(value, fromUnit, toUnit, category);
    const resultEl = document.getElementById('converter-result');
    if (resultEl) {
      resultEl.textContent = result ? `${result} ${toUnit}` : '-';
    }
  },

  swapUnits() {
    const fromSel = document.getElementById('converter-from-unit');
    const toSel = document.getElementById('converter-to-unit');
    if (fromSel && toSel) {
      const temp = fromSel.value;
      fromSel.value = toSel.value;
      toSel.value = temp;
      this.doConvert();
    }
  },

  // ============ GRAPH PLOTTER ============
  plotGraph() {
    const expr = document.getElementById('graph-expr')?.value.trim();
    if (!expr) { showToast('Enter a function to plot', 'error'); return; }
    const xMin = parseFloat(document.getElementById('graph-xmin')?.value) || -10;
    const xMax = parseFloat(document.getElementById('graph-xmax')?.value) || 10;
    if (xMin >= xMax) { showToast('X min must be less than X max', 'error'); return; }
    GraphPlotter.plot(expr, xMin, xMax);
  },

  // ============ FLASHCARDS ============
  async generateFlashcards() {
    const topic = document.getElementById('flashcard-topic')?.value.trim();
    if (!topic) { showToast('Enter a topic', 'error'); return; }
    const count = parseInt(document.getElementById('flashcard-count')?.value) || 10;

    showToast('Generating flashcards...', 'info');
    const btn = document.getElementById('gen-flashcards-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating...'; }

    try {
      this.currentFlashcards = await GeminiAPI.generateFlashcards(topic, count);
      this.currentFlashcardIndex = 0;
      this.renderFlashcard();
      showToast(`${this.currentFlashcards.length} flashcards generated!`, 'success');
    } catch(e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✨ Generate Flashcards'; }
    }
  },

  renderFlashcard() {
    const container = document.getElementById('flashcard-display');
    if (!container || this.currentFlashcards.length === 0) return;

    const card = this.currentFlashcards[this.currentFlashcardIndex];
    const total = this.currentFlashcards.length;

    container.innerHTML = `
      <div class="flashcard-counter">${this.currentFlashcardIndex + 1} / ${total}</div>
      <div style="display:flex;justify-content:center;margin-bottom:12px;">
        <button class="btn btn-secondary" onclick="App.downloadFlashcards()">⬇️ Download Flashcards</button>
      </div>
      <div class="flashcard" id="fc-card" onclick="this.classList.toggle('flipped')">
        <div class="flashcard-inner">
          <div class="flashcard-front">
            <div class="fc-label">Question</div>
            <div class="fc-content">${this.escapeHtml(card.front || '')}</div>
            <div class="fc-hint">Click to reveal answer</div>
          </div>
          <div class="flashcard-back">
            <div class="fc-label">Answer</div>
            <div class="fc-content">${this.escapeHtml(card.back || '')}</div>
          </div>
        </div>
      </div>
      <div class="flashcard-controls">
        <button class="btn btn-secondary" onclick="App.prevFlashcard()" ${this.currentFlashcardIndex === 0 ? 'disabled' : ''}>← Prev</button>
        <button class="btn btn-primary" onclick="App.nextFlashcard()" ${this.currentFlashcardIndex === total - 1 ? 'disabled' : ''}>Next →</button>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${((this.currentFlashcardIndex+1)/total)*100}%"></div></div>`;

    // Render math in flashcard
    setTimeout(() => {
      if (typeof renderMathInElement !== 'undefined') {
        try { renderMathInElement(container, { delimiters: [{ left: '$', right: '$', display: false }, { left: '$$', right: '$$', display: true }], throwOnError: false }); } catch(e) {}
      }
    }, 100);
  },

  nextFlashcard() {
    if (this.currentFlashcardIndex < this.currentFlashcards.length - 1) {
      this.currentFlashcardIndex++;
      this.renderFlashcard();
    }
  },

  prevFlashcard() {
    if (this.currentFlashcardIndex > 0) {
      this.currentFlashcardIndex--;
      this.renderFlashcard();
    }
  },

  // ============ QUIZ MODE ============
  async generateQuiz() {
    const topic = document.getElementById('quiz-topic')?.value.trim();
    if (!topic) { showToast('Enter a topic', 'error'); return; }
    const count = parseInt(document.getElementById('quiz-count')?.value) || 5;
    const difficulty = document.getElementById('quiz-difficulty')?.value || 'medium';

    showToast('Generating quiz...', 'info');
    const btn = document.getElementById('gen-quiz-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating...'; }

    try {
      this.currentQuiz = await GeminiAPI.generateQuiz(topic, count, difficulty);
      this.currentQuizIndex = 0;
      this.quizScore = 0;
      this.renderQuizQuestion();
      showToast(`Quiz ready! ${count} questions on ${topic}`, 'success');
    } catch(e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🎯 Start Quiz'; }
    }
  },

  renderQuizQuestion() {
    const container = document.getElementById('quiz-display');
    if (!container || this.currentQuiz.length === 0) return;

    if (this.currentQuizIndex >= this.currentQuiz.length) {
      // Quiz complete
      const pct = Math.round((this.quizScore / this.currentQuiz.length) * 100);
      container.innerHTML = `
        <div class="quiz-complete">
          <div class="quiz-score-circle">${pct}%</div>
          <h2>Quiz Complete!</h2>
          <p>You scored <strong>${this.quizScore}</strong> out of <strong>${this.currentQuiz.length}</strong></p>
          <p>${pct >= 80 ? '🏆 Excellent work!' : pct >= 60 ? '👍 Good effort!' : '📚 Keep studying!'}</p>
          <button class="btn btn-primary" onclick="App.restartQuiz()">Try Again</button>
        </div>`;
      return;
    }

    const q = this.currentQuiz[this.currentQuizIndex];
    container.innerHTML = `
      <div class="quiz-progress">Question ${this.currentQuizIndex + 1} of ${this.currentQuiz.length} | Score: ${this.quizScore}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${(this.currentQuizIndex/this.currentQuiz.length)*100}%"></div></div>
      <div class="quiz-question">${q.question}</div>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `
          <button class="quiz-option" onclick="App.selectAnswer(${i}, ${q.correct})" data-idx="${i}">
            ${opt}
          </button>`).join('')}
      </div>
      <div id="quiz-explanation" class="quiz-explanation" style="display:none"></div>
    `;
  },

  selectAnswer(selected, correct) {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => opt.disabled = true);
    
    options[correct].classList.add('correct');
    if (selected !== correct) {
      options[selected].classList.add('incorrect');
    } else {
      this.quizScore++;
    }

    const q = this.currentQuiz[this.currentQuizIndex];
    const expEl = document.getElementById('quiz-explanation');
    if (expEl && q.explanation) {
      expEl.innerHTML = `<strong>Explanation:</strong> ${q.explanation}`;
      expEl.style.display = 'block';
    }

    setTimeout(() => {
      this.currentQuizIndex++;
      this.renderQuizQuestion();
    }, 2500);
  },

  restartQuiz() {
    this.currentQuizIndex = 0;
    this.quizScore = 0;
    this.renderQuizQuestion();
  },

  // ============ NOTES SUMMARIZER ============
  async summarizeNotes() {
    const text = document.getElementById('notes-input')?.value.trim();
    if (!text) { showToast('Enter some notes to summarize', 'error'); return; }

    showToast('Summarizing...', 'info');
    const btn = document.getElementById('summarize-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Summarizing...'; }

    try {
      const summary = await GeminiAPI.summarizeText(text);
      const output = document.getElementById('summary-output');
      if (output) {
        output.innerHTML = App.renderMarkdown(summary);
        App.renderMath(output);
        if (typeof hljs !== 'undefined') output.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
      }
      showToast('Notes summarized!', 'success');
    } catch(e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✨ Summarize'; }
    }
  },

  copySummary() {
    const output = document.getElementById('summary-output');
    if (output) {
      navigator.clipboard.writeText(output.innerText);
      showToast('Summary copied!', 'success');
    }
  },

  // ============ MIND MAP ============
  async generateMindMap() {
    const topic = document.getElementById('mindmap-topic')?.value.trim();
    if (!topic) { showToast('Enter a topic', 'error'); return; }

    showToast('Generating mind map...', 'info');
    try {
      const map = await GeminiAPI.generateMindMap(topic);
      const output = document.getElementById('mindmap-output');
      if (output) {
        output.innerHTML = this.renderMindMapTree(map);
      }
    } catch(e) {
      showToast('Error: ' + e.message, 'error');
    }
  },

  renderMindMapTree(text) {
    const lines = text.split('\n').filter(l => l.trim());
    let html = '<ul class="mindmap-tree">';
    const stack = [{ depth: -1, html: '' }];

    for (const line of lines) {
      const stripped = line.trimStart();
      const depth = line.length - stripped.length;
      const content = stripped.replace(/^[-*•]\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      if (content) {
        html += `<li class="mindmap-node depth-${Math.floor(depth/2)}">${content}</li>`;
      }
    }
    html += '</ul>';
    return html;
  },

  // ============ PERIODIC TABLE ============
  renderPeriodicTable() {
    const container = document.getElementById('periodic-table-container');
    if (!container) return;

    const catColors = {
      'nonmetal': '#4ecdc4', 'noble-gas': '#a29bfe', 'alkali-metal': '#ff6b6b',
      'alkaline-earth': '#ffd93d', 'transition-metal': '#74b9ff', 'metalloid': '#fd79a8',
      'post-transition': '#55efc4', 'halogen': '#fdcb6e'
    };

    let html = '<div class="pt-grid">';
    for (const el of PeriodicTableData) {
      const color = catColors[el.cat] || '#888';
      html += `
        <div class="pt-element" style="background:${color}20; border-color:${color}40" 
             data-element='${JSON.stringify(el)}' onclick="App.showElementInfo(this)"
             title="${el.name}">
          <div class="pt-number">${el.n}</div>
          <div class="pt-symbol">${el.sym}</div>
          <div class="pt-name">${el.name}</div>
          <div class="pt-mass">${el.mass}</div>
        </div>`;
    }
    html += '</div>';
    
    html += `<div class="pt-legend">
      ${Object.entries(catColors).map(([cat, color]) => `
        <span class="pt-legend-item">
          <span style="background:${color};width:12px;height:12px;display:inline-block;border-radius:2px"></span>
          ${cat.replace(/-/g, ' ')}
        </span>`).join('')}
    </div>`;

    container.innerHTML = html;
  },

  showElementInfo(el) {
    const data = JSON.parse(el.dataset.element);
    const modal = document.getElementById('element-modal');
    const content = document.getElementById('element-modal-content');
    if (modal && content) {
      content.innerHTML = `
        <div class="element-detail">
          <div class="element-symbol-large">${data.sym}</div>
          <h2>${data.name}</h2>
          <table class="element-table">
            <tr><td>Atomic Number</td><td>${data.n}</td></tr>
            <tr><td>Atomic Mass</td><td>${data.mass} u</td></tr>
            <tr><td>Category</td><td>${data.cat.replace(/-/g, ' ')}</td></tr>
            <tr><td>Group</td><td>${data.group}</td></tr>
            <tr><td>Period</td><td>${data.period}</td></tr>
          </table>
          <button class="btn btn-primary" onclick="App.askAboutElement('${data.name}')">Ask AI about ${data.sym}</button>
        </div>`;
      modal.classList.add('active');
    }
  },

  askAboutElement(name) {
    document.getElementById('element-modal')?.classList.remove('active');
    this.showSection('chat');
    document.getElementById('chat-input').value = `Tell me about the element ${name} - its properties, uses, and importance in engineering`;
    this.sendMessage();
  },

  // ============ LOGIC GATE SIMULATOR ============
  renderLogicGate() {
    const container = document.getElementById('logic-container');
    if (!container) return;
    
    const gates = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR'];
    container.innerHTML = `
      <div class="logic-controls">
        <label>Gate Type:</label>
        <select id="gate-select" onchange="App.updateLogicGate()">
          ${gates.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
        <div class="logic-inputs" id="logic-inputs"></div>
      </div>
      <div class="truth-table-container" id="truth-table"></div>
      <canvas id="gate-canvas" width="300" height="200"></canvas>`;
    
    this.updateLogicGate();
  },

  updateLogicGate() {
    const gateType = document.getElementById('gate-select')?.value || 'AND';
    const rows = LogicGates.generateTruthTable(gateType);
    const isUnary = gateType === 'NOT';

    const inputsEl = document.getElementById('logic-inputs');
    if (inputsEl) {
      if (isUnary) {
        inputsEl.innerHTML = `
          <label>A: <input type="checkbox" id="input-a" onchange="App.updateLogicGate()"> 
          <span id="val-a">${document.getElementById('input-a')?.checked ? '1' : '0'}</span></label>`;
      } else {
        inputsEl.innerHTML = `
          <label>A: <input type="checkbox" id="input-a" onchange="App.updateLogicGate()"> 
          <span id="val-a">${document.getElementById('input-a')?.checked ? '1' : '0'}</span></label>
          <label>B: <input type="checkbox" id="input-b" onchange="App.updateLogicGate()"> 
          <span id="val-b">${document.getElementById('input-b')?.checked ? '1' : '0'}</span></label>`;
      }
    }

    const A = document.getElementById('input-a')?.checked || false;
    const B = document.getElementById('input-b')?.checked || false;
    const output = LogicGates.evaluate(gateType, A, B);

    const tableEl = document.getElementById('truth-table');
    if (tableEl) {
      const headers = isUnary ? '<th>A</th><th>Output</th>' : '<th>A</th><th>B</th><th>Output</th>';
      const bodyRows = rows.map(r => {
        const highlight = (isUnary ? r.A === A : r.A === A && r.B === B) ? 'class="active-row"' : '';
        return `<tr ${highlight}>
          <td>${r.A ? '1' : '0'}</td>
          ${!isUnary ? `<td>${r.B ? '1' : '0'}</td>` : ''}
          <td class="${r.out ? 'logic-high' : 'logic-low'}">${r.out ? '1' : '0'}</td>
        </tr>`;
      }).join('');
      tableEl.innerHTML = `
        <table class="truth-table">
          <thead><tr>${headers}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
        <div class="logic-output">Output: <span class="logic-result ${output ? 'high' : 'low'}">${output ? '1 (HIGH)' : '0 (LOW)'}</span></div>`;
    }

    this.drawGate(gateType);
  },

  drawGate(gateType) {
    const canvas = document.getElementById('gate-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const isDark = document.body.classList.contains('dark');
    const bgColor = isDark ? '#1e1e2e' : '#ffffff';
    const fgColor = isDark ? '#e0e0e0' : '#333333';
    const gateColor = '#6c63ff';

    ctx.clearRect(0, 0, 300, 200);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 300, 200);
    ctx.strokeStyle = gateColor;
    ctx.fillStyle = gateColor;
    ctx.lineWidth = 2;
    ctx.font = '14px monospace';
    ctx.fillStyle = fgColor;

    // Draw simple gate symbol
    const cx = 150, cy = 100;
    ctx.strokeStyle = gateColor;
    ctx.fillStyle = 'transparent';
    
    // Input lines
    ctx.beginPath();
    ctx.moveTo(60, cy - 20); ctx.lineTo(110, cy - 20);
    ctx.moveTo(60, cy + 20); ctx.lineTo(110, cy + 20);
    ctx.stroke();

    // Gate body
    ctx.beginPath();
    if (gateType === 'NOT') {
      // Triangle
      ctx.moveTo(110, cy - 30);
      ctx.lineTo(110, cy + 30);
      ctx.lineTo(175, cy);
      ctx.closePath();
      ctx.strokeStyle = gateColor;
      ctx.stroke();
      // Bubble
      ctx.beginPath();
      ctx.arc(182, cy, 7, 0, 2*Math.PI);
      ctx.strokeStyle = gateColor;
      ctx.stroke();
      ctx.moveTo(60, cy); ctx.lineTo(110, cy);
      ctx.stroke();
    } else if (gateType === 'AND' || gateType === 'NAND') {
      ctx.moveTo(110, cy - 30);
      ctx.lineTo(140, cy - 30);
      ctx.arc(140, cy, 30, -Math.PI/2, Math.PI/2);
      ctx.lineTo(110, cy + 30);
      ctx.closePath();
      ctx.strokeStyle = gateColor;
      ctx.stroke();
      if (gateType === 'NAND') {
        ctx.beginPath(); ctx.arc(177, cy, 7, 0, 2*Math.PI); ctx.stroke();
      }
    } else {
      // OR-type gates
      ctx.moveTo(110, cy - 30);
      ctx.quadraticCurveTo(140, cy - 30, 175, cy);
      ctx.quadraticCurveTo(140, cy + 30, 110, cy + 30);
      ctx.quadraticCurveTo(130, cy, 110, cy - 30);
      ctx.strokeStyle = gateColor;
      ctx.stroke();
      if (gateType === 'NOR' || gateType === 'XNOR') {
        ctx.beginPath(); ctx.arc(182, cy, 7, 0, 2*Math.PI); ctx.stroke();
      }
      if (gateType === 'XOR' || gateType === 'XNOR') {
        ctx.beginPath();
        ctx.moveTo(104, cy - 30);
        ctx.quadraticCurveTo(124, cy, 104, cy + 30);
        ctx.stroke();
      }
    }

    // Output line
    const outX = gateType === 'NOT' ? 189 : (gateType === 'NAND' || gateType === 'NOR' || gateType === 'XNOR' ? 189 : 175);
    ctx.beginPath();
    ctx.moveTo(outX, cy); ctx.lineTo(240, cy);
    ctx.strokeStyle = gateColor;
    ctx.stroke();

    // Labels
    ctx.fillStyle = fgColor;
    ctx.fillText('A', 42, cy - 15);
    if (gateType !== 'NOT') ctx.fillText('B', 42, cy + 25);
    ctx.fillText('Y', 248, cy + 5);
    ctx.fillText(gateType, cx - 20, 25);
  },

  // ============ HISTORY ============
  renderHistory() {
    const saved = localStorage.getItem('question_history');
    if (saved) this.questionHistory = JSON.parse(saved);

    const container = document.getElementById('history-list');
    if (!container) return;
    if (this.questionHistory.length === 0) {
      container.innerHTML = '<div class="history-empty">No history yet</div>';
      return;
    }
    container.innerHTML = this.questionHistory.slice(0, 20).map((item, i) => `
      <div class="history-item" onclick="App.loadFromHistory('${encodeURIComponent(item.question)}')">
        <div class="history-q">${this.escapeHtml(item.question.substring(0, 60))}${item.question.length > 60 ? '...' : ''}</div>
        <div class="history-meta">${item.subject || 'general'} • ${item.time}</div>
      </div>`).join('');
  },

  loadFromHistory(encoded) {
    const question = decodeURIComponent(encoded);
    document.getElementById('chat-input').value = question;
    this.showSection('chat');
    document.getElementById('chat-input').focus();
  },

  clearHistory() {
    this.questionHistory = [];
    localStorage.removeItem('question_history');
    this.renderHistory();
    showToast('History cleared');
  },

  // ============ SETTINGS ============
  saveSettings() {
    const apiKey = document.getElementById('settings-api-key')?.value.trim();
    const model = document.getElementById('settings-model')?.value;

    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    }
    if (model) {
      GeminiAPI.setModel(model);
    }
    showToast('Settings saved!', 'success');
  },

  loadSettingsForm() {
    const apiKeyEl = document.getElementById('settings-api-key');
    const modelEl = document.getElementById('settings-model');
    if (apiKeyEl) apiKeyEl.value = localStorage.getItem('gemini_api_key') || '';
    if (modelEl) modelEl.value = GeminiAPI.model;
  },

  // ============ UTILITIES ============
  escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }
};

// Toast notification system
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span>${message}</span>`;
  
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
  App.appendWelcomeMessage();
  App.loadSettingsForm();

  // Init converter
  setTimeout(() => App.initConverter(), 100);
});

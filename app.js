// Main Application Logic
const App = {
  currentSection: 'chat',
  chatHistory: [],
  chatSessions: [],
  activeChatId: null,
  chatStorageAvailable: true,
  institutionProfile: null,
  studentName: '',
  syllabusText: '',
  syllabusFileName: '',
  questionHistory: [],
  currentSubject: 'general',
  currentImage: null,
  currentPDF: null,
  voiceStyle: '',
  voiceChatEnabled: false,
  pendingVoiceAction: '',
  voiceTranscript: '',
  speechToken: 0,
  activeUtteranceId: '',
  speechNextChunk: null,
  isSending: false,
  isDarkMode: true,
  isListening: false,
  isSpeaking: false,
  currentFlashcards: [],
  currentFlashcardIndex: 0,
  currentMindMap: '',
  currentQuiz: [],
  currentQuizIndex: 0,
  quizScore: 0,
  recognition: null,
  synth: window.speechSynthesis,
  pdfDoc: null,

  init() {
    this.loadSettings();
    const needsStudentSetup = !this.institutionProfile || !this.studentName;
    this.loadSavedConversations();
    this.setupEventListeners();
    this.setupSpeechRecognition();
    GeminiAPI.init();
    this.renderSubjectSelector();
    this.showSection(needsStudentSetup ? 'dashboard' : 'chat');
    this.updateTheme();
    this.renderHistory();
    this.renderDashboard();
    this.updateSyllabusStatus();
    this.updateVoiceChatButton();
    if (needsStudentSetup) this.openInstitutionSetup(true);
    else this.checkApiKey();
    Calculator.init();
    StudyTools.init();
    console.log('StudyMind AI initialized');
  },

  loadSettings() {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkMode = savedTheme !== 'light';
    this.currentSubject = localStorage.getItem('subject') || 'general';
    this.studentName = localStorage.getItem('student_name')?.trim().slice(0, 40) || '';
    const savedVoiceStyle = localStorage.getItem('voice_style');
    this.voiceStyle = ['jarvis', 'friday'].includes(savedVoiceStyle) ? savedVoiceStyle : '';
    this.syllabusText = localStorage.getItem('official_syllabus_text') || '';
    this.syllabusFileName = localStorage.getItem('official_syllabus_name') || '';

    try {
      const savedProfile = JSON.parse(localStorage.getItem('institution_profile') || 'null');
      if (savedProfile && ['mu', 'autonomous'].includes(savedProfile.type)
          && ['computerEngineering', 'cyberSecurity'].includes(savedProfile.program)
          && Number.isInteger(Number(savedProfile.semester))
          && Number(savedProfile.semester) >= 1 && Number(savedProfile.semester) <= 8) {
        this.institutionProfile = {
          type: savedProfile.type,
          program: savedProfile.program,
          semester: Number(savedProfile.semester)
        };
      }
    } catch (error) {
      console.error('Unable to load university profile:', error);
      showToast('University profile could not be read. Please choose your university again.', 'error');
    }
  },

  openInstitutionSetup(required = false) {
    const modal = document.getElementById('institution-modal');
    if (!modal) return;
    const typeInput = document.getElementById('institution-type');
    const programInput = document.getElementById('institution-program');
    const semesterInput = document.getElementById('institution-semester');
    const studentNameInput = document.getElementById('student-name');
    if (studentNameInput) studentNameInput.value = this.studentName;
    if (typeInput) typeInput.value = this.institutionProfile?.type || '';
    if (programInput) programInput.value = this.institutionProfile?.program || 'computerEngineering';
    if (semesterInput) semesterInput.value = String(this.institutionProfile?.semester || 1);
    modal.dataset.required = required ? 'true' : 'false';
    const cancelButton = document.getElementById('institution-cancel');
    if (cancelButton) cancelButton.hidden = required;
    modal.classList.add('active');
  },

  cancelInstitutionSetup() {
    const modal = document.getElementById('institution-modal');
    if (modal?.dataset.required === 'true') return;
    modal?.classList.remove('active');
  },

  saveInstitutionProfile() {
    const studentNameInput = document.getElementById('student-name');
    const studentName = studentNameInput?.value.trim().replace(/\s+/g, ' ');
    const type = document.getElementById('institution-type')?.value;
    const program = document.getElementById('institution-program')?.value;
    const semester = Number(document.getElementById('institution-semester')?.value);
    if (!studentName || studentName.length > 40
        || !['mu', 'autonomous'].includes(type)
        || !['computerEngineering', 'cyberSecurity'].includes(program)
        || !Number.isInteger(semester) || semester < 1 || semester > 8) {
      showToast('Enter your name and choose a university, course, and semester to continue.', 'error');
      return;
    }

    const institutionProfile = { type, program, semester };
    try {
      localStorage.setItem('student_name', studentName);
      localStorage.setItem('institution_profile', JSON.stringify(institutionProfile));
    } catch (error) {
      console.error('Unable to save student profile:', error);
      showToast('Could not save your student profile on this device.', 'error');
      return;
    }

    this.studentName = studentName;
    this.institutionProfile = institutionProfile;
    document.getElementById('institution-modal')?.classList.remove('active');
    this.renderDashboard();
    this.updateSyllabusStatus();
    this.renderSubjectSelector();
    if (this.currentSection === 'curriculum') this.renderCurriculum();
    this.checkApiKey();
    showToast('Student profile saved on this device.', 'success');
  },

  getInstitutionName() {
    return this.institutionProfile?.type === 'autonomous'
      ? 'Autonomous — SLRTCE'
      : 'Mumbai University (non-autonomous)';
  },

  getProgramName() {
    const curriculum = this.institutionProfile?.type === 'autonomous'
      ? SLRTCECurriculumData
      : CurriculumData;
    return curriculum[this.institutionProfile?.program]?.name || 'Computer Engineering';
  },

  renderDashboard() {
    this.renderStudentBadge();
    const profile = document.getElementById('dashboard-profile');
    if (profile) {
      profile.textContent = this.institutionProfile
        ? `${this.getInstitutionName()} · ${this.getProgramName()} · Semester ${this.institutionProfile.semester}`
        : 'Choose your university and course to personalize your study space.';
    }
  },

  renderStudentBadge() {
    const name = this.studentName || 'Student';
    const initials = name === 'Student'
      ? 'ST'
      : name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
    const avatar = document.getElementById('student-profile-avatar');
    const nameElement = document.getElementById('student-profile-name');
    const role = document.getElementById('student-profile-role');
    if (avatar) avatar.textContent = initials;
    if (nameElement) nameElement.textContent = name;
    if (role) {
      role.textContent = this.institutionProfile
        ? `${this.getProgramName()} · ${this.institutionProfile.type === 'autonomous' ? 'SLRTCE' : 'Mumbai University'}`
        : 'StudyMind AI student';
    }
  },

  async importSyllabus(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Choose a PDF syllabus file.', 'error');
      return;
    }
    if (typeof pdfjsLib === 'undefined') {
      showToast('The PDF reader is still loading. Please try again in a moment.', 'error');
      return;
    }

    showToast('Reading syllabus PDF...', 'info');
    try {
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      let characterCount = 0;
      let pagesRead = 0;
      let textWasLimited = false;
      const maxCharacters = 500000;
      const maxPages = 200;
      for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, maxPages) && characterCount < maxCharacters; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageContents = content.items.map(item => item.str).join(' ');
        const pageText = pageContents.slice(0, maxCharacters - characterCount);
        if (pageText.length < pageContents.length) textWasLimited = true;
        pages.push(`[SYLLABUS PAGE ${pageNumber}]\n${pageText}`);
        characterCount += pageText.length;
        pagesRead = pageNumber;
      }
      const text = pages.join('\n\n').trim();
      if (!text) {
        showToast('No selectable text was found. Use a text-based PDF syllabus.', 'error');
        return;
      }

      localStorage.setItem('official_syllabus_text', text);
      localStorage.setItem('official_syllabus_name', file.name);
      this.syllabusText = text;
      this.syllabusFileName = file.name;
      this.updateSyllabusStatus();
      this.renderDashboard();
      const partial = pagesRead < pdf.numPages || textWasLimited;
      showToast(
        `Syllabus imported (${pagesRead} pages${partial ? '; file text was limited to keep on-device storage manageable' : ''}).`,
        'success'
      );
    } catch (error) {
      console.error('Unable to import syllabus PDF:', error);
      showToast(`Could not import syllabus: ${error.message}`, 'error');
    } finally {
      const input = document.getElementById('syllabus-file-input');
      if (input) input.value = '';
    }
  },

  updateSyllabusStatus() {
    const status = document.getElementById('syllabus-status');
    const settingsStatus = document.getElementById('settings-syllabus-status');
    const clearButton = document.getElementById('clear-syllabus-btn');
    const hasSyllabus = Boolean(this.syllabusText);
    const message = hasSyllabus
      ? `Imported: ${this.syllabusFileName || 'official syllabus PDF'} · available to AI study tools on this device.`
      : this.institutionProfile?.type === 'autonomous'
        ? 'No syllabus imported. Download an available official PDF below and import it for syllabus-specific AI study.'
        : 'No official syllabus imported. Add your course PDF for syllabus-specific answers; the built-in course guide is a general study aid.';
    if (status) status.textContent = message;
    if (settingsStatus) settingsStatus.textContent = hasSyllabus
      ? `Syllabus: ${this.syllabusFileName || 'Imported PDF'}`
      : 'No official syllabus PDF imported.';
    if (clearButton) clearButton.hidden = !hasSyllabus;
    const settingsProfile = document.getElementById('settings-profile');
    if (settingsProfile) {
      settingsProfile.textContent = this.institutionProfile
        ? `${this.studentName || 'Student'} · ${this.getInstitutionName()} · ${this.getProgramName()} · Semester ${this.institutionProfile.semester}`
        : `${this.studentName || 'Student'} · University and course not selected.`;
    }
    const curriculumProfile = document.getElementById('curriculum-profile');
    if (curriculumProfile) {
      curriculumProfile.textContent = this.institutionProfile
        ? `${this.getInstitutionName()} · ${this.getProgramName()} · Semester ${this.institutionProfile.semester}`
        : 'Choose your university and course in Settings.';
    }
    const curriculumNotice = document.getElementById('curriculum-notice');
    if (curriculumNotice) {
      if (this.institutionProfile?.type === 'autonomous') {
        const branch = SLRTCECurriculumData[this.institutionProfile.program];
        const studyNote = hasSyllabus
          ? ' AI study tools can use your imported syllabus text; confirm updates with your college.'
          : ' If an official PDF is available for your year, download and import it for syllabus-specific AI study.';
        curriculumNotice.textContent = `${branch?.notice || 'Use the official SLRTCE syllabus links below.'} Expand a subject to view verified module names when available; use the PDF for the complete syllabus and elective details.${studyNote}`;
      } else {
        curriculumNotice.textContent = hasSyllabus
          ? 'AI study tools can use your imported syllabus. Confirm exam schemes and updates with your college.'
          : 'Mumbai University subjects and module names vary by scheme and admission year; import your official syllabus PDF to confirm the modules.';
      }
    }
  },

  clearSyllabus() {
    if (!confirm('Remove the imported syllabus from this device?')) return;
    localStorage.removeItem('official_syllabus_text');
    localStorage.removeItem('official_syllabus_name');
    this.syllabusText = '';
    this.syllabusFileName = '';
    this.updateSyllabusStatus();
    showToast('Imported syllabus removed from this device.');
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

    document.getElementById('syllabus-file-input')?.addEventListener('change', (e) => {
      this.importSyllabus(e.target.files[0]);
    });

    document.getElementById('tool-search')?.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      document.querySelectorAll('.study-hub-card').forEach(card => {
        card.hidden = !card.dataset.toolCard.includes(query);
      });
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
        this.closeMobileSidebar();
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
    if (section === 'dashboard') this.renderDashboard();
    if (section === 'formulas') this.renderFormulas();
    if (section === 'curriculum') this.renderCurriculum();
    if (section === 'periodic') this.renderPeriodicTable();
    if (section === 'converter') this.initConverter();
    if (section === 'logic') this.renderLogicGate();
    this.closeMobileSidebar();
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (window.matchMedia('(max-width: 768px)').matches) {
      sidebar.classList.toggle('mobile-open');
      this.updateMobileSidebarState();
      return;
    }

    sidebar.classList.toggle('collapsed');
    document.getElementById('main-content')?.classList.toggle('sidebar-collapsed');
  },

  closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || !window.matchMedia('(max-width: 768px)').matches) return;
    sidebar.classList.remove('mobile-open');
    this.updateMobileSidebarState();
  },

  updateMobileSidebarState() {
    const sidebar = document.getElementById('sidebar');
    const isOpen = Boolean(sidebar?.classList.contains('mobile-open'));
    const toggle = document.getElementById('sidebar-toggle');
    const backdrop = document.getElementById('sidebar-backdrop');
    toggle?.setAttribute('aria-expanded', String(isOpen));
    backdrop?.classList.toggle('active', isOpen);
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
    if (!text && !this.currentImage && !this.currentPDF) return;
    if (this.isSending) return;
    if (this.isListening) this.stopVoiceRecognition();
    this.isSending = true;

    const attachmentLabel = this.currentImage && this.currentPDF
      ? 'Please inspect the attached image and PDF and answer the question shown.'
      : this.currentImage
        ? 'Please inspect the attached image and answer the question shown. If no question is visible, describe its content.'
        : '[PDF attached]';
    const userMessage = text || attachmentLabel;
    input.value = '';
    input.style.height = 'auto';

    // Add to history
    this.chatHistory.push({
      role: 'user',
      content: userMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.persistConversation();
    this.questionHistory.unshift({ question: userMessage, time: new Date().toLocaleTimeString(), subject: this.currentSubject });
    if (this.questionHistory.length > 50) this.questionHistory.pop();
    localStorage.setItem('question_history', JSON.stringify(this.questionHistory));
    this.renderHistory();

    const imageData = this.currentImage;
    const pdfText = this.currentPDF;

    // Display user message
    this.appendMessage('user', userMessage, imageData);
    this.clearPreview();

    this.currentImage = null;
    this.currentPDF = null;

    // Show typing indicator
    const typingId = this.showTyping();

    let responseReceived = false;
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
      this.chatHistory.push({
        role: 'assistant',
        content: fullResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      this.persistConversation();

      // Post-process: render math, code, etc.
      this.postProcessMessage(msgEl, fullResponse);

      // Auto-detect difficulty
      this.showDifficultyBadge(msgEl, fullResponse);

      // Suggest related topics
      this.suggestRelatedTopics(fullResponse);
      responseReceived = true;

    } catch (e) {
      this.removeTyping(typingId);
      this.appendMessage('error', `❌ ${e.message}`);
    } finally {
      this.isSending = false;
      if (this.voiceChatEnabled) {
        const assistantMessages = this.chatHistory.filter(message => message.role === 'assistant');
        const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
        if (responseReceived && lastAssistantMessage) {
          this.speakText(lastAssistantMessage.content, () => {
            if (this.voiceChatEnabled) this.startVoiceRecognition();
          });
        } else {
          this.startVoiceRecognition();
        }
      }
    }

    this.scrollToBottom();
  },

  appendMessage(role, content, imageData = null, messageTime = null) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `message ${role}-message`;

    const time = messageTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
          <div class="message-text error-text">${this.escapeHtml(content)}</div>
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
    let html;
    if (typeof marked !== 'undefined') {
      html = marked.parse(text);
    } else {
      const escapedText = this.escapeHtml(text);
      html = escapedText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    }
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html) : this.escapeHtml(text);
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
    this.speakText(text);
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
    this.startNewChat();
  },

  startNewChat() {
    this.activeChatId = null;
    this.chatHistory = [];
    localStorage.removeItem('active_chat_id');
    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('related-topics').style.display = 'none';
    this.appendWelcomeMessage();
    this.renderHistory();
    this.showSection('chat');
    showToast('New chat started. Saved conversations are kept in History.');
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
      const dataUrl = e.target?.result;
      if (typeof dataUrl !== 'string' || !dataUrl.includes(',')) {
        showToast('Could not read this photo. Please try another image.', 'error');
        return;
      }
      const base64 = dataUrl.split(',')[1];
      this.currentImage = { base64, mimeType: file.type };
      this.showImagePreview(dataUrl);
      showToast('Image ready to send!', 'success');
    };
    reader.onerror = () => showToast('Could not read this photo. Please try another image.', 'error');
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
    if (!SpeechRecognition) return;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-IN';

    this.recognition.onresult = (event) => {
      const results = Array.from(event.results);
      this.voiceTranscript = results.filter(result => result.isFinal)
        .map(result => result[0].transcript.trim()).filter(Boolean).join(' ');
      const interim = results.filter(result => !result.isFinal)
        .map(result => result[0].transcript.trim()).filter(Boolean).join(' ');
      const input = document.getElementById('chat-input');
      if (input) input.value = [this.voiceTranscript, interim].filter(Boolean).join(' ');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateVoiceInputButton();
      if (this.voiceTranscript.trim() && this.voiceChatEnabled) {
        this.sendMessage();
      } else if (this.voiceTranscript.trim()) {
        showToast('Voice note ready. Review it, then tap send.', 'success');
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      this.updateVoiceInputButton();
      if (event.error === 'aborted') return;
      const messages = {
        'not-allowed': 'Allow microphone access to use voice input.',
        'no-speech': 'No speech detected. Tap the microphone and try again.',
        'audio-capture': 'No microphone is available on this device.',
        network: 'Speech recognition needs a working internet connection.'
      };
      showToast(messages[event.error] || `Voice input error: ${event.error}`, 'error');
    };
  },

  toggleVoiceInput() {
    if (!this.voiceStyle) {
      this.pendingVoiceAction = 'input';
      document.getElementById('voice-style-modal')?.classList.add('active');
      return;
    }
    if (!this.recognition && !this.hasAndroidSpeechRecognition()) {
      showToast('Voice input not supported in this browser', 'error');
      return;
    }
    if (this.isListening) {
      this.stopVoiceRecognition();
    } else {
      this.startVoiceRecognition();
    }
  },

  hasAndroidSpeechRecognition() {
    try {
      return Boolean(window.AndroidSpeech?.isRecognitionAvailable());
    } catch (error) {
      console.error('Unable to access Android speech recognition:', error);
      return false;
    }
  },

  hasAndroidSpeechSynthesis() {
    return Boolean(window.AndroidSpeech && typeof window.AndroidSpeech.speakText === 'function');
  },

  startVoiceRecognition() {
    if (this.isListening || this.isSending || this.isSpeaking) return;
    this.voiceTranscript = '';
    const input = document.getElementById('chat-input');
    if (input) input.value = '';
    try {
      if (this.hasAndroidSpeechRecognition()) {
        window.AndroidSpeech.startListening('en-IN');
      } else if (this.recognition) {
        this.recognition.start();
      } else {
        showToast('Voice input is not supported by this browser.', 'error');
        if (this.voiceChatEnabled) this.setVoiceChatEnabled(false);
        return;
      }
      this.isListening = true;
      this.updateVoiceInputButton();
      showToast('Listening… speak now.', 'info');
    } catch (error) {
      this.isListening = false;
      this.updateVoiceInputButton();
      console.error('Unable to start voice recognition:', error);
      showToast('Could not start voice input. Check microphone permission and try again.', 'error');
      if (this.voiceChatEnabled) this.setVoiceChatEnabled(false);
    }
  },

  stopVoiceRecognition() {
    if (!this.isListening) return;
    try {
      if (this.hasAndroidSpeechRecognition()) window.AndroidSpeech.stopListening();
      else this.recognition?.stop();
    } catch (error) {
      console.error('Unable to stop voice recognition:', error);
      showToast('Could not stop voice input cleanly.', 'error');
    }
  },

  updateVoiceInputButton() {
    const button = document.getElementById('voice-btn');
    if (!button) return;
    button.textContent = this.isListening ? '⏹' : '🎤';
    button.classList.toggle('recording', this.isListening);
    button.setAttribute('aria-label', this.isListening ? 'Stop voice input' : 'Start voice input');
    button.title = this.isListening ? 'Stop voice input' : 'Voice input';
  },

  updateVoiceChatButton() {
    const button = document.getElementById('voice-chat-btn');
    if (!button) return;
    button.setAttribute('aria-pressed', String(this.voiceChatEnabled));
    button.textContent = this.voiceChatEnabled ? '⏹ End voice chat' : '🎙️ Start voice chat';
  },

  setVoiceChatEnabled(enabled) {
    this.voiceChatEnabled = enabled;
    this.updateVoiceChatButton();
    if (!enabled) {
      this.stopVoiceRecognition();
      this.stopSpeaking();
    }
  },

  toggleVoiceChat() {
    if (this.voiceChatEnabled) {
      this.setVoiceChatEnabled(false);
      showToast('Voice chat ended.');
      return;
    }
    if (!this.voiceStyle) {
      this.pendingVoiceAction = 'voice-chat';
      document.getElementById('voice-style-modal')?.classList.add('active');
      return;
    }
    this.setVoiceChatEnabled(true);
    this.startVoiceRecognition();
  },

  selectVoiceStyle(style) {
    if (!['jarvis', 'friday'].includes(style)) return;
    try {
      localStorage.setItem('voice_style', style);
    } catch (error) {
      console.error('Unable to save assistant voice style:', error);
      showToast('Could not save your voice preference on this device.', 'error');
      return;
    }
    this.voiceStyle = style;
    const setting = document.getElementById('voice-style-setting');
    if (setting) setting.value = style;
    document.getElementById('voice-style-modal')?.classList.remove('active');
    const action = this.pendingVoiceAction;
    this.pendingVoiceAction = '';
    if (action === 'voice-chat') this.toggleVoiceChat();
    else if (action === 'input') this.toggleVoiceInput();
  },

  dismissVoiceStyle() {
    this.pendingVoiceAction = '';
    document.getElementById('voice-style-modal')?.classList.remove('active');
  },

  onAndroidSpeechResult(text, isFinal) {
    const transcript = typeof text === 'string' ? text.trim() : '';
    if (!transcript) return;
    this.voiceTranscript = transcript;
    const input = document.getElementById('chat-input');
    if (input) input.value = transcript;
    if (isFinal) this.voiceTranscript = transcript;
  },

  onAndroidSpeechEnd() {
    this.isListening = false;
    this.updateVoiceInputButton();
    if (this.voiceTranscript.trim() && this.voiceChatEnabled) {
      this.sendMessage();
    } else if (this.voiceTranscript.trim()) {
      showToast('Voice note ready. Review it, then tap send.', 'success');
    }
  },

  onAndroidSpeechReady() {
    this.isListening = true;
    this.updateVoiceInputButton();
  },

  onAndroidSpeechError(errorCode) {
    this.isListening = false;
    this.updateVoiceInputButton();
    const messages = {
      '7': 'No speech detected. Tap the microphone and try again.',
      '8': 'The speech service is busy. Please try again.',
      '9': 'Allow microphone access to use voice input.',
      '1': 'Speech recognition needs a working internet connection.',
      '5': 'Could not start speech recognition. Check your device speech service and try again.'
    };
    showToast(messages[String(errorCode)] || 'Voice input failed. Check microphone access and try again.', 'error');
    if (this.voiceChatEnabled) this.setVoiceChatEnabled(false);
  },

  onAndroidSpeechChunkEnd(utteranceId) {
    if (utteranceId !== this.activeUtteranceId || !this.speechNextChunk) return;
    this.speechNextChunk();
  },

  onAndroidSpeechPlaybackError(utteranceId) {
    if (utteranceId && utteranceId !== this.activeUtteranceId) return;
    this.stopSpeaking();
    console.error('Android text-to-speech playback failed.');
    showToast('Could not play the spoken response. Check your device text-to-speech settings.', 'error');
    if (this.voiceChatEnabled) this.setVoiceChatEnabled(false);
  },

  getSpeechText(text) {
    return text
      .replace(/```[\s\S]*?```/g, ' Code example omitted. ')
      .replace(/!\[[^\]]*]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/^\s{0,3}#{1,6}\s*/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+[.)]\s+/gm, '')
      .replace(/[*_~`>#|]/g, ' ')
      .replace(/\$\$?([^$]+)\$\$?/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  },

  stopSpeaking() {
    this.speechToken++;
    this.isSpeaking = false;
    this.activeUtteranceId = '';
    this.speechNextChunk = null;
    try {
      this.synth?.cancel();
      if (this.hasAndroidSpeechSynthesis()) window.AndroidSpeech.stopSpeaking();
    } catch (error) {
      console.error('Unable to stop speech playback:', error);
    }
  },

  speakText(text, onComplete = null) {
    const spokenText = this.getSpeechText(text);
    if (!spokenText) {
      if (onComplete) onComplete();
      return;
    }
    const nativeSpeech = this.hasAndroidSpeechSynthesis();
    if (!nativeSpeech && (!this.synth || typeof SpeechSynthesisUtterance === 'undefined')) {
      showToast('Spoken responses are not supported by this device.', 'error');
      if (this.voiceChatEnabled) this.setVoiceChatEnabled(false);
      return;
    }

    this.stopSpeaking();
    const token = this.speechToken;
    const style = this.voiceStyle === 'friday' ? 'friday' : 'jarvis';
    const voices = this.synth?.getVoices?.() || [];
    const englishVoices = voices.filter(voice => /^en([_-]|$)/i.test(voice.lang));
    const voice = englishVoices.find(item => /^en[-_]in/i.test(item.lang))
      || englishVoices[0];
    const utteranceChunks = [];
    let remaining = spokenText;
    while (remaining.length > 1800) {
      let splitAt = remaining.lastIndexOf(' ', 1800);
      if (splitAt < 900) splitAt = 1800;
      utteranceChunks.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trim();
    }
    if (remaining) utteranceChunks.push(remaining);

    this.isSpeaking = true;
    let chunkIndex = 0;
    const speakNext = () => {
      if (token !== this.speechToken || !this.voiceChatEnabled && onComplete) return;
      if (chunkIndex >= utteranceChunks.length) {
        this.isSpeaking = false;
        this.activeUtteranceId = '';
        this.speechNextChunk = null;
        if (onComplete) onComplete();
        return;
      }
      const currentChunkIndex = chunkIndex++;
      if (nativeSpeech) {
        const utteranceId = `${token}-${currentChunkIndex}`;
        this.activeUtteranceId = utteranceId;
        this.speechNextChunk = speakNext;
        try {
          window.AndroidSpeech.speakText(utteranceChunks[currentChunkIndex], style, utteranceId);
        } catch (error) {
          this.onAndroidSpeechPlaybackError(utteranceId);
        }
        return;
      }
      const utterance = new SpeechSynthesisUtterance(utteranceChunks[currentChunkIndex]);
      utterance.lang = voice?.lang || 'en-IN';
      if (voice) utterance.voice = voice;
      utterance.rate = style === 'friday' ? 1 : 0.92;
      utterance.pitch = style === 'friday' ? 1.08 : 0.86;
      utterance.onend = speakNext;
      utterance.onerror = event => {
        if (token !== this.speechToken || event.error === 'canceled' || event.error === 'interrupted') return;
        this.isSpeaking = false;
        console.error('Speech playback failed:', event.error);
        showToast('Could not play the spoken response. Check your device voice settings.', 'error');
        if (this.voiceChatEnabled) this.setVoiceChatEnabled(false);
      };
      this.synth.speak(utterance);
    };
    speakNext();
  },

  toggleTTS() {
    if (this.isSpeaking || this.synth?.speaking) {
      this.stopSpeaking();
      showToast('Speech stopped');
    } else {
      const lastMsg = document.querySelectorAll('.assistant-message .message-text');
      if (lastMsg.length > 0) {
        const text = lastMsg[lastMsg.length - 1].innerText;
        this.speakText(text);
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

    const branchKey = this.institutionProfile?.program || 'computerEngineering';
    const curriculum = this.institutionProfile?.type === 'autonomous'
      ? SLRTCECurriculumData
      : CurriculumData;
    const branch = curriculum[branchKey] || curriculum.computerEngineering;
    container.innerHTML = `
      <section class="curriculum-branch">
        <h3 class="curriculum-branch-title">${this.escapeHtml(branch.name)}</h3>
        ${branch.years.map(year => `
          <div class="curriculum-year">
            <div class="curriculum-year-header">
              <div>
                <h4 class="curriculum-year-title">${this.escapeHtml(year.name)}</h4>
                ${year.revision ? `<p class="curriculum-revision">${this.escapeHtml(year.revision)}</p>` : ''}
              </div>
              ${year.syllabusUrl ? `<a class="curriculum-syllabus-link" href="${this.escapeHtml(year.syllabusUrl)}" target="_blank" rel="noopener">Open official syllabus PDF ↗</a>` : ''}
            </div>
            <div class="curriculum-semesters">
              ${year.semesters.map(semester => `
                <article class="curriculum-semester">
                  <h4>${this.escapeHtml(semester.name)}</h4>
                  <div class="curriculum-course-list">
                    ${semester.subjects.map(subject => {
                      const course = typeof subject === 'string' ? subject : subject.name;
                      const modules = this.institutionProfile?.type === 'autonomous'
                        ? SLRTCECourseModules[branchKey]?.[year.name]?.[course]
                        : undefined;
                      const moduleLabel = modules?.length
                        ? `Modules · ${modules.length}`
                        : this.institutionProfile?.type === 'autonomous'
                          ? 'Module list not available in app'
                          : 'Module details vary by scheme';
                      return `
                        <div class="curriculum-course-item">
                          <button class="curriculum-course" onclick="App.startCurriculumCourse(${JSON.stringify(course)}, ${JSON.stringify(branch.name)}, ${JSON.stringify(semester.name)}, ${JSON.stringify(year.revision || '')}, ${JSON.stringify(year.syllabusUrl || '')})">
                            ${this.escapeHtml(course)} <span aria-hidden="true">→</span>
                          </button>
                          <details class="curriculum-modules">
                            <summary>${moduleLabel}</summary>
                            ${modules?.length
                              ? `<ol>${modules.map(module => `<li>${this.escapeHtml(module)}</li>`).join('')}</ol>`
                              : `<p>${this.institutionProfile?.type === 'autonomous'
                                ? 'A verified module list is not available in this in-app view. Check the linked official syllabus PDF.'
                                : 'Mumbai University subjects vary by scheme and year. Choose the applicable syllabus to confirm module names.'}
                                ${year.syllabusUrl ? `<a href="${this.escapeHtml(year.syllabusUrl)}" target="_blank" rel="noopener">Open official syllabus PDF</a>` : ''}</p>`}
                          </details>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </article>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </section>
    `;
    this.updateSyllabusStatus();
  },

  startCurriculumCourse(course, branch, semesterName, revision, syllabusUrl) {
    const input = document.getElementById('chat-input');
    this.showSection('chat');
    if (input) {
      const institution = this.institutionProfile?.type === 'autonomous'
        ? 'SLRTCE autonomous'
        : 'Mumbai University';
      const semester = semesterName
        ? ` This course is listed in ${semesterName}${revision ? ` (${revision})` : ''}.`
        : this.institutionProfile?.semester
          ? ` My selected semester is ${this.institutionProfile.semester}.`
          : '';
      const syllabusSource = syllabusUrl
        ? ` The official syllabus PDF for this year is ${syllabusUrl}; do not claim to know its contents unless they are present in my imported syllabus or chat.`
        : '';
      input.value = `I'm studying ${course} in ${branch} under ${institution}.${semester}${syllabusSource} Use my imported official syllabus if available. If the syllabus does not confirm a course unit or exam pattern, say so instead of guessing. Explain the key topics and show a step-by-step worked example.`;
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
      <button class="btn btn-secondary" onclick="App.downloadFormulaSheet('${subjectKey}')">⬇️ Download ${this.escapeHtml(data.name)} Formula Book</button>
    </div>`;
    for (const [moduleIndex, cat] of data.formulas.entries()) {
      html += `<div class="formula-category">
        <div class="formula-module-heading">
          <h3 class="formula-cat-title">📐 Module ${moduleIndex + 1}: ${this.escapeHtml(cat.category)}</h3>
          <button class="btn btn-secondary" onclick="App.downloadFormulaModule('${subjectKey}', ${moduleIndex})">⬇️ Module sheet</button>
        </div>
        <div class="formula-grid">
          ${cat.items.map((item, formulaIndex) => `
            <div class="formula-card" onclick="App.copySubjectFormula('${subjectKey}', ${moduleIndex}, ${formulaIndex})">
              <div class="formula-name">${this.escapeHtml(item.name)}</div>
              <div class="formula-math">\\[${this.escapeHtml(item.formula)}\\]</div>
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

  copySubjectFormula(subjectKey, moduleIndex, formulaIndex) {
    const formula = SubjectData[subjectKey]?.formulas[moduleIndex]?.items[formulaIndex]?.formula;
    if (formula) this.copyFormula(formula);
    else showToast('Formula not found.', 'error');
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
    this.downloadTextFile(`${subjectKey}-formula-book.txt`, lines.join('\n'));
  },

  downloadFormulaModule(subjectKey, moduleIndex) {
    const data = SubjectData[subjectKey];
    const module = data?.formulas[moduleIndex];
    if (!module) {
      showToast('Formula module not found.', 'error');
      return;
    }
    const lines = [`${data.name} — ${module.category}`, 'Created with StudyMind AI', ''];
    module.items.forEach(item => lines.push(`${item.name}: ${item.formula}`));
    const safeModule = module.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'module';
    this.downloadTextFile(`${subjectKey}-${safeModule}-formulas.txt`, lines.join('\n'));
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

  downloadSummary() {
    const summary = document.getElementById('summary-output')?.innerText.trim();
    if (!summary) {
      showToast('Create a summary before downloading.', 'error');
      return;
    }
    this.downloadTextFile('studymind-notes-summary.txt', summary);
  },

  // ============ MIND MAP ============
  async generateMindMap() {
    const topic = document.getElementById('mindmap-topic')?.value.trim();
    if (!topic) { showToast('Enter a topic', 'error'); return; }

    showToast('Generating mind map...', 'info');
    try {
      const map = await GeminiAPI.generateMindMap(topic);
      this.currentMindMap = map;
      const output = document.getElementById('mindmap-output');
      if (output) {
        output.innerHTML = `${this.renderMindMapTree(map)}
          <div class="mindmap-download">
            <button class="btn btn-secondary" onclick="App.downloadMindMap()">⬇️ Download Mind Map</button>
          </div>`;
      }
    } catch(e) {
      showToast('Error: ' + e.message, 'error');
    }
  },

  downloadMindMap() {
    if (!this.currentMindMap) {
      showToast('Generate a mind map before downloading.', 'error');
      return;
    }
    const topic = document.getElementById('mindmap-topic')?.value.trim() || 'study';
    const safeTopic = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'study';
    this.downloadTextFile(`${safeTopic}-mind-map.txt`, this.currentMindMap);
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
  loadSavedConversations() {
    const saved = localStorage.getItem('chat_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || parsed.some(session =>
          !session || typeof session.id !== 'string' || !/^[A-Za-z0-9-]+$/.test(session.id)
          || typeof session.title !== 'string'
          || !Array.isArray(session.messages) || session.messages.some(message =>
            !message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string'
          )
        )) {
          throw new Error('Saved conversations have an invalid format.');
        }
        this.chatSessions = parsed;
      } catch (error) {
        this.chatStorageAvailable = false;
        console.error('Unable to load saved conversations:', error);
        showToast('Saved chat history could not be read. Existing data was left untouched.', 'error');
      }
    }

    const savedActiveId = localStorage.getItem('active_chat_id');
    const activeSession = this.chatSessions.find(session => session.id === savedActiveId);
    if (activeSession) {
      this.activeChatId = activeSession.id;
      if (SubjectData[activeSession.subject]) {
        this.currentSubject = activeSession.subject;
        localStorage.setItem('subject', this.currentSubject);
        this.renderSubjectSelector();
      }
      this.chatHistory = activeSession.messages.map(message => ({
        role: message.role,
        content: message.content,
        time: message.time
      }));
      this.renderSavedConversation(activeSession);
    }
  },

  persistConversation() {
    if (!this.chatStorageAvailable || this.chatHistory.length === 0) return;

    const now = new Date().toISOString();
    const existing = this.chatSessions.find(session => session.id === this.activeChatId);
    const firstQuestion = this.chatHistory.find(message => message.role === 'user')?.content || 'New conversation';
    const session = {
      id: this.activeChatId || crypto.randomUUID(),
      title: firstQuestion.slice(0, 80),
      subject: this.currentSubject,
      updatedAt: now,
      messages: this.chatHistory.map(message => ({
        role: message.role,
        content: message.content,
        time: message.time || new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }))
    };

    if (existing) {
      Object.assign(existing, session);
    } else {
      this.chatSessions.unshift(session);
    }
    this.activeChatId = session.id;
    if (SubjectData[session.subject]) {
      this.currentSubject = session.subject;
      localStorage.setItem('subject', this.currentSubject);
      this.renderSubjectSelector();
    }
    this.chatSessions.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

    try {
      localStorage.setItem('chat_sessions', JSON.stringify(this.chatSessions));
      localStorage.setItem('active_chat_id', this.activeChatId);
      this.renderHistory();
    } catch (error) {
      this.chatStorageAvailable = false;
      console.error('Unable to save conversation:', error);
      showToast('This device is out of storage. Export or remove saved chats to continue saving history.', 'error');
    }
  },

  renderSavedConversation(session) {
    const messages = document.getElementById('chat-messages');
    if (!messages) return;
    messages.innerHTML = '';
    document.getElementById('related-topics').style.display = 'none';
    if (!session.messages.length) {
      this.appendWelcomeMessage();
      return;
    }
    session.messages.forEach(message => {
      const element = this.appendMessage(message.role, message.content, null, message.time);
      if (message.role === 'assistant') this.postProcessMessage(element, message.content);
    });
    this.scrollToBottom();
  },

  openConversation(id) {
    const session = this.chatSessions.find(item => item.id === id);
    if (!session) {
      showToast('That saved conversation is no longer available.', 'error');
      return;
    }
    this.activeChatId = session.id;
    this.chatHistory = session.messages.map(message => ({
      role: message.role,
      content: message.content,
      time: message.time
    }));
    localStorage.setItem('active_chat_id', session.id);
    this.renderSavedConversation(session);
    this.showSection('chat');
  },

  deleteConversation(id) {
    if (!confirm('Delete this saved conversation from this device? This cannot be undone.')) return;
    this.chatSessions = this.chatSessions.filter(session => session.id !== id);
    try {
      localStorage.setItem('chat_sessions', JSON.stringify(this.chatSessions));
      if (this.activeChatId === id) {
        this.activeChatId = null;
        this.chatHistory = [];
        localStorage.removeItem('active_chat_id');
        const messages = document.getElementById('chat-messages');
        if (messages) messages.innerHTML = '';
        this.appendWelcomeMessage();
      }
      this.renderHistory();
      showToast('Conversation deleted.');
    } catch (error) {
      console.error('Unable to update saved conversations:', error);
      showToast('Could not update saved conversations on this device.', 'error');
    }
  },

  clearSavedConversations() {
    if (!confirm('Delete all saved conversations from this device? This cannot be undone.')) return;
    this.chatSessions = [];
    this.chatHistory = [];
    this.activeChatId = null;
    localStorage.removeItem('chat_sessions');
    localStorage.removeItem('active_chat_id');
    const messages = document.getElementById('chat-messages');
    if (messages) messages.innerHTML = '';
    this.appendWelcomeMessage();
    this.renderHistory();
    showToast('Saved conversations deleted.');
  },

  renderHistory() {
    const saved = localStorage.getItem('question_history');
    if (saved) {
      try {
        this.questionHistory = JSON.parse(saved);
      } catch (error) {
        console.error('Unable to load recent question history:', error);
      }
    }

    this.chatSessions.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const sessionsContainer = document.getElementById('chat-sessions-list');
    if (sessionsContainer) {
      sessionsContainer.replaceChildren();
      if (this.chatSessions.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'history-empty';
        empty.textContent = 'No saved conversations yet';
        sessionsContainer.appendChild(empty);
      } else {
        this.chatSessions.forEach(session => {
          const item = document.createElement('div');
          item.className = 'history-item conversation-item';

          const openButton = document.createElement('button');
          openButton.className = 'conversation-open';
          openButton.type = 'button';
          const title = document.createElement('div');
          title.className = 'history-q';
          title.textContent = session.title || 'Conversation';
          const meta = document.createElement('div');
          meta.className = 'history-meta';
          const updatedAt = new Date(session.updatedAt);
          meta.textContent = `${session.subject || 'general'} · ${Number.isNaN(updatedAt.valueOf()) ? '' : updatedAt.toLocaleString()}`;
          openButton.append(title, meta);
          openButton.addEventListener('click', () => this.openConversation(session.id));

          const deleteButton = document.createElement('button');
          deleteButton.className = 'conversation-delete';
          deleteButton.type = 'button';
          deleteButton.textContent = '✕';
          deleteButton.setAttribute('aria-label', 'Delete conversation');
          deleteButton.addEventListener('click', () => this.deleteConversation(session.id));
          item.append(openButton, deleteButton);
          sessionsContainer.appendChild(item);
        });
      }
    }

    const container = document.getElementById('history-list');
    if (!container) return;
    container.replaceChildren();
    if (this.questionHistory.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = 'No recent questions';
      container.appendChild(empty);
      return;
    }
    this.questionHistory.slice(0, 20).forEach(item => {
      const question = typeof item.question === 'string' ? item.question : '';
      const entry = document.createElement('button');
      entry.className = 'history-item recent-question-item';
      entry.type = 'button';
      const title = document.createElement('div');
      title.className = 'history-q';
      title.textContent = `${question.substring(0, 60)}${question.length > 60 ? '...' : ''}`;
      const meta = document.createElement('div');
      meta.className = 'history-meta';
      meta.textContent = `${item.subject || 'general'} · ${item.time || ''}`;
      entry.append(title, meta);
      entry.addEventListener('click', () => this.loadFromHistory(question));
      container.appendChild(entry);
    });
  },

  loadFromHistory(question) {
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
    const studyMemory = document.getElementById('study-memory')?.value.trim() || '';
    const voiceStyle = document.getElementById('voice-style-setting')?.value || '';

    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    }
    if (model) {
      GeminiAPI.setModel(model);
    }
    try {
      localStorage.setItem('study_memory', studyMemory);
      if (['', 'jarvis', 'friday'].includes(voiceStyle)) {
        localStorage.setItem('voice_style', voiceStyle);
        this.voiceStyle = voiceStyle;
      }
      showToast('Settings and study memory saved on this device.', 'success');
    } catch (error) {
      console.error('Unable to save study memory:', error);
      showToast('Could not save settings. This device may be out of storage.', 'error');
    }
  },

  loadSettingsForm() {
    const apiKeyEl = document.getElementById('settings-api-key');
    const modelEl = document.getElementById('settings-model');
    const memoryEl = document.getElementById('study-memory');
    const voiceStyleEl = document.getElementById('voice-style-setting');
    if (apiKeyEl) apiKeyEl.value = localStorage.getItem('gemini_api_key') || '';
    if (modelEl) modelEl.value = GeminiAPI.model;
    if (memoryEl) memoryEl.value = localStorage.getItem('study_memory') || '';
    if (voiceStyleEl) voiceStyleEl.value = this.voiceStyle;
    this.updateSyllabusStatus();
  },

  clearStudyMemory() {
    localStorage.removeItem('study_memory');
    const memoryEl = document.getElementById('study-memory');
    if (memoryEl) memoryEl.value = '';
    showToast('Saved study memory removed from this device.');
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
  if (!App.chatHistory.length) App.appendWelcomeMessage();
  App.loadSettingsForm();

  // Init converter
  setTimeout(() => App.initConverter(), 100);
});

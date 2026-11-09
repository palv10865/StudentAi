// Gemini API Integration Module
const GeminiAPI = {
  model: 'gemini-3.5-flash-lite',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',

  init() {
    const savedModel = localStorage.getItem('gemini_model');
    const supportedModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
    const defaultMigrated = localStorage.getItem('gemini_latency_default_migrated') === 'true';
    const migratePreviousDefault = savedModel === 'gemini-3.8-flash' && !defaultMigrated;
    const model = supportedModels.includes(savedModel) && !migratePreviousDefault ? savedModel : this.model;
    this.setModel(model);
    localStorage.setItem('gemini_latency_default_migrated', 'true');
  },

  setModel(model) {
    const supportedModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
    if (!supportedModels.includes(model)) {
      throw new Error('Select a supported Gemini model.');
    }
    this.model = model;
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    localStorage.setItem('gemini_model', model);
  },
  
  getApiKey() {
    return localStorage.getItem('gemini_api_key') || '';
  },

  getSystemPrompt() {
    return `You are StudyMind, a clear and accurate BTech tutor for engineering mathematics, physics, mechanics, chemistry, electronics, computer engineering, and cybersecurity.

Answering style:
- Start with the direct answer or result. Be concise and avoid filler, repeated wording, and unnecessary headings.
- For calculations, show the key steps, equations, substitutions, and units so the result can be checked; explain assumptions when they matter.
- For concepts, give a short definition and explanation, adding an example only when it helps.
- Use readable LaTeX for mathematics and fenced, language-labelled code blocks for code.
- Adapt the amount of detail to the question; provide a fuller derivation when requested or needed to teach the method.
- For images and PDFs, solve the actual question shown and state clearly if any part is unreadable.
- For Mumbai University exam help, focus on the named course and remind students that exact topics vary by official scheme.
- Keep cybersecurity guidance defensive and limited to authorized, safe examples.
- End with a brief takeaway only when it adds useful information.`;
  },

  getRecentMessages(messages) {
    const recentMessages = messages.slice(-12);
    if (recentMessages[0]?.role === 'assistant') recentMessages.shift();
    return recentMessages;
  },

  async sendMessage(messages, imageData = null, pdfText = null) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('No API key set. Please add your Gemini API key in Settings.');
    }

    const recentMessages = this.getRecentMessages(messages);
    const contents = [];

    // Build conversation history
    for (let i = 0; i < recentMessages.length - 1; i++) {
      const msg = recentMessages[i];
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // Build the latest user message with potential multimodal content
    const lastMessage = recentMessages[recentMessages.length - 1];
    const userParts = [];

    if (pdfText) {
      userParts.push({ text: `[PDF Content Extracted]:\n${pdfText}\n\n[User Question]: ${lastMessage.content}` });
    } else {
      userParts.push({ text: lastMessage.content });
    }

    if (imageData) {
      userParts.push({
        inline_data: {
          mime_type: imageData.mimeType,
          data: imageData.base64
        }
      });
    }

    contents.push({ role: 'user', parts: userParts });

    const requestBody = {
      system_instruction: {
        parts: [{ text: this.getSystemPrompt() }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    const response = await fetch(`${this.baseUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated. Please try again.');
    }

    return data.candidates[0].content.parts[0].text;
  },

  async streamMessage(messages, imageData = null, pdfText = null, onChunk = null) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('No API key set. Please add your Gemini API key in Settings.');
    }

    const recentMessages = this.getRecentMessages(messages);
    const contents = [];
    for (let i = 0; i < recentMessages.length - 1; i++) {
      const msg = recentMessages[i];
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    const lastMessage = recentMessages[recentMessages.length - 1];
    const userParts = [];

    if (pdfText) {
      userParts.push({ text: `[PDF Content Extracted]:\n${pdfText}\n\n[User Question]: ${lastMessage.content}` });
    } else {
      userParts.push({ text: lastMessage.content });
    }

    if (imageData) {
      userParts.push({
        inline_data: {
          mime_type: imageData.mimeType,
          data: imageData.base64
        }
      });
    }

    contents.push({ role: 'user', parts: userParts });

    const requestBody = {
      system_instruction: {
        parts: [{ text: this.getSystemPrompt() }]
      },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
      }
    };

    const modelPriority = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'];
    const fallbackModels = modelPriority.filter(model => model !== this.model);
    const attemptedModels = new Set();

    const streamFromModel = async (model) => {
      attemptedModels.add(model);
      const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        const message = error.error?.message || `API Error: ${response.status}`;
        const isTemporaryOverload = response.status === 503 ||
          /high demand|overload|temporarily unavailable/i.test(message);
        const fallback = fallbackModels.find(candidate => !attemptedModels.has(candidate));

        if (isTemporaryOverload && fallback) {
          if (typeof showToast === 'function') {
            showToast(`Gemini is busy. Retrying with ${fallback}.`, 'info');
          }
          return streamFromModel(fallback);
        }
        if (isTemporaryOverload) {
          throw new Error('Gemini is temporarily at capacity across the available models. Please try again shortly.');
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      const processLine = (line) => {
        if (!line.startsWith('data:')) return;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr || jsonStr === '[DONE]') return;

        try {
          const data = JSON.parse(jsonStr);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            fullText += text;
            if (onChunk) onChunk(text, fullText);
          }
        } catch (error) {
          console.warn('Skipping malformed Gemini stream event:', error);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        lines.forEach(processLine);

        if (done) {
          if (buffer) processLine(buffer);
          break;
        }
      }

      return fullText;
    };

    return streamFromModel(this.model);
  },

  async generateFlashcards(topic, count = 10) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('No API key set.');

    const prompt = `Generate ${count} flashcards for BTech students on the topic: "${topic}".
Format each flashcard as JSON with "front" (question/term) and "back" (answer/definition).
Return a JSON array like: [{"front": "...", "back": "..."}, ...]
Make them educational, clear, and suitable for exam preparation.`;

    const response = await fetch(`${this.baseUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  },

  async generateQuiz(topic, count = 5, difficulty = 'medium') {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('No API key set.');

    const prompt = `Generate ${count} multiple-choice quiz questions for BTech students on: "${topic}".
Difficulty: ${difficulty}
Format as JSON array:
[{
  "question": "...",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct": 0,
  "explanation": "..."
}]
Where "correct" is the index (0-3) of the right answer.`;

    const response = await fetch(`${this.baseUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  },

  async summarizeText(text) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('No API key set.');

    const prompt = `Summarize the following study notes for a BTech student. 
Create a concise, well-structured summary with key points, important formulas, and concepts.
Use bullet points and headers. Include any important formulas in LaTeX format.

Notes:
${text}`;

    const response = await fetch(`${this.baseUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 4096 }
      })
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },

  async generateMindMap(topic) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('No API key set.');

    const prompt = `Create a detailed mind map for the topic: "${topic}" for BTech students.
Format as a structured text mind map with the following hierarchy:
- Central Topic
  - Main Branch 1
    - Sub-topic 1.1
    - Sub-topic 1.2
  - Main Branch 2
    ...
Include 4-6 main branches with 2-4 sub-topics each. Be comprehensive and educational.`;

    const response = await fetch(`${this.baseUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
};

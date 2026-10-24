// Gemini API Integration Module
const GeminiAPI = {
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  
  getApiKey() {
    return localStorage.getItem('gemini_api_key') || '';
  },

  getSystemPrompt() {
    return `You are an expert BTech tutor AI assistant named StudyMind. You specialize in:
- Engineering Mathematics (Calculus, Linear Algebra, Differential Equations, Probability & Statistics)
- Physics (Mechanics, Thermodynamics, Electromagnetism, Optics, Modern Physics)
- Engineering Mechanics (Statics, Dynamics, Strength of Materials)
- Electronics & Electrical Engineering (Circuit Analysis, Digital Electronics, Signals & Systems)
- Computer Science (Data Structures, Algorithms, Programming, Databases, OS, Networks)
- Chemistry (Engineering Chemistry)
- Drawing & Design concepts

Instructions:
1. ALWAYS provide step-by-step solutions with clear reasoning
2. Use LaTeX notation for all mathematical expressions (wrap in $...$ for inline, $$...$$ for display)
3. Structure your answers with: **Understanding the Problem**, **Solution Steps**, **Final Answer**
4. Explain each step in simple, easy-to-understand language
5. Provide the underlying concept/theory when relevant
6. If asked about an image, analyze it thoroughly and solve any problems shown
7. For numerical problems, show all calculations clearly
8. Use bullet points and numbered lists for clarity
9. If multiple approaches exist, mention alternatives
10. End with a **Key Takeaway** or **Remember** tip
11. For code, use proper markdown code blocks with language specification
12. Be encouraging and supportive to students`;
  },

  async sendMessage(messages, imageData = null, pdfText = null) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('No API key set. Please add your Gemini API key in Settings.');
    }

    const contents = [];

    // Build conversation history
    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // Build the latest user message with potential multimodal content
    const lastMessage = messages[messages.length - 1];
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
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
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

    const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
    
    const contents = [];
    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    const lastMessage = messages[messages.length - 1];
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
        temperature: 0.7,
        maxOutputTokens: 8192,
      }
    };

    const response = await fetch(streamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API Error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) {
              fullText += text;
              if (onChunk) onChunk(text, fullText);
            }
          } catch (e) { /* skip parse errors */ }
        }
      }
    }

    return fullText;
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

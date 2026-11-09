# StudyMind AI 🧠

> **AI-powered BTech Tutor** — Solve Maths, Physics, Mechanics, Electronics & more with step-by-step explanations.

**Created by Vipin Pal** | BTech CSE Cyber Security Student

---

## 🌐 Live Website
👉 **[https://palv10865.github.io/StudentAi/](https://palv10865.github.io/StudentAi/)**

To enable or update the Pages deployment, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**, then run the **Deploy to GitHub Pages** workflow manually from the Actions tab.

## 📱 Download APK
Download the latest installable APK from [GitHub Releases](https://github.com/palv10865/StudentAi/releases/latest). GitHub Actions builds and publishes a new APK after each push to `main`.

The app's study interface and built-in tools are bundled in the Android app. AI responses, image questions, generated quizzes, and generated flashcards require an internet connection and your own Gemini API key.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Chat | Gemini 2.0 Flash with step-by-step solutions |
| 📸 Image Upload | Solve from photos of handwritten/printed problems |
| 📄 PDF Parser | Extract & solve problems from PDFs |
| 🔢 Calculator | Scientific calculator with trig, log, constants |
| 📐 Formula Sheets | Quick reference for all BTech subjects |
| 📊 Graph Plotter | Plot mathematical functions |
| 🎯 Quiz Mode | AI-generated MCQs with scoring |
| 🃏 Flashcards | AI-generated flashcards |
| ⚗️ Periodic Table | Interactive periodic table |
| ⚡ Logic Gates | Truth tables + gate diagrams |
| 🎤 Voice Input | Ask questions hands-free |
| 🌙 Dark/Light Mode | Eye-friendly themes |
| 🎓 Four-Year Curriculum | Browse typical eight-semester Computer Engineering and CSE Cyber Security subjects |
| ⬇️ Download Study Sheets | Save formula sheets and generated flashcards as text files on Android or desktop |

## 📚 Subjects Covered
- Engineering Mathematics (Calculus, Linear Algebra, Diff. Equations)
- Physics (Mechanics, Thermodynamics, Electromagnetism)
- Engineering Mechanics (Statics, Dynamics, SOM)
- Electronics & Electrical (Circuits, Digital, Signals)
- Computer Science (DSA, OS, Networks, DBMS)
- Cyber Security concepts
- Chemistry
- Typical first-year engineering, Computer Engineering, and CSE Cyber Security subjects across all four years

> **Syllabus note:** Mumbai University course names and electives depend on the admission year, college, and syllabus scheme. The in-app curriculum is a study guide, not a substitute for the official syllabus for your batch.

## 🔑 Setup
1. Get a free API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Open the website or install the APK
3. Enter your API key on first launch
4. Start solving problems!

## 🔏 Android signing

The workflow publishes an installable debug-signed APK by default. For a stable release-signed APK and Google Play upload, create a private upload keystore and add these repository Actions secrets under **Settings → Secrets and variables → Actions**:

- `ANDROID_KEYSTORE_BASE64` — base64-encoded upload keystore
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Never commit or share the keystore or its passwords. Google Play App Signing is enabled in Play Console when setting up the app; the upload key signs submissions, and Google manages the app-signing key. A GitHub release is a direct APK download, not a Play Store listing.

## 🛠️ Tech Stack
- Frontend: HTML5, CSS3, JavaScript
- AI: Google Gemini 2.0 Flash API
- Math: KaTeX
- Charts: Chart.js
- PDF: PDF.js
- Android: WebView wrapper (Java)
- Hosting: GitHub Pages

---

<div align="center">
  <b>Made with ❤️ by Vipin Pal</b><br>
  BTech CSE Cyber Security Student
</div>

# StudyMind AI

An Android and web study assistant for engineering students, created by Vipin Pal.

## Download and website

- [Download the latest Android APK](https://github.com/palv10865/StudentAi/releases/latest/download/StudyMindAI.apk)
- [Browse all APK releases](https://github.com/palv10865/StudentAi/releases)
- [Open the GitHub Pages site](https://palv10865.github.io/StudentAi/)
- [View the GitHub Actions build and deployment history](https://github.com/palv10865/StudentAi/actions)

If the website is unavailable, enable **Settings → Pages → Build and deployment → Source: GitHub Actions** in the repository. Pushes to `main` deploy automatically; if you enable Pages after an earlier failed run, choose **Actions → Deploy to GitHub Pages → Run workflow** once.

## Features

- AI tutor with step-by-step explanations, image/PDF questions, generated quizzes, flashcards, summaries, and mind maps
- Offline calculator, graph plotter, unit converter, formula sheets, periodic table, logic gates, focus timer, GPA calculator, and curriculum guides
- Downloadable study materials; the app bundles its interface and study libraries for offline use
- Saved chat text conversations and optional tutor memory persist locally until deleted (uploaded images and PDFs are not stored)
- Android app with a 2.5-second creator splash screen

AI answers and generated content need internet access and a Gemini API key. Chat history, study memory, and the key are stored on this device only; there is no account sync or cloud backup. Android uninstall or clearing app data may remove them. The key is sent directly to Google's API and is not secret from someone with access to the device or app. Use a personal key, restrict it in Google AI Studio where available, and do not enter a key on a shared device.

The curriculum is a general guide. Check the official Mumbai University syllabus for your admission year and college.

## Android releases and signing

GitHub Actions publishes an installable APK after each push to `main`. Without signing secrets, it is debug-signed; Android may require uninstalling an older debug APK before installing a newer one. Uninstalling removes local app data.

For stable update signing or Google Play submission, configure `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` as repository Actions secrets. Never commit or share the upload keystore or passwords. Google Play App Signing is configured in Play Console; a GitHub release is a direct APK download, not a Play Store listing.

## Local development

Requires Node.js 22.13+ or 24+ and the Android SDK/Gradle toolchain.

```powershell
npm ci
npm run vendor
```

The vendored browser libraries and their licenses are copied into `vendor/` for the offline website and APK. Build the APK with:

```powershell
gradle --no-daemon -p android assembleDebug
```

Pinned browser libraries: Chart.js 4.4.0, DOMPurify 3.4.17, Highlight.js CDN assets 11.12.0, html2canvas 1.4.1, KaTeX 0.19.1, Marked 9.1.6, and PDF.js 4.10.38. Versions are locked in `package-lock.json`; update dependencies deliberately, regenerate `vendor/`, and run the APK workflow to verify packaging.

## Curriculum coverage

The study guides cover typical four-year Computer Engineering and CSE Cyber Security topics, alongside engineering mathematics, physics, mechanics, chemistry, electronics, and core computer science. Course names and electives vary by syllabus scheme.

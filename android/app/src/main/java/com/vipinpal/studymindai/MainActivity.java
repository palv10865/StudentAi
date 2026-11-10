package com.vipinpal.studymindai;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.ConsoleMessage;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.webkit.WebViewAssetLoader;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Locale;

import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar progressBar;
    private View splashScreen;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1;
    private static final int PERMISSION_REQUEST_CODE = 2;
    private static final int DOWNLOAD_FILE_REQUEST_CODE = 3;
    private static final int NATIVE_SPEECH_PERMISSION_REQUEST_CODE = 4;
    private static final String APP_ASSET_HOST = "appassets.androidplatform.net";
    private String pendingDownloadContent;
    private PermissionRequest pendingAudioPermissionRequest;
    private SpeechRecognizer speechRecognizer;
    private TextToSpeech textToSpeech;
    private final ArrayDeque<Runnable> pendingSpeechTasks = new ArrayDeque<>();
    private boolean textToSpeechReady;
    private boolean textToSpeechFailed;
    private boolean pendingNativeSpeechRecognition;
    private String pendingSpeechLanguage = "en-IN";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Full screen immersive
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        progressBar = findViewById(R.id.progress_bar);
        splashScreen = findViewById(R.id.splash_screen);
        initializeTextToSpeech();
        new Handler(Looper.getMainLooper()).postDelayed(
            () -> splashScreen.setVisibility(View.GONE),
            2500
        );

        setupWebView();

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl("https://" + APP_ASSET_HOST + "/assets/index.html");
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setSupportZoom(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(
            "Mozilla/5.0 (Linux; Android " + Build.VERSION.RELEASE + "; StudyMindAI) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        );
        webView.addJavascriptInterface(new AndroidDownloadBridge(), "AndroidDownload");
        webView.addJavascriptInterface(new AndroidSpeechBridge(), "AndroidSpeech");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(
                    WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && APP_ASSET_HOST.equals(uri.getHost())) {
                    return false;
                }
                if ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (android.content.ActivityNotFoundException e) {
                        Toast.makeText(MainActivity.this, "No app can open this link.", Toast.LENGTH_SHORT).show();
                    }
                    return true;
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    progressBar.setVisibility(View.GONE);
                    Toast.makeText(MainActivity.this, "Unable to load StudyMind AI.", Toast.LENGTH_LONG).show();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setVisibility(newProgress < 100 ? View.VISIBLE : View.GONE);
                progressBar.setProgress(newProgress);
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                             FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;
                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                } catch (ActivityNotFoundException e) {
                    MainActivity.this.filePathCallback = null;
                    filePathCallback.onReceiveValue(null);
                    Toast.makeText(MainActivity.this, "No app is available to select a file.", Toast.LENGTH_LONG).show();
                }
                return true;
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                String[] resources = request.getResources();
                if (!APP_ASSET_HOST.equals(request.getOrigin().getHost())
                        || resources.length != 1
                        || !PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resources[0])) {
                    request.deny();
                    return;
                }

                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(resources);
                    return;
                }

                if (pendingAudioPermissionRequest != null) {
                    request.deny();
                    return;
                }
                pendingAudioPermissionRequest = request;
                ActivityCompat.requestPermissions(
                    MainActivity.this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    PERMISSION_REQUEST_CODE
                );
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                return true;
            }
        });

        WebView.setWebContentsDebuggingEnabled(false);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NATIVE_SPEECH_PERMISSION_REQUEST_CODE) {
            if (!pendingNativeSpeechRecognition) return;
            pendingNativeSpeechRecognition = false;
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED
                    && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                startNativeSpeechRecognition(pendingSpeechLanguage);
            } else {
                evaluateSpeechCallback("onAndroidSpeechError", "9");
            }
            return;
        }
        if (requestCode != PERMISSION_REQUEST_CODE) return;

        PermissionRequest request = pendingAudioPermissionRequest;
        pendingAudioPermissionRequest = null;
        if (request == null) return;

        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED
                && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            request.deny();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == DOWNLOAD_FILE_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null
                    && pendingDownloadContent != null) {
                try (OutputStream output = getContentResolver().openOutputStream(data.getData())) {
                    if (output == null) {
                        throw new IOException("Unable to open the selected file.");
                    }
                    output.write(pendingDownloadContent.getBytes(StandardCharsets.UTF_8));
                    Toast.makeText(this, "Study file saved.", Toast.LENGTH_LONG).show();
                } catch (IOException e) {
                    Toast.makeText(this, "Could not save file: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
            pendingDownloadContent = null;
            return;
        }
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK) {
                results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (speechRecognizer != null) {
            speechRecognizer.destroy();
            speechRecognizer = null;
        }
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
        super.onDestroy();
    }

    private void initializeTextToSpeech() {
        textToSpeech = new TextToSpeech(this, status -> {
            if (status != TextToSpeech.SUCCESS || textToSpeech == null) {
                textToSpeechFailed = true;
                textToSpeechReady = true;
                while (!pendingSpeechTasks.isEmpty()) pendingSpeechTasks.removeFirst().run();
                return;
            }
            int languageStatus = textToSpeech.setLanguage(Locale.forLanguageTag("en-IN"));
            if (languageStatus == TextToSpeech.LANG_MISSING_DATA
                    || languageStatus == TextToSpeech.LANG_NOT_SUPPORTED) {
                textToSpeech.setLanguage(Locale.US);
            }
            textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String utteranceId) {}
                @Override public void onDone(String utteranceId) {
                    evaluateSpeechCallback("onAndroidSpeechChunkEnd", utteranceId);
                }
                @Override public void onError(String utteranceId) {
                    evaluateSpeechCallback("onAndroidSpeechPlaybackError", utteranceId);
                }
            });
            textToSpeechReady = true;
            while (!pendingSpeechTasks.isEmpty()) pendingSpeechTasks.removeFirst().run();
        });
    }

    private void speakNativeText(String text, String style, String utteranceId) {
        if (textToSpeech == null || textToSpeechFailed) {
            evaluateSpeechCallback("onAndroidSpeechPlaybackError", utteranceId);
            return;
        }
        boolean warmStyle = "friday".equals(style);
        textToSpeech.setPitch(warmStyle ? 1.08f : 0.86f);
        textToSpeech.setSpeechRate(warmStyle ? 1.0f : 0.92f);
        int result = textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
        if (result == TextToSpeech.ERROR) {
            evaluateSpeechCallback("onAndroidSpeechPlaybackError", utteranceId);
        }
    }

    private void startNativeSpeechRecognition(String language) {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            evaluateSpeechCallback("onAndroidSpeechError", "5");
            return;
        }
        try {
            if (speechRecognizer == null) {
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
                speechRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override public void onReadyForSpeech(Bundle params) {
                        evaluateSpeechCallback("onAndroidSpeechReady");
                    }
                    @Override public void onBeginningOfSpeech() {}
                    @Override public void onRmsChanged(float rmsdB) {}
                    @Override public void onBufferReceived(byte[] buffer) {}
                    @Override public void onEndOfSpeech() {}
                    @Override public void onError(int error) {
                        evaluateSpeechCallback("onAndroidSpeechError", String.valueOf(error));
                    }
                    @Override public void onResults(Bundle results) {
                        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (matches != null && !matches.isEmpty()) {
                            evaluateSpeechResult(matches.get(0), true);
                        }
                        evaluateSpeechCallback("onAndroidSpeechEnd");
                    }
                    @Override public void onPartialResults(Bundle partialResults) {
                        ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (matches != null && !matches.isEmpty()) {
                            evaluateSpeechResult(matches.get(0), false);
                        }
                    }
                    @Override public void onEvent(int eventType, Bundle params) {}
                });
            }
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            speechRecognizer.startListening(intent);
        } catch (IllegalStateException | SecurityException error) {
            evaluateSpeechCallback("onAndroidSpeechError", "5");
        }
    }

    private void evaluateSpeechResult(String text, boolean isFinal) {
        runOnUiThread(() -> {
            if (webView == null) return;
            String script = "if(typeof App!=='undefined'&&typeof App.onAndroidSpeechResult==='function')"
                + "App.onAndroidSpeechResult(" + JSONObject.quote(text) + "," + isFinal + ");";
            webView.evaluateJavascript(script, null);
        });
    }

    private void evaluateSpeechCallback(String callback, String value) {
        runOnUiThread(() -> {
            if (webView == null) return;
            String script = "if(typeof App!=='undefined'&&typeof App." + callback + "==='function')"
                + "App." + callback + "(" + JSONObject.quote(value) + ");";
            webView.evaluateJavascript(script, null);
        });
    }

    private void evaluateSpeechCallback(String callback) {
        runOnUiThread(() -> {
            if (webView == null) return;
            webView.evaluateJavascript(
                "if(typeof App!=='undefined'&&typeof App." + callback + "==='function')App." + callback + "();",
                null
            );
        });
    }

    private final class AndroidSpeechBridge {
        @JavascriptInterface
        public boolean isRecognitionAvailable() {
            return SpeechRecognizer.isRecognitionAvailable(MainActivity.this);
        }

        @JavascriptInterface
        public void startListening(String language) {
            runOnUiThread(() -> {
                pendingSpeechLanguage = language == null || language.trim().isEmpty() ? "en-IN" : language;
                if (!SpeechRecognizer.isRecognitionAvailable(MainActivity.this)) {
                    evaluateSpeechCallback("onAndroidSpeechError", "5");
                } else if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    startNativeSpeechRecognition(pendingSpeechLanguage);
                } else if (!pendingNativeSpeechRecognition) {
                    pendingNativeSpeechRecognition = true;
                    ActivityCompat.requestPermissions(
                        MainActivity.this,
                        new String[]{Manifest.permission.RECORD_AUDIO},
                        NATIVE_SPEECH_PERMISSION_REQUEST_CODE
                    );
                }
            });
        }

        @JavascriptInterface
        public void stopListening() {
            runOnUiThread(() -> {
                if (speechRecognizer != null) speechRecognizer.stopListening();
            });
        }

        @JavascriptInterface
        public void speakText(String text, String style, String utteranceId) {
            if (text == null || utteranceId == null || text.length() > 2_000) {
                runOnUiThread(() ->
                    evaluateSpeechCallback("onAndroidSpeechPlaybackError", utteranceId == null ? "" : utteranceId)
                );
                return;
            }
            runOnUiThread(() -> {
                Runnable task = () -> speakNativeText(text, style, utteranceId);
                if (textToSpeechReady) task.run();
                else if (pendingSpeechTasks.size() < 3) pendingSpeechTasks.addLast(task);
                else evaluateSpeechCallback("onAndroidSpeechPlaybackError", utteranceId);
            });
        }

        @JavascriptInterface
        public void stopSpeaking() {
            runOnUiThread(() -> {
                pendingSpeechTasks.clear();
                if (textToSpeech != null) textToSpeech.stop();
            });
        }
    }

    private final class AndroidDownloadBridge {
        @JavascriptInterface
        public void saveTextFile(String filename, String content) {
            if (filename == null || content == null || content.length() > 5_000_000) {
                runOnUiThread(() ->
                    Toast.makeText(MainActivity.this, "The study file is too large to save.", Toast.LENGTH_LONG).show()
                );
                return;
            }
            String safeFilename = filename.replaceAll("[^A-Za-z0-9._-]", "_");
            runOnUiThread(() -> {
                if (pendingDownloadContent != null) {
                    Toast.makeText(MainActivity.this, "Finish saving the current file first.", Toast.LENGTH_SHORT).show();
                    return;
                }
                pendingDownloadContent = content;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("text/plain");
                intent.putExtra(Intent.EXTRA_TITLE, safeFilename);
                startActivityForResult(intent, DOWNLOAD_FILE_REQUEST_CODE);
            });
        }
    }
}

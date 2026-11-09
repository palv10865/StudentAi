package com.vipinpal.studymindai;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
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

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar progressBar;
    private View splashScreen;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1;
    private static final int PERMISSION_REQUEST_CODE = 2;
    private static final int DOWNLOAD_FILE_REQUEST_CODE = 3;
    private static final String APP_ASSET_HOST = "appassets.androidplatform.net";
    private String pendingDownloadContent;

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
        new Handler(Looper.getMainLooper()).postDelayed(
            () -> splashScreen.setVisibility(View.GONE),
            2500
        );

        requestPermissions();
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
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setSupportZoom(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(
            "Mozilla/5.0 (Linux; Android " + Build.VERSION.RELEASE + "; StudyMindAI) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        );
        webView.addJavascriptInterface(new AndroidDownloadBridge(), "AndroidDownload");

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
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                return true;
            }
        });

        WebView.setWebContentsDebuggingEnabled(false);
    }

    private void requestPermissions() {
        String[] permissions = {
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO,
        };
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions = new String[]{
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.READ_MEDIA_IMAGES,
            };
        }
        ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQUEST_CODE);
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
            if (resultCode == Activity.RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                }
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

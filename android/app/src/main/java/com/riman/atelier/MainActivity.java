package com.riman.atelier;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * The Android wrapper around the live app.
 *
 * It is deliberately thin: the page itself is served from
 * https://atelier-inventory.pages.dev, so the installed app is always the
 * current one and an update is a deploy, not a new APK. Everything here is
 * about making the web page behave properly inside an Android WebView:
 *
 *  - the camera permission the page asks for (getUserMedia),
 *  - the file picker the photo upload uses (onShowFileChooser),
 *  - the service worker, so the app still opens with no signal,
 *  - the back button, so it walks the app's own history first,
 *  - links that leave the app open in the normal browser.
 */
public class MainActivity extends Activity {

    /** The live app. The wrapper never ships a copy of the page. */
    private static final String APP_URL = "https://atelier-inventory.pages.dev";
    private static final String APP_HOST = "atelier-inventory.pages.dev";

    private static final int REQ_CAMERA_PERMISSION = 401;
    private static final int REQ_FILE_CHOOSER = 402;

    /** The paper colour of the app, so there is no white flash on launch. */
    private static final int CREAM = 0xFFF7F4EE;

    private WebView webView;

    /** The page's pending file-picker callback. */
    private ValueCallback<Uri[]> fileCallback;
    /** The page's pending camera-permission request. */
    private PermissionRequest pendingCameraRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(CREAM);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(webView);

        // Keep the screen on while the atelier is using the app on a shelf.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        configureSettings();
        configureServiceWorker();
        configureChromeClient();
        configureLinkHandling();

        // The WebView is only debuggable in a debug build, so the app cannot
        // be inspected on a client tablet.
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(APP_URL);
        }
    }

    private void configureSettings() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        // The app keeps its offline capture queue in IndexedDB and its
        // session in localStorage.
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        // The capture screen plays no video, but the camera preview should
        // never be held up by a "tap to play" gate.
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        // The app only ever loads its own https origin.
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
    }

    /**
     * Without this the service worker never sees a request, so the app could
     * not open without a signal. The page's own worker does the caching.
     */
    private void configureServiceWorker() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return;
        try {
            ServiceWorkerController controller = ServiceWorkerController.getInstance();
            if (controller == null) return;
            controller.setServiceWorkerClient(new ServiceWorkerClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                    // null = the WebView handles the request as usual.
                    return null;
                }
            });
        } catch (Throwable ignored) {
            // A device without a service-worker-capable WebView provider
            // still gets the app online; it just has no offline shell.
        }
    }

    private void configureChromeClient() {
        webView.setWebChromeClient(new WebChromeClient() {

            /**
             * The page asks for the camera. The WebView grants it only if the
             * app holds the camera permission, so the OS prompt is asked for
             * first and the page is answered afterwards.
             */
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (request.getOrigin() == null
                        || !APP_HOST.equals(request.getOrigin().getHost())) {
                    request.deny();
                    return;
                }
                boolean wantsCamera = false;
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                        wantsCamera = true;
                    }
                }
                if (!wantsCamera) {
                    request.deny();
                    return;
                }
                if (checkSelfPermission(Manifest.permission.CAMERA)
                        == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    return;
                }
                pendingCameraRequest = request;
                requestPermissions(
                        new String[]{Manifest.permission.CAMERA}, REQ_CAMERA_PERMISSION);
            }

            /**
             * The photo upload opens a file picker. A WebView that does not
             * implement this swallows the tap with no error at all, so the
             * callback has to be answered - with null on cancel, or the page
             * waits for a file forever.
             */
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;

                String[] accept = params.getAcceptTypes();
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.setType((accept != null && accept.length > 0) ? accept[0] : "*/*");
                if (accept != null && accept.length > 0) {
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, accept);
                }
                if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }
                try {
                    startActivityForResult(intent, REQ_FILE_CHOOSER);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });
    }

    /** The app stays in the app; anything else opens in the normal browser. */
    private void configureLinkHandling() {
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (url == null) return false;
                if (APP_HOST.equals(url.getHost())) return false;
                String scheme = url.getScheme();
                if ("http".equals(scheme) || "https".equals(scheme)) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, url));
                    } catch (ActivityNotFoundException ignored) {
                        // Nothing can open it; stay where we are.
                    }
                }
                return true;
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILE_CHOOSER) return;
        if (fileCallback == null) return;

        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null) {
            ClipData clip = data.getClipData();
            if (clip != null) {
                int count = clip.getItemCount();
                results = new Uri[count];
                for (int i = 0; i < count; i++) {
                    results[i] = clip.getItemAt(i).getUri();
                }
            } else if (data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
        }
        fileCallback.onReceiveValue(results);
        fileCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions,
                                           int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_CAMERA_PERMISSION) return;
        if (pendingCameraRequest == null) return;
        boolean granted = grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        pendingCameraRequest.grant(granted
                ? new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE}
                : new String[]{});
        pendingCameraRequest = null;
    }

    /** The back button walks the app's own history before it closes the app. */
    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}

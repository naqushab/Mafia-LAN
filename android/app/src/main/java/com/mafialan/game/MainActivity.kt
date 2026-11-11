package com.mafialan.game

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.wifi.WifiManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader

/**
 * The Android shell is a thin, offline-capable container for the real game.
 *
 * The complete PWA (React build) ships inside the APK under `assets/www`, and is
 * served through [WebViewAssetLoader] on `https://appassets.androidplatform.net`
 * instead of `file://`. That gives the web app a proper secure origin, which is
 * what WebRTC, the camera QR scanner, the clipboard and the service worker all
 * require.
 */
class MainActivity : ComponentActivity() {

    private var webView: WebView? = null
    private var multicastLock: WifiManager.MulticastLock? = null
    private var pendingCameraRequest: PermissionRequest? = null

    private val cameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val request = pendingCameraRequest
            pendingCameraRequest = null
            if (granted) request?.grant(request.resources) else request?.deny()
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // mDNS/Bonjour multicast reception needs an explicit Wi-Fi lock on Android.
        try {
            val wifiManager = applicationContext.getSystemService(WIFI_SERVICE) as WifiManager
            multicastLock = wifiManager.createMulticastLock("MafiaLanLock").apply {
                setReferenceCounted(true)
                acquire()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        val web = WebView(this)
        web.setBackgroundColor(Color.parseColor("#07080C"))
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                val response = assetLoader.shouldInterceptRequest(request.url) ?: return null
                // The bundle changes with every APK update, but its URLs do not.
                // Without `no-store` an upgraded app can keep serving the old
                // index.html, which points at asset hashes that no longer exist.
                val headers = HashMap(response.responseHeaders ?: emptyMap())
                headers["Cache-Control"] = "no-store"
                response.responseHeaders = headers
                return response
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url
                // Everything the bundled app needs lives on the virtual asset origin.
                if (url.host == "appassets.androidplatform.net") return false
                // Anything else (docs, release page) opens in the real browser.
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                } catch (_: Exception) {
                    // No browser installed — stay inside the app.
                }
                return true
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            // getUserMedia() from the QR scanner lands here.
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val wantsCamera = request.resources.any {
                        it == PermissionRequest.RESOURCE_VIDEO_CAPTURE
                    }
                    if (!wantsCamera) {
                        request.deny()
                        return@runOnUiThread
                    }
                    val granted = ContextCompat.checkSelfPermission(
                        this@MainActivity,
                        Manifest.permission.CAMERA
                    ) == PackageManager.PERMISSION_GRANTED
                    if (granted) {
                        request.grant(request.resources)
                    } else {
                        pendingCameraRequest = request
                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                    }
                }
            }
        }

        if (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
        webView = web
        setContentView(web)

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (web.canGoBack()) web.goBack() else finish()
                }
            }
        )
    }

    override fun onDestroy() {
        webView?.destroy()
        webView = null
        multicastLock?.release()
        super.onDestroy()
    }
}

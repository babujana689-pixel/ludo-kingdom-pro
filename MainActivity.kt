package com.ludoaddapro.app

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.OnUserEarnedRewardListener
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.gms.ads.rewarded.ServerSideVerificationOptions

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var rewardedAd: RewardedAd? = null
    private var isLoadingAd = false

    // Replace with your live Rewarded Ad Unit ID in production
    private val rewardedAdUnitId = "ca-app-pub-3940256099942544/5224354917"

    // Replace with your live LUDO ADDA hosted URL
    private val gameUrl = "https://babujana689-pixel.github.io/ludo-adda/"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        MobileAds.initialize(this) {}

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.setSupportMultipleWindows(true)
        settings.mediaPlaybackRequiresUserGesture = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                return false
            }
        }
        webView.webChromeClient = WebChromeClient()

        webView.addJavascriptInterface(AdBridge(this), "LudoAdBridge")

        loadRewardedAd()
        webView.loadUrl(gameUrl)
    }

    private fun loadRewardedAd(onLoaded: (() -> Unit)? = null) {
        if (isLoadingAd || rewardedAd != null) {
            onLoaded?.invoke()
            return
        }
        isLoadingAd = true

        val adRequest = AdRequest.Builder().build()
        RewardedAd.load(
            this,
            rewardedAdUnitId,
            adRequest,
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    isLoadingAd = false
                    rewardedAd = ad
                    onLoaded?.invoke()
                }

                override fun onAdFailedToLoad(adError: LoadAdError) {
                    isLoadingAd = false
                    rewardedAd = null
                }
            }
        )
    }

    private fun notifyWeb(jsCode: String) {
        runOnUiThread {
            if (::webView.isInitialized) {
                webView.evaluateJavascript(jsCode, null)
            }
        }
    }

    fun triggerRewardedAd(uid: String, customData: String) {
        val cleanUid = uid.trim()
        if (cleanUid.isEmpty()) {
            notifyWeb("window.onNativeRewardedAdError?.('Missing user ID');")
            return
        }

        runOnUiThread {
            val ad = rewardedAd
            if (ad == null) {
                notifyWeb("window.onNativeRewardedAdStatus?.('loading');")
                loadRewardedAd {
                    val loadedAd = rewardedAd
                    if (loadedAd == null) {
                        notifyWeb("window.onNativeRewardedAdError?.('Ad not ready yet. Please try again.');")
                    } else {
                        showLoadedRewardedAd(loadedAd, cleanUid, customData)
                    }
                }
                return@runOnUiThread
            }

            showLoadedRewardedAd(ad, cleanUid, customData)
        }
    }

    private fun showLoadedRewardedAd(ad: RewardedAd, uid: String, customData: String) {
        val ssvOptions = ServerSideVerificationOptions.Builder()
            .setUserId(uid)
            .setCustomData(customData)
            .build()
        ad.setServerSideVerificationOptions(ssvOptions)

        var earnedReward = false

        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdShowedFullScreenContent() {
                notifyWeb("window.onNativeRewardedAdStatus?.('showing');")
            }

            override fun onAdFailedToShowFullScreenContent(adError: AdError) {
                rewardedAd = null
                loadRewardedAd()
                notifyWeb("window.onNativeRewardedAdError?.('${adError.message.replace("'", "\\'")}');")
            }

            override fun onAdDismissedFullScreenContent() {
                rewardedAd = null
                loadRewardedAd()
                notifyWeb("window.onNativeRewardedAdClosed?.($earnedReward);")
            }
        }

        ad.show(this, OnUserEarnedRewardListener {
            // Coins & Diamonds are credited via Firebase Function `admobSsvReward`
            earnedReward = true
            Toast.makeText(this, "Ad completed! Verifying reward...", Toast.LENGTH_SHORT).show()
            notifyWeb("window.onNativeRewardedAdEarned?.();")
        })
    }

    inner class AdBridge(private val activity: Activity) {
        @JavascriptInterface
        fun isNativeAdAvailable(): Boolean {
            return rewardedAd != null
        }

        @JavascriptInterface
        fun showRewardedAd(uid: String, customData: String = "") {
            triggerRewardedAd(uid, customData)
        }
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) {
            webView.onResume()
        }
        if (rewardedAd == null) {
            loadRewardedAd()
        }
    }

    override fun onPause() {
        if (::webView.isInitialized) {
            webView.onPause()
        }
        super.onPause()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }

    @Deprecated("Use OnBackPressedDispatcher")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }
}

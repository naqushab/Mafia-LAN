package com.mafialan.game

import android.net.wifi.WifiManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color

class MainActivity : ComponentActivity() {
    private var multicastLock: WifiManager.MulticastLock? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Acquire Wi-Fi Multicast lock for mDNS packet reception on Android
        try {
            val wifiManager = applicationContext.getSystemService(WIFI_SERVICE) as WifiManager
            multicastLock = wifiManager.createMulticastLock("MafiaLanLock").apply {
                setReferenceCounted(true)
                acquire()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF07080C)
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Mafia LAN Engine Ready",
                            color = Color.White
                        )
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        multicastLock?.release()
    }
}

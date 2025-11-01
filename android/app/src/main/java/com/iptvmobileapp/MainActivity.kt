package com.iptvmobileapp

import android.os.Bundle
import android.view.View
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.reactnative.googlecast.api.RNGCCastContext

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "IPTVMobileApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null) // react-native-screens fix

    // 📺 Initialize Google Cast context (lazy load)
    try {
      RNGCCastContext.getSharedInstance(this)
    } catch (e: Exception) {
      // Cast not available on this device (emulator or no Google Play Services)
      e.printStackTrace()
    }

    // 🎯 FORCER masquage navigation bar (complément au thème)
    hideNavigationBar()
  }
  
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      hideNavigationBar()
    }
  }
  
  @Suppress("DEPRECATION")
  private fun hideNavigationBar() {
    window.decorView.systemUiVisibility = (
        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
        View.SYSTEM_UI_FLAG_FULLSCREEN
    )
  }
}

import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Firebase
import FirebaseMessaging
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Configure Firebase - Method swizzling enabled, so Firebase handles delegates automatically
    FirebaseApp.configure()
    print("✅ Firebase configured")
    
    // Explicitly register for remote notifications (even with method swizzling)
    // This ensures APNS token is received
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
      application.registerForRemoteNotifications()
      print("📱 Registered for remote notifications (explicit call)")
    }
    
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "demo",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
  
  // Handle APNS token registration (method swizzling will also handle this, but we log it)
  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    print("📱 APNS device token received in AppDelegate")
    let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
    let token = tokenParts.joined()
    print("📱 APNS Token: \(token)")
    
    // Method swizzling will automatically set this to Firebase Messaging
    // But we verify it's set
    Messaging.messaging().apnsToken = deviceToken
    print("✅ APNS token set to Firebase Messaging")
  }
  
  // Handle APNS token registration failure
  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("❌ Failed to register for remote notifications: \(error.localizedDescription)")
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

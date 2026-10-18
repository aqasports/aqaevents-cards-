import Flutter
import UIKit
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    UNUserNotificationCenter.current().delegate = self

    if let controller = window?.rootViewController as? FlutterViewController {
      let channel = FlutterMethodChannel(
        name: "com.aqasports.aqa_coaches/notifications",
        binaryMessenger: controller.binaryMessenger
      )
      channel.setMethodCallHandler { call, result in
        let center = UNUserNotificationCenter.current()
        switch call.method {
        case "checkPermission":
          center.getNotificationSettings { settings in
            let granted = settings.authorizationStatus == .authorized ||
              settings.authorizationStatus == .provisional
            DispatchQueue.main.async {
              result(granted)
            }
          }
        case "requestPermission":
          center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            DispatchQueue.main.async {
              result(granted)
            }
          }
        case "showNotification":
          let args = call.arguments as? [String: Any]
          let title = args?["title"] as? String ?? "AQA Coaches"
          let body = args?["body"] as? String ?? ""
          let tag = args?["tag"] as? String ?? UUID().uuidString

          let content = UNMutableNotificationContent()
          content.title = title
          content.body = body
          content.sound = .default

          let request = UNNotificationRequest(
            identifier: tag,
            content: content,
            trigger: nil
          )
          center.add(request) { _ in
            DispatchQueue.main.async {
              result(true)
            }
          }
        default:
          result(FlutterMethodNotImplemented)
        }
      }
    }

    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .list, .sound, .badge])
    } else {
      completionHandler([.alert, .sound, .badge])
    }
  }
}

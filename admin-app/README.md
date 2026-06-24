# AQA Sports Admin — Native Mobile & Desktop Apps

This directory contains the code and configuration to wrap the web-based AQA Sports Admin Portal into highly secure, native mobile (Android/iOS) and desktop applications using **Capacitor.js**.

---

## How It Works (App-Only Security)

To satisfy the requirement that **only app holders can access the admin section**, we use a custom App-Only signature pattern:

1. **Header Injection**: The native application shell loads `https://aqasports.com/admin` directly, but automatically injects a secure custom header:
   `X-Admin-App-Token: <your_secret_token>`
2. **Middleware Verification**: The Next.js server runs a middleware check on all `/admin/*` routes:
   - If `ENFORCE_ADMIN_APP=true` is set on the server, the middleware verifies the header.
   - If the header is missing or incorrect, it blocks the browser and serves a secure **403 Forbidden** page stating that the AQA Admin App is required.
   - If the header matches, the user is allowed to proceed to the login page and dashboard.

This completely hides the admin login page from public web browsers and crawlers while allowing seamless access from the official apps!

---

## Step 1 — Local Configuration & Testing

To test the mobile app locally using your development server:

1. In `admin-app/capacitor.config.json`, temporarily change the `server.url` to point to your local machine IP (or localhost if testing on an emulator on the same machine):
   ```json
   "server": {
     "url": "http://192.168.100.5:3000/admin",
     "headers": {
       "X-Admin-App-Token": "SUPER_SECURE_ADMIN_APP_TOKEN_CHANGE_ME"
     }
   }
   ```
2. Set the corresponding environment variables in your Next.js `.env` file:
   ```env
   ENFORCE_ADMIN_APP="true"
   ADMIN_APP_TOKEN="SUPER_SECURE_ADMIN_APP_TOKEN_CHANGE_ME"
   ```
3. Restart your Next.js dev server:
   ```bash
   npm run dev
   ```
4. Now, if you open `http://localhost:3000/admin` in your web browser, you will see the **"AQA Admin App Required"** access-denied page. This confirms the security is working!

---

## Step 2 — Building the Native Apps

### Prerequisites

- **Node.js** installed
- **Android Studio** (for Android builds)
- **Xcode** (for iOS builds, macOS required)

### Android Build Guide

1. Open your terminal in the `admin-app` directory:
   ```bash
   cd admin-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Add the Android platform:
   ```bash
   npm run add-android
   ```
4. Sync the Capacitor configuration:
   ```bash
   npm run sync
   ```
5. Open the project in Android Studio:
   ```bash
   npm run open-android
   ```
6. In Android Studio:
   - Wait for Gradle sync to complete.
   - Connect your phone via USB (with developer mode and USB debugging enabled) or start an emulator.
   - Click the **Run** button (green play icon) to launch the app on your device, or go to **Build → Build Bundle(s) / APK(s) → Build APK(s)** to generate the release `.apk` file!

### iOS Build Guide (Mac Only)

1. Add the iOS platform:
   ```bash
   npm run add-ios
   ```
2. Sync configuration:
   ```bash
   npm run sync
   ```
3. Open the project in Xcode:
   ```bash
   npm run open-ios
   ```
4. In Xcode:
   - Select your team/signing certificates.
   - Connect your iPhone or select a simulator.
   - Click the **Run** button to compile and launch the app!

---

## Step 3 — Going to Production

When you are ready to deploy the live production system:

1. Update the `server.url` in `admin-app/capacitor.config.json` back to the live production URL:
   ```json
   "server": {
     "url": "https://aqasports.com/admin",
     "headers": {
       "X-Admin-App-Token": "A_NEW_LONG_RANDOM_SECURE_PRODUCTION_TOKEN"
     }
   }
   ```
2. Compile your production release builds in Android Studio / Xcode.
3. In your Netlify dashboard under **Site Configuration → Environment Variables**, add the production keys:
   - `ENFORCE_ADMIN_APP` = `true`
   - `ADMIN_APP_TOKEN` = `A_NEW_LONG_RANDOM_SECURE_PRODUCTION_TOKEN` (must match the token inside your compiled app)
4. Deploy the site.

From this point forward, the admin portal is 100% locked down to the app shell! Any changes you make to the admin UI on the web will be instantly updated in the native apps without needing to recompile or redistribute the APK/IPA files.

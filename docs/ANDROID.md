# Android — Cane Companion

Two wrappers for the same PWA (`apps/web`). PWA stays source of truth. No native fork.

## Option A — Capacitor (native WebView)

Wraps `dist` in an Android WebView. Needed for native plugins (future ultrasonic/lidar) and when you want a Play Store build without Digital Asset Links.

```
apps/web/capacitor.config.ts  -> appId com.dixon.cane, webDir dist
apps/web/android/              -> generated native project (gitignored)
apps/web/public/.well-known/assetlinks.json -> also used by Capacitor if you add asset links
```

```bash
# one-time (already done)
npm --prefix apps/web install @capacitor/core @capacitor/cli @capacitor/android
npx --prefix apps/web cap init "Cane Companion" com.dixon.cane --web-dir=dist
npx --prefix apps/web cap add android

# after every web change
npm --prefix apps/web run build
npx --prefix apps/web cap copy android   # or npm --prefix apps/web run cap:copy
npx --prefix apps/web cap sync android   # updates plugins
npx --prefix apps/web cap open android  # opens Android Studio

# in Android Studio: Build -> Generate Signed Bundle / APK
```

Requirements: Android Studio, JDK 17, Android SDK 33+. Signing: create `android.keystore` (never commit - gitignored).

Install on Xiaomi via USB: `adb install android/app/build/outputs/apk/debug/app-debug.apk`

## Option B — TWA (Bubblewrap, Trusted Web Activity)

Wraps the deployed PWA URL as a Play Store app. No native project. Best for store with zero native code.

```
twa/twa-manifest.json              -> Bubblewrap config (replace REPLACE_WITH_DEPLOYED_HOST)
twa/README.md                      -> full steps
apps/web/public/.well-known/assetlinks.json -> fingerprint goes here, must be live at https://YOUR_HOST/.well-known/assetlinks.json
```

```bash
npm i -g @bubblewrap/cli

# after deploying PWA to https://YOUR_HOST
# edit twa/twa-manifest.json host + iconUrl + manifestUrl
bubblewrap init --manifest https://YOUR_HOST/manifest.webmanifest --manifest ./twa/twa-manifest.json
bubblewrap build
# fingerprint from build -> put in apps/web/public/.well-known/assetlinks.json -> redeploy -> verify

# upload twa/app/build/outputs/bundle/release/app-release-bundle.aab to Play Console
```

PackageIds are separate to allow both installed: Capacitor `com.dixon.cane`, TWA `com.dixon.cane.twa`. Change TWA to `com.dixon.cane` if you want one app.

## Which to use

- Demo on device now: just install PWA from `http://YOUR_HOST` via Chrome -> Add to Home screen (fastest on 2510DRA23E).
- Play Store with no native: TWA.
- Future sensor wearable (ultrasonic/lidar) or background service: Capacitor.

## Build verification (Oct 31)

- `apps/web` tsc --noEmit pass
- `npm --prefix apps/web run build` 1.8s 122.72 kB + 135.93 kB vision, precache 6 entries, `.well-known/assetlinks.json` copied to dist and to android assets
- `npx cap copy android` pass
- Dev server http://localhost:5173 200 reachable

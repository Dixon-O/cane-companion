# TWA - Trusted Web Activity

Wraps the Cane Companion PWA (`apps/web`) as a Play Store app via Bubblewrap. No native code. Keep the PWA as source of truth.

## Prereqs
- Deployed PWA on HTTPS (Vercel, Netlify, etc.) with `manifest.webmanifest` and `public/.well-known/assetlinks.json`
- Node 18+, JDK 17, Android SDK, Bubblewrap: `npm i -g @bubblewrap/cli`

## One-time setup (after deploy)
```bash
# 1. Update twa-manifest.json: replace REPLACE_WITH_DEPLOYED_HOST with your domain (no https://, no trailing slash)
#    e.g. cane-companion.vercel.app

# 2. Init from manifest (overwrites this template with real fingerprints)
bubblewrap init --manifest https://YOUR_HOST/manifest.webmanifest --manifest ./twa/twa-manifest.json

# 3. Build
bubblewrap build
# -> creates android project, signs with android.keystore, outputs app-release-signed.apk / .aab

# 4. Get SHA256 fingerprint from build output and put it in
#    apps/web/public/.well-known/assetlinks.json
#    Redeploy PWA so https://YOUR_HOST/.well-known/assetlinks.json is live

# 5. Verify Digital Asset Links
#    https://developers.google.com/digital-asset-links/tools/generator
```

## Update after PWA changes
No rebuild needed for content - TWA loads live URL. Only rebuild if `twa-manifest.json` changes (icon, colors, packageId).

## Package IDs
- PWA: standalone
- TWA: `com.dixon.cane.twa` (separate from Capacitor `com.dixon.cane` to allow both on one device)
- To use same ID, change this file to `com.dixon.cane` and uninstall Capacitor build first.

## Upload to Play Console
Upload `app-release-bundle.aab` from `app/build/outputs/bundle/release/`.

## Local test without deploy
```bash
bubblewrap build --skipPwaValidation
adb install app/build/outputs/apk/release/app-release-signed.apk
```

## Troubleshooting
- `Asset link verification failed`: redeploy assetlinks.json, check sha256, wait 10 min, clear Chrome cache.
- `MANIFEST_NOT_FOUND`: ensure manifest is at /manifest.webmanifest (Vite PWA does this).
- Location permission: enable `locationDelegation` already true in manifest.

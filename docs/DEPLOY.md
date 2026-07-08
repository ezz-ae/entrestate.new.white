# Deploying to Firebase — project `thinking-prism-495619-u8`

The app is configured for **Firebase App Hosting** (the supported path for
Next.js). Server code uses Firebase Admin via `applicationDefault()`, so the
backend runs as the project's ambient service account
(`firebase-622@thinking-prism-495619-u8.iam.gserviceaccount.com`) — **no key
file is committed or needed**.

## One-time setup

1. **Enable App Hosting + Firestore** in the Firebase console for
   `thinking-prism-495619-u8` (App Hosting, and create a Firestore database in
   Native mode if you haven't).

2. **Create the Gemini secret** (used by every AI flow):
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use thinking-prism-495619-u8
   firebase apphosting:secrets:set GEMINI_API_KEY   # paste the key when prompted
   ```

3. **Deploy Firestore rules + indexes** (locks client access; adds the
   voicePages composite index):
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

## Deploy the app — two options

### A. App Hosting from GitHub (recommended)
In the console → **App Hosting → Create backend** → connect the repo
`ezz-ae/entrestate.new.white`, branch `main`. It reads `apphosting.yaml`,
builds with `npm run build`, and redeploys on every push. Grant the backend
access to the `GEMINI_API_KEY` secret when prompted.

### B. CLI
```bash
firebase experiments:enable webframeworks   # if needed
firebase deploy
```

## Verify after deploy
- Visit `/` and `/pitch`; start a call (needs `GEMINI_API_KEY` live).
- `/styles` — paste a real estate URL, confirm four styles render.
- Provisioning writes to the `tenants` collection; buyer leads to
  `users/{uid}/leads`; both should appear in Firestore.

## Notes
- The service account runs with project-default permissions; ensure it has
  **Cloud Datastore User** (Firestore) and access to the Gemini API.
- Custom domains: add them in App Hosting; the app's `middleware.ts` maps an
  unknown host to that brand's voice page (`/v/~<host>`).

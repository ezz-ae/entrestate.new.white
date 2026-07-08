
// Server-side only Firebase Admin singletons. Deliberately NOT a 'use server'
// module: that directive is for Server Actions and forbids object exports.

import { getApps, initializeApp, applicationDefault, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Resolve the project id explicitly so Firestore/Auth never fail with
// "Unable to detect a Project Id in the current environment" — which happens
// during a build (e.g. on Vercel) where no ambient GCP project is present.
const projectId =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  'thinking-prism-495619-u8';

let app: App;
if (!getApps().length) {
  app = initializeApp({
    // On GCP/Firebase this picks up the ambient service account. Locally,
    // point GOOGLE_APPLICATION_CREDENTIALS at a service-account JSON.
    credential: applicationDefault(),
    projectId,
  });
} else {
  app = getApps()[0]!;
}

export const adminApp: App = app;
export const adminAuth: Auth = getAuth(app);        // ✅ non-null
const db: Firestore = getFirestore(app);
// Optional fields (tagline, phone, price, handover…) are frequently undefined;
// without this, ref.set/.add throws "Cannot use 'undefined' as a Firestore value",
// which would crash tenant provisioning and voice-page creation on most inputs.
try { db.settings({ ignoreUndefinedProperties: true }); } catch { /* already initialized */ }
export const adminDb: Firestore = db; // ✅ non-null


'use server';

import { adminAuth } from "./firebaseAdmin";

export async function ok<T>(data: T, init: number = 200) {
  return Response.json({ ok: true, data }, { status: init });
}
export async function bad(message = "Bad Request", init: number = 400) {
  return Response.json({ ok: false, error: message }, { status: init });
}
export async function fail(error: any, code = 500) {
  console.error('[API FAIL]', error);
  // Avoid leaking detailed internal errors to the client
  const message = typeof error === 'string' ? error : (error?.message || "An internal server error occurred.");
  return Response.json({ ok: false, error: message }, { status: code });
}

/**
 * Extracts the user's UID from the Authorization header of a request.
 * @param req The incoming Request object.
 * @returns The UID of the authenticated user, or null if not authenticated.
 */
export async function getUidFromRequest(req: Request): Promise<string | null> {
    if (!adminAuth) {
        console.error("Firebase Admin Auth is not initialized. Cannot verify ID token.");
        return null;
    }
    try {
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return null;
        }
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.error("Error verifying ID token:", error);
        return null;
    }
}

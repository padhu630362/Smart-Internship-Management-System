import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseAdminAuth = null;

try {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'sims-d9539';
    const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      const app = initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
      firebaseAdminAuth = getAuth(app);
    } else {
      const app = initializeApp({ projectId });
      firebaseAdminAuth = getAuth(app);
    }
  } else {
    firebaseAdminAuth = getAuth(getApps()[0]);
  }
} catch (err) {
  // Graceful fallback if credentials are not configured or offline
  firebaseAdminAuth = null;
}

export const getFirebaseAuth = () => firebaseAdminAuth;
export default getFirebaseAuth;

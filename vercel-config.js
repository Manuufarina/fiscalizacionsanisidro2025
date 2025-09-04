// Firebase setup (used by index.html for existing auth & Firestore flows)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js';

// Vercel Blob client via CDN for dashboard data persistence
// Note: Put and Del have been removed for security. Writes must go through the API.
import { list as blobList, head as blobHead } from 'https://esm.sh/@vercel/blob@1.1.1';

// Existing Firebase project configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAAaqOajWwLX_K9PF0NLvYM4Ecvpkq2qbI',
  authDomain: 'fiscalizacion-san-isidro.firebaseapp.com',
  projectId: 'fiscalizacion-san-isidro',
  storageBucket: 'fiscalizacion-san-isidro.firebasestorage.app',
  messagingSenderId: '316196246026',
  appId: '1:316196246026:web:8b0546f002ef811a6705f3'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// IMPORTANT: The read-write token has been removed from client-side code.
// You MUST provide a Blob Read-Only Token here for the dashboard to work.
// You can get this from your Vercel project's storage settings.
const BLOB_READ_ONLY_TOKEN = 'YOUR_BLOB_READ_ONLY_TOKEN_HERE';

const blob = {
  // put and del have been removed from the client-side helper.
  // All write operations now go through the /api/put-json endpoint.
  list: (options = {}) =>
    blobList({ token: BLOB_READ_ONLY_TOKEN, ...options }),
  head: (urlOrPathname, options = {}) =>
    blobHead(urlOrPathname, { token: BLOB_READ_ONLY_TOKEN, ...options })
};

export { app, db, auth, storage, blob };

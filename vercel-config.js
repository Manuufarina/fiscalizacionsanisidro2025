// Firebase setup (used by index.html for existing auth & Firestore flows)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js';

// Vercel Blob client via CDN for dashboard data persistence
import { put as blobPut, list as blobList, del as blobDel, head as blobHead } from 'https://esm.sh/@vercel/blob@1.1.1';

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

// Token for Vercel Blob operations
const BLOB_TOKEN = 'vercel_blob_rw_t3xlaMIgr85aZOXy_NaxucdEUMociBnvV09S74OqRvTYfs8';
// Use the current origin to avoid cross-origin requests that are blocked by CORS
const BLOB_ENDPOINT = `${location.origin}/api/blob`;

// @vercel/blob reads the API base URL from an environment variable when running
// in the browser. Ensure it points to a same-origin proxy so requests don't hit
// vercel.com directly and trigger CORS errors.
if (!globalThis.process) globalThis.process = { env: {} };
globalThis.process.env = globalThis.process.env || {};
globalThis.process.env.NEXT_PUBLIC_VERCEL_BLOB_API_URL = BLOB_ENDPOINT;

const blob = {
  put: (pathname, body, options = {}) =>
    blobPut(pathname, body, {
      token: BLOB_TOKEN,
      addRandomSuffix: false,
      ...options
    }),
  list: (options = {}) =>
    blobList({ token: BLOB_TOKEN, ...options }),
  del: (urlOrPathname, options = {}) =>
    blobDel(urlOrPathname, { token: BLOB_TOKEN, ...options }),
  head: (urlOrPathname, options = {}) =>
    blobHead(urlOrPathname, { token: BLOB_TOKEN, ...options })
};

export { app, db, auth, storage, blob };


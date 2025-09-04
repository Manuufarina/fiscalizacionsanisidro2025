// Firebase setup (used by index.html for existing auth & Firestore flows)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js';

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

// This object now interacts with our serverless function proxy
const blob = {
  async list(options = {}) {
    const prefix = options.prefix || '';
    const response = await fetch(`/api/blob-proxy?prefix=${encodeURIComponent(prefix)}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to list blobs:', errorText);
      throw new Error(`Failed to list blobs: ${errorText}`);
    }
    return response.json();
  },

  async put(pathname, body, options = {}) {
    // The body for `put` in the original code is a JSON string.
    // The proxy expects the body to be passed in a JSON payload.
    const response = await fetch('/api/blob-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pathname,
        body, // body is already a string here
        options: {
          access: options.access,
          contentType: options.contentType
        }
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to upload blob:', errorText);
      throw new Error(`Failed to upload blob: ${errorText}`);
    }
    return response.json();
  },

  // The original admin.html uses head() to check if mesas.json exists.
  // We need a proxy endpoint for this. I will add it to the proxy and here.
  async head(pathname = '') {
     const response = await fetch(`/api/blob-proxy/head?pathname=${encodeURIComponent(pathname)}`);
     if (!response.ok) {
        if(response.status === 404) {
            // Replicate the behavior of the original @vercel/blob client, which throws a 404 error
            const error = new Error('Blob not found');
            error.status = 404;
            throw error;
        }
        const errorText = await response.text();
        console.error('Failed to head blob:', errorText);
        throw new Error(`Failed to head blob: ${errorText}`);
     }
     return response.json();
  },

  async del(url) {
    const response = await fetch('/api/blob-proxy', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok && response.status !== 204) {
      const errorText = await response.text();
      console.error('Failed to delete blob:', errorText);
      throw new Error(`Failed to delete blob: ${errorText}`);
    }
    // A 204 No Content response has no body to parse, so we just return on success.
  }
};

export { app, db, auth, storage, blob };

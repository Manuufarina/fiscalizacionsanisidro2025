// Firebase setup (used by index.html for existing auth & Firestore flows)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js';
import { upload } from 'https://cdn.jsdelivr.net/npm/@vercel/blob@0.22.1/dist/index.browser.js';

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

// Helper function to create timeout signal (with fallback for older browsers)
function createTimeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
    return AbortSignal.timeout(ms);
  }
  // Fallback for browsers without AbortSignal.timeout
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// Helper function to retry requests
async function retryFetch(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry on 404 errors
      if (error.status === 404) throw error;
      
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

// This object now interacts with our serverless function proxy
const blob = {
  async list(options = {}) {
    return retryFetch(async () => {
      const prefix = options.prefix || '';
      const response = await fetch(`/api/blob-proxy?prefix=${encodeURIComponent(prefix)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: createTimeoutSignal(30000) // 30 second timeout
      });
      
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unknown error';
        }
        console.error('Failed to list blobs:', errorText);
        
        // Check if it's a token configuration issue
        if (errorText.includes('BLOB_READ_WRITE_TOKEN')) {
          throw new Error('Blob Storage not configured. Please check the README for setup instructions.');
        }
        
        throw new Error(`Failed to list blobs: ${errorText}`);
      }
      return response.json();
    });
  },

  async put(pathname, body, options = {}) {
    const isFile = body instanceof File || body instanceof Blob;

    // --- FILE UPLOAD ---
    // For files, we need a two-step process:
    // 1. Get a signed URL from our serverless function proxy.
    // 2. Upload the file directly to that signed URL.
    if (isFile) {
      // 1. Get signed URL
      const signedUrlInfo = await retryFetch(async () => {
        const response = await fetch('/api/blob-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pathname,
            // For file uploads, we don't send the body to the proxy.
            // This signals the proxy to generate a signed URL.
            options: { ...options, contentType: body.type, allowOverwrite: true },
          }),
          signal: createTimeoutSignal(30000),
        });
        if (!response.ok) {
          throw new Error(`Failed to get signed URL: ${await response.text()}`);
        }
        return response.json();
      });

      // 2. Upload the file directly to the signed URL from the browser
      await retryFetch(async () => {
        const uploadResponse = await fetch(signedUrlInfo.url, {
          method: 'PUT',
          body: body,
          headers: { 'x-ms-blob-type': 'BlockBlob' }, // Required by Azure Blob Storage
        });
        if (!uploadResponse.ok) {
          throw new Error(`Direct upload failed: ${await uploadResponse.text()}`);
        }
      });

      // 3. Return the blob metadata from the first response
      return signedUrlInfo;
    }

    // --- DATA UPLOAD ---
    // For JSON data, we send it directly through the proxy.
    return retryFetch(async () => {
      const response = await fetch('/api/blob-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pathname,
          body, // The body is the JSON string
          options: { ...options, allowOverwrite: true },
        }),
        signal: createTimeoutSignal(30000),
      });

      if (!response.ok) {
        let errorText;
        try { errorText = await response.text(); } catch (e) { errorText = 'Unknown error'; }
        console.error('Failed to upload blob:', errorText);
        if (errorText.includes('BLOB_READ_WRITE_TOKEN')) {
          throw new Error('Blob Storage not configured. Please check the README for setup instructions.');
        }
        throw new Error(`Failed to upload blob: ${errorText}`);
      }
      return response.json();
    });
  },

  async head(pathname = '') {
    return retryFetch(async () => {
      const response = await fetch(`/api/blob-proxy/head?pathname=${encodeURIComponent(pathname)}`, {
        signal: createTimeoutSignal(30000) // 30 second timeout
      });
      
      if (!response.ok) {
        if(response.status === 404) {
          const error = new Error('Blob not found');
          error.status = 404;
          throw error;
        }
        
        let errorText;
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unknown error';
        }
        console.error('Failed to head blob:', errorText);
        
        // Check if it's a token configuration issue
        if (errorText.includes('BLOB_READ_WRITE_TOKEN')) {
          throw new Error('Blob Storage not configured. Please check the README for setup instructions.');
        }
        
        throw new Error(`Failed to head blob: ${errorText}`);
      }
      return response.json();
    });
  },

  async del(url) {
    return retryFetch(async () => {
      const response = await fetch('/api/blob-proxy', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: createTimeoutSignal(30000) // 30 second timeout
      });

      if (!response.ok && response.status !== 204) {
        let errorText;
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unknown error';
        }
        console.error('Failed to delete blob:', errorText);
        
        // Check if it's a token configuration issue
        if (errorText.includes('BLOB_READ_WRITE_TOKEN')) {
          throw new Error('Blob Storage not configured. Please check the README for setup instructions.');
        }
        
        throw new Error(`Failed to delete blob: ${errorText}`);
      }
    });
  }
};

export { app, db, auth, storage, blob, upload };

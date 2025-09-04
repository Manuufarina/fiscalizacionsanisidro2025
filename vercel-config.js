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
    return retryFetch(async () => {
      const response = await fetch('/api/blob-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pathname,
          body, // body is already a string here
          options: {
            access: options.access,
            contentType: options.contentType,
            allowOverwrite: true
          }
        }),
        signal: createTimeoutSignal(30000) // 30 second timeout
      });
      
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unknown error';
        }
        console.error('Failed to upload blob:', errorText);
        
        // Check if it's a token configuration issue
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

export { app, db, auth, storage, blob };

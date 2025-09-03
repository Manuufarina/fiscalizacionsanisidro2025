// Vercel Blob client via CDN for dashboard data persistence
import { put as blobPut, del as blobDel, head as blobHead } from 'https://esm.sh/@vercel/blob@1.1.1';

// Token for Vercel Blob operations
const BLOB_TOKEN = 'vercel_blob_rw_t3xlaMIgr85aZOXy_NaxucdEUMociBnvV09S74OqRvTYfs8';
const BLOB_BASE_URL = `${location.origin}/api/blob`;

const blob = {
  put: (pathname, body, options = {}) =>
    blobPut(pathname, body, { token: BLOB_TOKEN, addRandomSuffix: false, ...options }),
  del: (urlOrPathname, options = {}) =>
    blobDel(urlOrPathname, { token: BLOB_TOKEN, ...options }),
  head: (urlOrPathname, options = {}) =>
    blobHead(urlOrPathname, { token: BLOB_TOKEN, ...options }),
  url: (pathname) => `${BLOB_BASE_URL}/${pathname}`
};

export { blob };


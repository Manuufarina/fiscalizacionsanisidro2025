let db;
let blob;

// Allow configuration both on server (via process.env) and in the browser
// (via global variables injected before importing this module).
const env = typeof process !== 'undefined' && process.env ? process.env : {};

const POSTGRES_URL = env.POSTGRES_URL;
const BLOB_READ_WRITE_TOKEN = env.BLOB_READ_WRITE_TOKEN ||
  (typeof window !== 'undefined' ? window.BLOB_READ_WRITE_TOKEN : undefined);
const BLOB_STORE_ID = env.BLOB_STORE_ID ||
  (typeof window !== 'undefined' ? window.BLOB_STORE_ID : undefined);

if (POSTGRES_URL && typeof window === 'undefined') {
  const { createPool } = await import('@vercel/postgres');
  db = createPool({ connectionString: POSTGRES_URL });
}

if (BLOB_READ_WRITE_TOKEN && BLOB_STORE_ID) {
  const blobModule =
    typeof window === 'undefined'
      ? await import('@vercel/blob')
      : await import('https://esm.sh/@vercel/blob@1?bundle');
  const {
    put: blobPut,
    list: blobList,
    del: blobDel,
    head: blobHead,
  } = blobModule;
  blob = {
    put: (pathname, body, options = {}) =>
      blobPut(pathname, body, {
        token: BLOB_READ_WRITE_TOKEN,
        storeId: BLOB_STORE_ID,
        ...options,
      }),
    list: (options = {}) =>
      blobList({
        token: BLOB_READ_WRITE_TOKEN,
        storeId: BLOB_STORE_ID,
        ...options,
      }),
    del: (urlOrPathname, options = {}) =>
      blobDel(urlOrPathname, {
        token: BLOB_READ_WRITE_TOKEN,
        storeId: BLOB_STORE_ID,
        ...options,
      }),
    head: (urlOrPathname, options = {}) =>
      blobHead(urlOrPathname, {
        token: BLOB_READ_WRITE_TOKEN,
        storeId: BLOB_STORE_ID,
        ...options,
      }),
  };
}

export { db, blob };

let db;
let blob;

if (typeof window === 'undefined') {
  const { createPool } = await import('@vercel/postgres');
  const { put: blobPut, list: blobList, del: blobDel, head: blobHead } = await import('@vercel/blob');

  const {
    POSTGRES_URL,
    BLOB_READ_WRITE_TOKEN,
    BLOB_STORE_ID,
  } = process.env;

  if (!POSTGRES_URL) {
    throw new Error('POSTGRES_URL env var is not set');
  }
  if (!BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN env var is not set');
  }
  if (!BLOB_STORE_ID) {
    throw new Error('BLOB_STORE_ID env var is not set');
  }

  db = createPool({ connectionString: POSTGRES_URL });

  blob = {
    put: (pathname, body, options = {}) =>
      blobPut(pathname, body, { token: BLOB_READ_WRITE_TOKEN, storeId: BLOB_STORE_ID, ...options }),
    list: (options = {}) =>
      blobList({ token: BLOB_READ_WRITE_TOKEN, storeId: BLOB_STORE_ID, ...options }),
    del: (urlOrPathname, options = {}) =>
      blobDel(urlOrPathname, { token: BLOB_READ_WRITE_TOKEN, storeId: BLOB_STORE_ID, ...options }),
    head: (urlOrPathname, options = {}) =>
      blobHead(urlOrPathname, { token: BLOB_READ_WRITE_TOKEN, storeId: BLOB_STORE_ID, ...options }),
  };
}

export { db, blob };

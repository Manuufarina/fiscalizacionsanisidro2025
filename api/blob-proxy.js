// api/blob-proxy.js
const { list, put, head, del } = require('@vercel/blob');

// Increase timeout configuration
module.exports = async function handler(request, response) {
  // CORS headers for browser compatibility
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  // IMPORTANT: The project owner must set the BLOB_READ_WRITE_TOKEN environment variable in Vercel.
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    response.status(500).json({ 
      message: 'The BLOB_READ_WRITE_TOKEN environment variable is not set. Please configure it in your Vercel project settings.' 
    });
    return;
  }

  const url = new URL(request.url, `https://${request.headers.host}`);
  const pathname = url.pathname;

  try {
    if (request.method === 'GET') {
      if (pathname.includes('/head')) {
        // Handle blob.head()
        const filePathname = url.searchParams.get('pathname') || '';
        if (!filePathname) {
          response.status(400).json({ message: 'Missing "pathname" parameter' });
          return;
        }

        try {
          const headResult = await head(filePathname, { token });
          response.status(200).json(headResult);
        } catch (error) {
          if (error.message && error.message.includes('404')) {
            response.status(404).json({ message: 'Not found' });
          } else {
            throw error;
          }
        }
      } else {
        // Handle blob.list()
        const prefix = url.searchParams.get('prefix') || '';
        const listResult = await list({ 
          prefix, 
          token,
          limit: 1000  // Add limit to avoid timeout on large lists
        });
        response.status(200).json(listResult);
      }
    } else if (request.method === 'POST') {
      const jsonBody = await new Promise((resolve, reject) => {
        let data = '';
        request.on('data', chunk => { data += chunk; });
        request.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (error) { reject(error); }
        });
        request.on('error', reject);
      });

      const { pathname: blobPath, body: blobContent, options } = jsonBody;

      if (!blobPath) {
        return response.status(400).json({ message: 'Missing "pathname"' });
      }

      // If blobContent is present, it's a data upload (e.g., mesas.json).
      if (blobContent !== undefined) {
        const blob = await put(blobPath, blobContent, {
          ...options,
          token,
          addRandomSuffix: false,
        });
        return response.status(200).json(blob);
      }
      // If blobContent is missing, it's a request for a signed URL.
      else {
        if (!options || !options.contentLength) {
          return response.status(400).json({ message: 'Missing "options.contentLength" for signed URL request' });
        }

        // When the body is `null`, the Vercel Blob SDK generates a signed URL for a PUT request.
        // `contentLength` is required in this case.
        const blob = await put(blobPath, null, {
          ...options,
          token,
          addRandomSuffix: false,
          contentLength: options.contentLength
        });
        return response.status(200).json(blob);
      }
    } else if (request.method === 'DELETE') {
      // Handle blob.del()
      const body = await new Promise((resolve, reject) => {
        let data = '';
        request.on('data', chunk => {
          data += chunk;
        });
        request.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
        request.on('error', reject);
      });

      const { url: blobUrl } = body;
      if (!blobUrl) {
        response.status(400).json({ message: 'Missing "url" in request body for delete operation.' });
        return;
      }
      
      await del(blobUrl, { token });
      response.status(204).end();
    } else {
      response.status(405).json({ message: `Method ${request.method} Not Allowed` });
    }
  } catch (error) {
    console.error("Error in blob proxy:", error);
    response.status(500).json({ 
      message: `Error processing request: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Export config to increase timeout (requires Vercel Pro for > 10 seconds)
module.exports.config = {
  maxDuration: 30  // Maximum allowed on Hobby plan is 10, Pro/Team allows up to 300
};

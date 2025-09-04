// api/blob-proxy.js
const { list, put, head, del } = require('@vercel/blob');
const { handleUpload } = require('@vercel/blob/server');

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

      // If the body has an `event` property, it's a Vercel Blob client request.
      // We use `handleUpload` to process it.
      if (jsonBody.event) {
        try {
          const jsonResponse = await handleUpload({
            body: jsonBody,
            request,
            onBeforeGenerateToken: async (pathname) => {
              // Authorize the upload. For now, allow all image types.
              return {
                allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                // The token payload can be used in onUploadCompleted
                tokenPayload: JSON.stringify({ pathname }),
              };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
              console.log('Blob upload completed:', blob, tokenPayload);
            },
          });
          return response.status(200).json(jsonResponse);
        } catch (error) {
          return response.status(400).json({ error: error.message });
        }
      }
      // Otherwise, it's a data upload using our custom method.
      else {
        const { pathname: blobPath, body: blobContent, options } = jsonBody;
        if (!blobPath || blobContent === undefined) {
          return response.status(400).json({ message: 'Missing "pathname" or "body" for data upload' });
        }
        const blob = await put(blobPath, blobContent, {
          ...options,
          token,
          addRandomSuffix: false,
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

import { handleUpload } from '@vercel/blob/server';

// This function runs in the Node.js runtime by default.
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // The body is already parsed by Vercel's infrastructure
  const body = request.body;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // This function runs on the server, so we can use environment variables
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          throw new Error('Missing BLOB_READ_WRITE_TOKEN environment variable');
        }
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          // The token is read from the environment variable
          token: process.env.BLOB_READ_WRITE_TOKEN,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // You can perform actions after the upload is complete here
        // console.log('Blob upload completed:', blob, tokenPayload);
      },
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    return response.status(500).json({
      message: error.message || 'An error occurred during the upload.',
    });
  }
}

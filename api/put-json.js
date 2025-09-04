import { put } from '@vercel/blob';

// By default, Vercel runs this as a Node.js serverless function.
// We remove the edge runtime config to allow Node.js specific modules.

export default async function handler(request, response) {
  // Use `request.query` for query parameters in Node.js runtime
  const { filename } = request.query;

  // The body is already parsed in the Node.js runtime
  const body = request.body;

  if (!filename || !body) {
    return response.status(400).json({ message: 'Missing filename or body' });
  }

  try {
    // Vercel's environment provides the BLOB_READ_WRITE_TOKEN
    const blob = await put(filename, body, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return response.status(200).json(blob);
  } catch (error) {
    return response.status(500).json({ message: error.message || 'Error uploading file.' });
  }
}

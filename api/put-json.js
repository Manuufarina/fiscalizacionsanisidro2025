import { put } from '@vercel/blob';

export default async function handler(request, response) {
  const { filename } = request.query;
  // For the Vercel Node.js runtime, the body is available directly.
  const body = request.body;

  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' });
  }
  if (!filename || !body) {
    return response.status(400).json({ message: 'Missing filename or body' });
  }

  try {
    // The `put` function expects a string or buffer.
    // Since the client sends a stringified JSON with 'text/plain',
    // the body should be the raw string.
    const blob = await put(filename, body, {
      access: 'public',
      contentType: 'application/json', // We're saving it as JSON
      addRandomSuffix: false,
    });
    return response.status(200).json(blob);
  } catch (error) {
    return response.status(500).json({ message: error.message || 'Error uploading file.' });
  }
}

import { put } from '@vercel/blob';

// Helper to read the request body stream
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(request, response) {
  const { filename } = request.query;

  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' });
  }
  if (!filename) {
    return response.status(400).json({ message: 'Missing filename' });
  }

  try {
    const body = await streamToString(request);
    
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


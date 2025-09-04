import { put } from '@vercel/blob';

export default async function handler(request, response) {
  const { filename } = request.query;
  const body = request.body;

  if (!filename || !body) {
    return response.status(400).json({ message: 'Missing filename or body' });
  }

  try {
    // The body is pre-parsed by Vercel, so we re-stringify it for storage.
    const blob = await put(filename, JSON.stringify(body), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return response.status(200).json(blob);
  } catch (error) {
    return response.status(500).json({ message: error.message || 'Error uploading file.' });
  }
}

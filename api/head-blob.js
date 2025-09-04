import { list } from '@vercel/blob';

export default async function handler(request, response) {
  const { pathname } = request.query;
  if (!pathname) {
    return response.status(400).json({ message: 'Missing pathname query parameter.' });
  }

  try {
    // Workaround: Use list() instead of head() to check for existence.
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    
    const exactMatch = blobs.find(b => b.pathname === pathname);

    if (exactMatch) {
      return response.status(200).json(exactMatch);
    } else {
      return response.status(404).json({ message: 'Blob not found.' });
    }
  } catch (error) {
    return response.status(500).json({ message: error.message || 'Error checking file.' });
  }
}

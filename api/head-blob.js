import { head } from '@vercel/blob';

export default async function handler(request, response) {
  const { pathname } = request.query;
  if (!pathname) {
    return response.status(400).json({ message: 'Missing pathname query parameter.' });
  }
  try {
    const blob = await head(pathname);
    return response.status(200).json(blob);
  } catch (error) {
    if (error.status === 404) {
      return response.status(404).json({ message: 'Blob not found.' });
    }
    return response.status(500).json({ message: error.message || 'Error checking file.' });
  }
}
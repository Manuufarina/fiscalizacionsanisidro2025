import { head } from '@vercel/blob';

// This function is run by Vercel in a Node.js environment
export default async function handler(request, response) {
  const { pathname } = request.query;

  if (!pathname) {
    return response.status(400).json({ message: 'Missing pathname query parameter.' });
  }

  try {
    const blob = await head(pathname);
    return response.status(200).json(blob);
  } catch (error) {
    // The `head` method throws an error for 404 not found.
    // We can check the status on the error object if it exists,
    // otherwise, we return a generic 404.
    if (error.status === 404) {
      return response.status(404).json({ message: 'Blob not found.' });
    }
    return response.status(500).json({ message: error.message || 'Error checking file.' });
  }
}

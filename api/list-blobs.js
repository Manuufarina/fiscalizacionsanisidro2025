import { list } from '@vercel/blob';

// This function is run by Vercel in a Node.js environment
export default async function handler(request, response) {
  const { prefix } = request.query;

  try {
    // The Vercel environment provides the required BLOB_READ_WRITE_TOKEN
    const listResult = await list({
      prefix: prefix || '',
      limit: 10 // Limit to avoid overly large responses, adjust as needed
    });
    return response.status(200).json(listResult);
  } catch (error) {
    return response.status(500).json({ message: error.message || 'Error listing files.' });
  }
}

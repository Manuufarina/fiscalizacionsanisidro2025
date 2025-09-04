import { list } from '@vercel/blob';

export default async function handler(request, response) {
  const { prefix } = request.query;
  try {
    const listResult = await list({ prefix: prefix || '', limit: 10 });
    return response.status(200).json(listResult);
  } catch (error) {
    return response.status(500).json({ message: error.message || 'Error listing files.' });
  }
}

import { put } from '@vercel/blob';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename || !request.body) {
    return new Response(JSON.stringify({ message: 'Missing filename or body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Vercel's environment will provide the BLOB_READ_WRITE_TOKEN
    const blob = await put(filename, request.body, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return new Response(JSON.stringify(blob), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message || 'Error uploading file.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

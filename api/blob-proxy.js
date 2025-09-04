import { list, put, head, del } from '@vercel/blob';

export default async function handler(request) {
  // IMPORTANT: The project owner must set the BLOB_READ_WRITE_TOKEN environment variable in Vercel.
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return new Response(
      JSON.stringify({ message: 'The BLOB_READ_WRITE_TOKEN environment variable is not set. Please configure it in your Vercel project settings.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { searchParams, pathname: reqPath } = new URL(request.url);

  try {
    if (request.method === 'GET') {
      if (reqPath.startsWith('/api/blob-proxy/head')) {
        // Handle blob.head()
        const pathname = searchParams.get('pathname') || '';
        if (!pathname) return new Response('Missing "pathname"', { status: 400 });

        try {
            const headResult = await head(pathname, { token });
            return new Response(JSON.stringify(headResult), { headers: { 'Content-Type': 'application/json' } });
        } catch (error) {
            if (error.status === 404) {
                 return new Response('Not found', { status: 404 });
            }
            throw error;
        }

      } else {
        // Handle blob.list()
        const prefix = searchParams.get('prefix') || '';
        const listResult = await list({ prefix, token });
        return new Response(JSON.stringify(listResult), { headers: { 'Content-Type': 'application/json' } });
      }
    } else if (request.method === 'POST') {
      // Handle blob.put()
      const { pathname, body, options } = await request.json();
      if (!pathname || body === undefined) return new Response('Missing "pathname" or "body"', { status: 400 });

      const blob = await put(pathname, body, {
        ...options,
        token,
        addRandomSuffix: false,
      });
      return new Response(JSON.stringify(blob), { headers: { 'Content-Type': 'application/json' } });
    } else if (request.method === 'DELETE') {
        // Handle blob.del()
        const { url } = await request.json();
        if (!url) {
            return new Response('Missing "url" in request body for delete operation.', { status: 400 });
        }
        await del(url, { token });
        return new Response(null, { status: 204 }); // No Content
    }
    else {
      return new Response(`Method ${request.method} Not Allowed`, { status: 405 });
    }
  } catch (error) {
    console.error("Error in blob proxy:", error);
    return new Response(JSON.stringify({ message: `Error processing request: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

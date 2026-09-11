import { getStore } from '@netlify/blobs';

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');

  if (!key) {
    return new Response(JSON.stringify({ error: 'Parâmetro key é obrigatório' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const store = getStore('compras-coap');

  if (req.method === 'GET') {
    const value = await store.get(key);
    return new Response(value === null ? 'null' : value, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const body = await req.text();
    await store.set(key, body);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response('Método não permitido', { status: 405 });
};

export const config = {
  path: '/api/data',
};

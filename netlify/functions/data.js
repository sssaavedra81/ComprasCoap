import { getStore } from '@netlify/blobs';

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  const prefix = url.searchParams.get('prefix');
  const store = getStore('compras-coap');

  if (req.method === 'GET') {
    // Leitura em lote: devolve todas as chaves que começam com o prefixo pedido.
    if (prefix !== null) {
      const { blobs } = await store.list({ prefix });
      const itens = {};
      await Promise.all(
        blobs.map(async (b) => {
          const valor = await store.get(b.key);
          if (valor !== null) itens[b.key] = valor;
        })
      );
      return new Response(JSON.stringify(itens), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (!key) {
      return new Response(JSON.stringify({ error: 'Parâmetro key ou prefix é obrigatório' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    const value = await store.get(key);
    return new Response(value === null ? 'null' : value, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    if (!key) {
      return new Response(JSON.stringify({ error: 'Parâmetro key é obrigatório' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    const body = await req.text();
    await store.set(key, body);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (req.method === 'DELETE') {
    if (!key) {
      return new Response(JSON.stringify({ error: 'Parâmetro key é obrigatório' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    await store.delete(key);
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

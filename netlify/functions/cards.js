const { getStore } = require('@netlify/blobs');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

function makeId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });

  const store = getStore('maumcard-detail-pages');

  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body || '{}');
      const id = makeId();
      const saved = {
        ...data,
        _savedAt: new Date().toISOString(),
        _app: 'MaumCard'
      };
      await store.setJSON(id, saved);
      return json(200, { ok: true, id });
    } catch (err) {
      return json(500, { ok: false, error: String(err && err.message ? err.message : err) });
    }
  }

  if (event.httpMethod === 'GET') {
    try {
      const id = (event.queryStringParameters && event.queryStringParameters.id) || '';
      if (!id) return json(400, { ok: false, error: 'missing id' });
      const data = await store.get(id, { type: 'json' });
      if (!data) return json(404, { ok: false, error: 'not found' });
      return json(200, { ok: true, id, data });
    } catch (err) {
      return json(500, { ok: false, error: String(err && err.message ? err.message : err) });
    }
  }

  return json(405, { ok: false, error: 'method not allowed' });
};

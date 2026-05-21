let getStore = null;
try {
  getStore = require('@netlify/blobs').getStore;
} catch (e) {
  getStore = null;
}

const memoryStore = global.__MAUMCARD_STORE__ || (global.__MAUMCARD_STORE__ = new Map());

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

async function tryBlobSet(id, record) {
  if (!getStore) return false;
  try {
    const store = getStore('maumcard-cards');
    await store.set(id, JSON.stringify(record));
    return true;
  } catch (e) {
    console.log('Blob set skipped:', e && e.message ? e.message : e);
    return false;
  }
}

async function tryBlobGet(id) {
  if (!getStore) return null;
  try {
    const store = getStore('maumcard-cards');
    const raw = await store.get(id);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    console.log('Blob get skipped:', e && e.message ? e.message : e);
    return null;
  }
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });

  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body || '{}');
      const id = makeId();
      const record = { ...data, _savedAt: new Date().toISOString() };

      memoryStore.set(id, record);
      const persisted = await tryBlobSet(id, record);

      return json(200, {
        ok: true,
        id,
        persisted,
        cardUrl: `https://maumcard.netlify.app/card.html?id=${id}`,
        detailUrl: `https://maumcard.netlify.app/view.html?id=${id}`
      });
    } catch (e) {
      return json(500, { ok: false, error: e.message || String(e) });
    }
  }

  if (event.httpMethod === 'GET') {
    try {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) return json(400, { ok: false, error: 'Missing id' });

      let saved = memoryStore.get(id);
      if (!saved) saved = await tryBlobGet(id);
      if (!saved) return json(404, { ok: false, error: 'Card not found' });

      return json(200, { ok: true, data: saved });
    } catch (e) {
      return json(500, { ok: false, error: e.message || String(e) });
    }
  }

  return json(405, { ok: false, error: 'Method not allowed' });
};

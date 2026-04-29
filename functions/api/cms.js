/**
 * Villa Coco CMS API
 * Cloudflare Pages Function
 *
 * GET  /api/cms        → public read of live content
 * GET  /api/cms?action=auth   → verify admin password (fallback for restricted hosts)
 * POST /api/cms?action=auth   → verify admin password
 * POST /api/cms        → save new content (auth required)
 * POST /api/cms?action=revert → revert to previous save (auth required)
 */

const MAX_JSON_CHARS = 300_000;
const MAX_TEXT_CHARS = 8_000;
const MAX_ITEMS = 50;
const MAX_DEPTH = 8;

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const headers = corsHeaders(request, env);
  const action = url.searchParams.get('action');

  if (action === 'health') {
    return json({ ok: true, service: 'villacoco-cms-api' }, 200, headers);
  }

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (!env.ADMIN_PASSWORD) {
    return json({ error: 'Server missing ADMIN_PASSWORD' }, 500, headers);
  }
  if (!env.VILLA_COCO_CMS) {
    return json({ error: 'Server missing VILLA_COCO_CMS binding' }, 500, headers);
  }

  if (!isOriginAllowed(request, env)) {
    return json({ error: 'Origin not allowed' }, 403, headers);
  }

  const isAuthRoute = action === 'auth' || url.pathname.endsWith('/auth');
  const isRevertRoute = action === 'revert' || url.pathname.endsWith('/revert');

  if (method === 'GET' && isAuthRoute) {
    if (!isAuthorized(request, env)) {
      return json({ error: 'Unauthorized' }, 401, headers);
    }
    return json({ success: true }, 200, headers);
  }

  if (method === 'GET') {
    try {
      const raw = await env.VILLA_COCO_CMS.get('cms_current');
      if (!raw) return json({}, 200, headers);
      return json(JSON.parse(raw), 200, headers);
    } catch (e) {
      return json({ error: 'Failed to read content' }, 500, headers);
    }
  }

  if (method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, headers);
  }

  if (!isAuthorized(request, env)) {
    return json({ error: 'Unauthorized' }, 401, headers);
  }

  if (isAuthRoute) {
    return json({ success: true }, 200, headers);
  }

  if (isRevertRoute) {
    try {
      const backup = await env.VILLA_COCO_CMS.get('cms_backup');
      if (!backup) return json({ error: 'No backup available to revert to' }, 404, headers);
      const current = await env.VILLA_COCO_CMS.get('cms_current');
      if (current) await env.VILLA_COCO_CMS.put('cms_backup', current);
      await env.VILLA_COCO_CMS.put('cms_current', backup);
      return json({ success: true, message: 'Reverted to previous version' }, 200, headers);
    } catch (e) {
      return json({ error: 'Revert failed' }, 500, headers);
    }
  }

  try {
    const body = await request.json();
    const validation = validatePayload(body);
    if (!validation.ok) {
      return json({ error: validation.error }, 400, headers);
    }

    const encoded = JSON.stringify(body);
    if (encoded.length > MAX_JSON_CHARS) {
      return json({ error: 'Payload too large' }, 400, headers);
    }

    const current = await env.VILLA_COCO_CMS.get('cms_current');
    if (current) await env.VILLA_COCO_CMS.put('cms_backup', current);
    await env.VILLA_COCO_CMS.put('cms_current', encoded);
    return json({ success: true }, 200, headers);
  } catch (e) {
    return json({ error: 'Save failed' }, 500, headers);
  }
}

function isAuthorized(request, env) {
  return request.headers.get('X-Admin-Password') === env.ADMIN_PASSWORD;
}

function getAllowedOrigins(env) {
  if (!env.ALLOWED_ORIGINS) return [];
  return String(env.ALLOWED_ORIGINS)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function isOriginAllowed(request, env) {
  const allowed = getAllowedOrigins(env);
  if (!allowed.length) return true;
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  return allowed.includes(origin);
}

function corsHeaders(request, env) {
  const allowed = getAllowedOrigins(env);
  const origin = request.headers.get('Origin');
  let allowOrigin = '*';
  if (allowed.length) {
    allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
    'Vary': 'Origin',
  };
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: 'Invalid content payload' };
  }
  const topKeys = Object.keys(payload);
  if (!topKeys.length) return { ok: false, error: 'Content payload cannot be empty' };

  const queue = [{ value: payload, depth: 0 }];
  while (queue.length) {
    const { value, depth } = queue.pop();
    if (depth > MAX_DEPTH) return { ok: false, error: 'Content nesting too deep' };
    if (typeof value === 'string') {
      if (value.length > MAX_TEXT_CHARS) return { ok: false, error: 'Text field too long' };
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length > MAX_ITEMS) return { ok: false, error: 'Too many items in a list' };
      value.forEach(item => queue.push({ value: item, depth: depth + 1 }));
      continue;
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(v => queue.push({ value: v, depth: depth + 1 }));
      continue;
    }
    if (value !== null && typeof value !== 'number' && typeof value !== 'boolean') {
      return { ok: false, error: 'Unsupported value type in content' };
    }
  }
  return { ok: true };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

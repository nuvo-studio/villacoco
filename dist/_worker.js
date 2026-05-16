------formdata-undici-012765888085
Content-Disposition: form-data; name="metadata"

{"main_module":"functionsWorker-0.9796682248672826.js"}
------formdata-undici-012765888085
Content-Disposition: form-data; name="functionsWorker-0.9796682248672826.js"; filename="functionsWorker-0.9796682248672826.js"
Content-Type: application/javascript+module

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/cms.js
var MAX_JSON_CHARS = 3e5;
var MAX_TEXT_CHARS = 8e3;
var MAX_ITEMS = 50;
var MAX_DEPTH = 8;
var MAX_ANALYTICS_FIELD = 120;
var MAX_VISITOR_ID = 64;
var ANALYTICS_KEY = "cms_analytics";
async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const headers = corsHeaders(request, env);
  const action = url.searchParams.get("action");
  if (action === "health") {
    return json({ ok: true, service: "villacoco-cms-api" }, 200, headers);
  }
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (!env.ADMIN_PASSWORD) {
    return json({ error: "Server missing ADMIN_PASSWORD" }, 500, headers);
  }
  if (!env.VILLA_COCO_CMS) {
    return json({ error: "Server missing VILLA_COCO_CMS binding" }, 500, headers);
  }
  if (!isOriginAllowed(request, env)) {
    return json({ error: "Origin not allowed" }, 403, headers);
  }
  const isAuthRoute = action === "auth" || url.pathname.endsWith("/auth");
  const isRevertRoute = action === "revert" || url.pathname.endsWith("/revert");
  if (method === "GET" && action === "stats") {
    if (!isAuthorized(request, env)) {
      return json({ error: "Unauthorized" }, 401, headers);
    }
    try {
      const analytics = await readAnalytics(env);
      return json(formatAnalytics(analytics), 200, headers);
    } catch (e) {
      return json({ error: "Failed to read analytics" }, 500, headers);
    }
  }
  if (method === "GET" && isAuthRoute) {
    if (!isAuthorized(request, env)) {
      return json({ error: "Unauthorized" }, 401, headers);
    }
    return json({ success: true }, 200, headers);
  }
  if (method === "GET") {
    try {
      const raw = await env.VILLA_COCO_CMS.get("cms_current");
      if (!raw) return json({}, 200, headers);
      return json(JSON.parse(raw), 200, headers);
    } catch (e) {
      return json({ error: "Failed to read content" }, 500, headers);
    }
  }
  if (method !== "POST") {
    return json({ error: "Method not allowed" }, 405, headers);
  }
  if (action === "track") {
    try {
      const payload = await request.json();
      const eventType = payload?.type === "click" ? "click" : payload?.type === "pageview" ? "pageview" : "";
      if (!eventType) {
        return json({ error: "Invalid analytics event type" }, 400, headers);
      }
      const analytics = await readAnalytics(env);
      const dayKey = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const path = normalizeAnalyticsField(payload?.path, "/");
      const label = normalizeAnalyticsField(payload?.label, "Unknown");
      const visitorId = normalizeVisitorId(payload?.visitorId);
      const device = normalizeDevice(payload?.device);
      analytics.totals.views += eventType === "pageview" ? 1 : 0;
      analytics.totals.clicks += eventType === "click" ? 1 : 0;
      if (eventType === "pageview") {
        analytics.byPath[path] = (analytics.byPath[path] || 0) + 1;
        analytics.byDevice[device] = (analytics.byDevice[device] || 0) + 1;
      }
      if (eventType === "click") {
        analytics.byClickLabel[label] = (analytics.byClickLabel[label] || 0) + 1;
      }
      if (!analytics.daily[dayKey]) {
        analytics.daily[dayKey] = {
          views: 0,
          clicks: 0,
          uniqueVisitors: 0,
          visitorIds: {},
          devices: { desktop: 0, mobile: 0, tablet: 0, other: 0 }
        };
      } else {
        analytics.daily[dayKey].uniqueVisitors = Number(analytics.daily[dayKey].uniqueVisitors) || 0;
        analytics.daily[dayKey].visitorIds = analytics.daily[dayKey].visitorIds && typeof analytics.daily[dayKey].visitorIds === "object" ? analytics.daily[dayKey].visitorIds : {};
        analytics.daily[dayKey].devices = analytics.daily[dayKey].devices && typeof analytics.daily[dayKey].devices === "object" ? {
          desktop: Number(analytics.daily[dayKey].devices.desktop) || 0,
          mobile: Number(analytics.daily[dayKey].devices.mobile) || 0,
          tablet: Number(analytics.daily[dayKey].devices.tablet) || 0,
          other: Number(analytics.daily[dayKey].devices.other) || 0
        } : { desktop: 0, mobile: 0, tablet: 0, other: 0 };
      }
      analytics.daily[dayKey].views += eventType === "pageview" ? 1 : 0;
      analytics.daily[dayKey].clicks += eventType === "click" ? 1 : 0;
      if (eventType === "pageview") {
        analytics.daily[dayKey].devices[device] = (analytics.daily[dayKey].devices[device] || 0) + 1;
      }
      if (visitorId) {
        if (!analytics.visitors[visitorId]) {
          analytics.totals.uniqueVisitors += 1;
          analytics.visitors[visitorId] = {
            firstSeen: (/* @__PURE__ */ new Date()).toISOString(),
            lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
            device
          };
        } else {
          analytics.visitors[visitorId].lastSeen = (/* @__PURE__ */ new Date()).toISOString();
          analytics.visitors[visitorId].device = device;
        }
        if (!analytics.daily[dayKey].visitorIds[visitorId]) {
          analytics.daily[dayKey].visitorIds[visitorId] = 1;
          analytics.daily[dayKey].uniqueVisitors += 1;
        }
      }
      analytics.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await env.VILLA_COCO_CMS.put(ANALYTICS_KEY, JSON.stringify(analytics));
      return json({ success: true }, 202, headers);
    } catch (e) {
      return json({ error: "Failed to track event" }, 500, headers);
    }
  }
  if (!isAuthorized(request, env)) {
    return json({ error: "Unauthorized" }, 401, headers);
  }
  if (isAuthRoute) {
    return json({ success: true }, 200, headers);
  }
  if (isRevertRoute) {
    try {
      const backup = await env.VILLA_COCO_CMS.get("cms_backup");
      if (!backup) return json({ error: "No backup available to revert to" }, 404, headers);
      const current = await env.VILLA_COCO_CMS.get("cms_current");
      if (current) await env.VILLA_COCO_CMS.put("cms_backup", current);
      await env.VILLA_COCO_CMS.put("cms_current", backup);
      return json({ success: true, message: "Reverted to previous version" }, 200, headers);
    } catch (e) {
      return json({ error: "Revert failed" }, 500, headers);
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
      return json({ error: "Payload too large" }, 400, headers);
    }
    const current = await env.VILLA_COCO_CMS.get("cms_current");
    if (current) await env.VILLA_COCO_CMS.put("cms_backup", current);
    await env.VILLA_COCO_CMS.put("cms_current", encoded);
    return json({ success: true }, 200, headers);
  } catch (e) {
    return json({ error: "Save failed" }, 500, headers);
  }
}
__name(onRequest, "onRequest");
function isAuthorized(request, env) {
  return request.headers.get("X-Admin-Password") === env.ADMIN_PASSWORD;
}
__name(isAuthorized, "isAuthorized");
async function readAnalytics(env) {
  const raw = await env.VILLA_COCO_CMS.get(ANALYTICS_KEY);
  if (!raw) {
    return {
      totals: { views: 0, clicks: 0 },
      byDevice: { desktop: 0, mobile: 0, tablet: 0, other: 0 },
      visitors: {},
      byPath: {},
      byClickLabel: {},
      daily: {},
      updatedAt: null
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      totals: {
        views: Number(parsed?.totals?.views) || 0,
        clicks: Number(parsed?.totals?.clicks) || 0,
        uniqueVisitors: Number(parsed?.totals?.uniqueVisitors) || Object.keys(parsed?.visitors || {}).length || 0
      },
      byDevice: parsed?.byDevice && typeof parsed.byDevice === "object" ? {
        desktop: Number(parsed.byDevice.desktop) || 0,
        mobile: Number(parsed.byDevice.mobile) || 0,
        tablet: Number(parsed.byDevice.tablet) || 0,
        other: Number(parsed.byDevice.other) || 0
      } : { desktop: 0, mobile: 0, tablet: 0, other: 0 },
      visitors: parsed?.visitors && typeof parsed.visitors === "object" ? parsed.visitors : {},
      byPath: parsed?.byPath && typeof parsed.byPath === "object" ? parsed.byPath : {},
      byClickLabel: parsed?.byClickLabel && typeof parsed.byClickLabel === "object" ? parsed.byClickLabel : {},
      daily: parsed?.daily && typeof parsed.daily === "object" ? parsed.daily : {},
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch (e) {
    return {
      totals: { views: 0, clicks: 0 },
      byDevice: { desktop: 0, mobile: 0, tablet: 0, other: 0 },
      visitors: {},
      byPath: {},
      byClickLabel: {},
      daily: {},
      updatedAt: null
    };
  }
}
__name(readAnalytics, "readAnalytics");
function normalizeAnalyticsField(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return fallback;
  return trimmed.slice(0, MAX_ANALYTICS_FIELD);
}
__name(normalizeAnalyticsField, "normalizeAnalyticsField");
function normalizeVisitorId(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, MAX_VISITOR_ID);
}
__name(normalizeVisitorId, "normalizeVisitorId");
function normalizeDevice(value) {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (v === "mobile" || v === "tablet" || v === "desktop") return v;
  return "other";
}
__name(normalizeDevice, "normalizeDevice");
function formatAnalytics(analytics) {
  const topPages = Object.entries(analytics.byPath || {}).map(([path, count]) => ({ path, count: Number(count) || 0 })).sort((a, b) => b.count - a.count).slice(0, 8);
  const topClicks = Object.entries(analytics.byClickLabel || {}).map(([label, count]) => ({ label, count: Number(count) || 0 })).sort((a, b) => b.count - a.count).slice(0, 8);
  const daily = Object.entries(analytics.daily || {}).map(([date, bucket]) => ({
    date,
    views: Number(bucket?.views) || 0,
    clicks: Number(bucket?.clicks) || 0,
    uniqueVisitors: Number(bucket?.uniqueVisitors) || 0
  })).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  const byDevice = {
    desktop: Number(analytics?.byDevice?.desktop) || 0,
    mobile: Number(analytics?.byDevice?.mobile) || 0,
    tablet: Number(analytics?.byDevice?.tablet) || 0,
    other: Number(analytics?.byDevice?.other) || 0
  };
  return {
    totals: {
      views: Number(analytics?.totals?.views) || 0,
      clicks: Number(analytics?.totals?.clicks) || 0,
      uniqueVisitors: Number(analytics?.totals?.uniqueVisitors) || 0
    },
    byDevice,
    topPages,
    topClicks,
    daily,
    updatedAt: analytics?.updatedAt || null
  };
}
__name(formatAnalytics, "formatAnalytics");
function getAllowedOrigins(env) {
  if (!env.ALLOWED_ORIGINS) return [];
  return String(env.ALLOWED_ORIGINS).split(",").map((v) => v.trim()).filter(Boolean);
}
__name(getAllowedOrigins, "getAllowedOrigins");
function isOriginAllowed(request, env) {
  const allowed = getAllowedOrigins(env);
  if (!allowed.length) return true;
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return allowed.includes(origin);
}
__name(isOriginAllowed, "isOriginAllowed");
function corsHeaders(request, env) {
  const allowed = getAllowedOrigins(env);
  const origin = request.headers.get("Origin");
  let allowOrigin = "*";
  if (allowed.length) {
    allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];
  }
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
    "Vary": "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Invalid content payload" };
  }
  const topKeys = Object.keys(payload);
  if (!topKeys.length) return { ok: false, error: "Content payload cannot be empty" };
  const queue = [{ value: payload, depth: 0 }];
  while (queue.length) {
    const { value, depth } = queue.pop();
    if (depth > MAX_DEPTH) return { ok: false, error: "Content nesting too deep" };
    if (typeof value === "string") {
      if (value.length > MAX_TEXT_CHARS) return { ok: false, error: "Text field too long" };
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length > MAX_ITEMS) return { ok: false, error: "Too many items in a list" };
      value.forEach((item) => queue.push({ value: item, depth: depth + 1 }));
      continue;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach((v) => queue.push({ value: v, depth: depth + 1 }));
      continue;
    }
    if (value !== null && typeof value !== "number" && typeof value !== "boolean") {
      return { ok: false, error: "Unsupported value type in content" };
    }
  }
  return { ok: true };
}
__name(validatePayload, "validatePayload");
function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" }
  });
}
__name(json, "json");

// [[path]].js
async function onRequest2(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  if (url.pathname.startsWith("/api/")) {
    return env.ASSETS.fetch(request);
  }
  if (method !== "GET") {
    return env.ASSETS.fetch(request);
  }
  if (url.pathname !== "/" && url.pathname !== "/index.html") {
    return env.ASSETS.fetch(request);
  }
  const indexUrl = new URL("/index.html", request.url);
  const assetResponse = await env.ASSETS.fetch(new Request(indexUrl.toString(), request));
  if (!assetResponse.ok) return assetResponse;
  let html = await assetResponse.text();
  try {
    if (env.VILLA_COCO_CMS) {
      const raw = await env.VILLA_COCO_CMS.get("cms_current");
      if (raw) {
        const cms = JSON.parse(raw);
        html = injectSeo(html, cms?.seo || {}, request.url);
      }
    }
  } catch (e) {
  }
  const headers = new Headers(assetResponse.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  return new Response(html, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers
  });
}
__name(onRequest2, "onRequest");
function injectSeo(html, seo, requestUrl) {
  const title = asString(seo.title);
  const description = asString(seo.description);
  const keywords = asString(seo.keywords);
  const ogImage = asString(seo.ogImage);
  const canonical = new URL(requestUrl);
  canonical.hash = "";
  canonical.search = "";
  const canonicalUrl = canonical.toString();
  if (title) {
    html = html.replace(
      /<title id="meta-title">[^<]*<\/title>/,
      `<title id="meta-title">${escapeHtml(title)}</title>`
    );
    html = html.replace(
      /(<meta property="og:title" id="og-title" content=")[^"]*("\s*\/?>)/,
      `$1${escapeAttr(title)}$2`
    );
    html = html.replace(
      /(<meta name="twitter:title" id="tw-title" content=")[^"]*("\s*\/?>)/,
      `$1${escapeAttr(title)}$2`
    );
  }
  if (description) {
    html = html.replace(
      /(<meta name="description" id="meta-description" content=")[^"]*("\s*\/?>)/,
      `$1${escapeAttr(description)}$2`
    );
    html = html.replace(
      /(<meta property="og:description" id="og-description" content=")[^"]*("\s*\/?>)/,
      `$1${escapeAttr(description)}$2`
    );
    html = html.replace(
      /(<meta name="twitter:description" id="tw-description" content=")[^"]*("\s*\/?>)/,
      `$1${escapeAttr(description)}$2`
    );
  }
  if (keywords) {
    html = html.replace(
      /(<meta name="keywords" id="meta-keywords" content=")[^"]*("\s*\/?>)/,
      `$1${escapeAttr(keywords)}$2`
    );
  }
  if (ogImage) {
    html = html.replace(
      /(<meta property="og:image" id="og-image" content=")[^"]*("\s*\/?>)/,
      `$1${escapeAttr(ogImage)}$2`
    );
    html = html.replace(
      /(<meta name="twitter:image" id="tw-image" content=")[^"]*("\s*\/?>)/,
      `$1${escapeAttr(ogImage)}$2`
    );
  }
  html = html.replace(
    /(<link rel="canonical" href=")[^"]*("\s*\/?>)/,
    `$1${escapeAttr(canonicalUrl)}$2`
  );
  html = html.replace(
    /(<meta property="og:url" content=")[^"]*("\s*\/?>)/,
    `$1${escapeAttr(canonicalUrl)}$2`
  );
  return html;
}
__name(injectSeo, "injectSeo");
function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}
__name(asString, "asString");
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
__name(escapeHtml, "escapeHtml");
function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
__name(escapeAttr, "escapeAttr");

// ../../../../.wrangler/tmp/pages-we7wro/functionsRoutes-0.3818583180480759.mjs
var routes = [
  {
    routePath: "/api/cms/:path*",
    mountPath: "/api/cms",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/cms",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/:path*",
    mountPath: "/",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  }
];

// ../../../../.npm/_npx/d77349f55c2be1c0/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../.npm/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};

------formdata-undici-012765888085--

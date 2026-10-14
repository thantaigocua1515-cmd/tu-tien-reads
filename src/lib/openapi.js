export default async function createOpenApiClient(url = 'https://truyenok.online/api/v1/openapi.json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenAPI fetch failed: ${res.status}`);

  const doc = await res.json();
  const paths = Object.entries(doc.paths || {});
  const baseUrl = doc.servers && doc.servers.length ? String(doc.servers[0].url).replace(/\/$/, '') : '';

  function buildUrl(template, params = {}, query = {}) {
    let result = template;

    Object.entries(params).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), encodeURIComponent(String(value)));
    });

    if (baseUrl && !result.startsWith('http')) {
      result = `${baseUrl}${result.startsWith('/') ? '' : '/'}${result}`;
    }

    const queryString = Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');

    if (queryString) {
      result += (result.includes('?') ? '&' : '?') + queryString;
    }

    return result;
  }

  function flattenObject(value) {
    const arr = [];
    if (Array.isArray(value)) return value.flatMap(flattenObject);
    if (!value || typeof value !== 'object') return arr;

    for (const entry of Object.values(value)) {
      if (Array.isArray(entry)) arr.push(...flattenObject(entry));
      else if (entry && typeof entry === 'object') arr.push(...flattenObject(entry));
      else if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') arr.push(entry);
    }

    return arr;
  }

  function normalizeArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];

    const candidates = [
      payload.data,
      payload.items,
      payload.results,
      payload.records,
      payload.list,
      payload.chapters,
      payload.content,
      payload.data?.items,
      payload.data?.results,
      payload.data?.data,
      payload.data?.list,
      payload.data?.chapters,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }

    const nested = flattenObject(payload).filter((item) => item && typeof item === 'object');
    if (nested.length) return nested;

    return [];
  }

  function normalizeContent(payload) {
    if (typeof payload === 'string') return payload;
    if (!payload || typeof payload !== 'object') return '';

    const candidates = [
      payload.content,
      payload.text,
      payload.body,
      payload.data,
      payload.data?.content,
      payload.data?.text,
      payload.data?.body,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate;
      if (candidate && typeof candidate === 'object') {
        const nested = normalizeContent(candidate);
        if (nested) return nested;
      }
    }

    const direct = flattenObject(payload).filter((item) => typeof item === 'string').join('\n\n');
    return direct.trim() || '';
  }

  function detectOperation(predicate) {
    for (const [path, methods] of paths) {
      for (const [method, op] of Object.entries(methods || {})) {
        if (typeof op !== 'object') continue;
        if (method.toLowerCase() !== 'get') continue;
        if (predicate(path, method, op)) return { path, method, operation: op };
      }
    }
    return null;
  }

  const searchPattern = detectOperation((path, method, op) => {
    const text = `${path} ${op.operationId || ''} ${op.summary || ''} ${op.description || ''}`.toLowerCase();
    return method === 'get' && (text.includes('search') || text.includes('keyword') || text.includes('tim') || text.includes('truyen'));
  });

  const chaptersPattern = detectOperation((path, method, op) => {
    const text = `${path} ${op.operationId || ''} ${op.summary || ''}`.toLowerCase();
    return method === 'get' && /chuong|chapter|truyen|novel/.test(text) && /\{.*\}/.test(path);
  });

  const contentPattern = detectOperation((path, method, op) => {
    const text = `${path} ${op.operationId || ''} ${op.summary || ''}`.toLowerCase();
    return method === 'get' && /chuong|chapter|content|noi-dung|noidung/.test(text) && /\{.*\}/.test(path);
  });

  async function searchStories(term) {
    if (!searchPattern) return [];
    const query = { search: term, keyword: term, title: term };
    const url = buildUrl(searchPattern.path, {}, query);
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return normalizeArray(json);
  }

  async function listChapters(storyId) {
    if (!chaptersPattern) return [];
    const params = {};
    const paramMatches = [...chaptersPattern.path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
    if (paramMatches.length > 0) {
      params[paramMatches[0]] = storyId;
    }
    const url = buildUrl(chaptersPattern.path, params);
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return normalizeArray(json);
  }

  async function getChapterContent(storyId, chapterId) {
    if (!contentPattern) return '';
    const paramMatches = [...contentPattern.path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
    const params = {};
    if (paramMatches.length === 1) {
      params[paramMatches[0]] = chapterId || storyId;
    } else if (paramMatches.length >= 2) {
      params[paramMatches[0]] = storyId;
      params[paramMatches[1]] = chapterId;
    }

    const url = buildUrl(contentPattern.path, params);
    const res = await fetch(url);
    if (!res.ok) return '';
    const json = await res.json();
    return normalizeContent(json);
  }

  return {
    searchStories,
    listChapters,
    getChapterContent,
    meta: { searchPattern, chaptersPattern, contentPattern },
  };
}

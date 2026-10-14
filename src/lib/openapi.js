export default async function createOpenApiClient(url = 'https://truyenok.online/api/v1/openapi.json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenAPI fetch failed: ${res.status}`);

  const doc = await res.json();
  const baseUrl = doc.servers && doc.servers.length ? String(doc.servers[0].url).replace(/\/$/, '') : 'https://truyenok.online/api/v1';

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

  function safeArray(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];

    const candidates = [
      value.data,
      value.items,
      value.results,
      value.records,
      value.list,
      value.chapters,
      value.data?.items,
      value.data?.results,
      value.data?.chapters,
      value.data?.list,
    ];

    for (const item of candidates) {
      if (Array.isArray(item)) return item;
    }

    return [];
  }

  function safeText(value) {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';

    const list = [
      value.content,
      value.text,
      value.body,
      value.data,
      value.data?.content,
      value.data?.text,
      value.data?.body,
    ];

    for (const item of list) {
      if (typeof item === 'string' && item.trim()) return item;
      if (item && typeof item === 'object') {
        const nested = safeText(item);
        if (nested) return nested;
      }
    }

    return '';
  }

  function detectEndpointByPattern(patterns) {
    const paths = Object.entries(doc.paths || {});

    for (const [path, methods] of paths) {
      for (const [method, spec] of Object.entries(methods || {})) {
        if (typeof spec !== 'object') continue;
        if (method.toLowerCase() !== 'get') continue;

        const text = `${path} ${spec.summary || ''} ${spec.description || ''} ${spec.operationId || ''}`.toLowerCase();
        if (patterns.some((p) => p.test(text))) {
          return { path, method: method.toLowerCase(), spec };
        }
      }
    }

    return null;
  }

  const novelsListEndpoint = detectEndpointByPattern([
    /novels?/, /truyen/, /library/, /all/,
  ]);

  const novelsDetailEndpoint = detectEndpointByPattern([
    /novels?\/.+\{.*\}/, /truyen\/.+\{.*\}/, /detail/,
  ]);

  const chapterContentEndpoint = detectEndpointByPattern([
    /chapters?\/.+\{.*\}/, /chuong/, /content/, /translated|original|both/,
  ]);

  async function listNovels() {
    const endpoint = novelsListEndpoint || '/novels';
    const url = buildUrl(typeof endpoint === 'string' ? endpoint : endpoint.path, {}, {});
    const res = await fetch(url);
    if (!res.ok) throw new Error(`List novels failed: ${res.status}`);
    const json = await res.json();
    return safeArray(json);
  }

  async function getNovelById(id) {
    const endpoint = novelsDetailEndpoint || '/novels/{id}';
    const url = buildUrl(typeof endpoint === 'string' ? endpoint : endpoint.path, { id }, {});
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Get novel failed: ${res.status}`);
    return await res.json();
  }

  async function getChaptersByNovelId(id) {
    const detail = await getNovelById(id);
    const chapters = safeArray(detail?.chapters || detail?.data?.chapters || detail?.chaptersList || detail?.data?.chaptersList);
    return chapters;
  }

  async function getChapterContent(id, chapterNum, format = 'translated') {
    const endpoint = chapterContentEndpoint || '/novels/{id}/chapters/{chapterNum}';
    const url = buildUrl(typeof endpoint === 'string' ? endpoint : endpoint.path, { id, chapterNum }, { format });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Get chapter failed: ${res.status}`);
    const json = await res.json();
    return safeText(json);
  }

  return {
    listNovels,
    getNovelById,
    getChaptersByNovelId,
    getChapterContent,
    meta: { novelsListEndpoint, novelsDetailEndpoint, chapterContentEndpoint },
  };
}

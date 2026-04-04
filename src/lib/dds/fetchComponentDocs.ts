const DDS_LLMS_URL = 'https://docs-design-system-storybook.netlify.app/llms.txt';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

let cachedDocs: string | null = null;
let cacheExpiry = 0;

export async function fetchDDSComponentDocs(): Promise<string | null> {
  if (cachedDocs && Date.now() < cacheExpiry) return cachedDocs;
  try {
    const res = await fetch(DDS_LLMS_URL);
    if (!res.ok) return cachedDocs; // return stale on error, never throw
    cachedDocs = await res.text();
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return cachedDocs;
  } catch {
    return cachedDocs; // graceful degradation (null on first failure)
  }
}

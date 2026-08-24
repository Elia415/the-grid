import { AggregatedRating } from '../types';

/**
 * Rotten Tomatoes rating fetcher.
 *
 * Note: Rotten Tomatoes does not expose a public, unauthenticated API for
 * the audience (user) score. The critic (Tomatometer) score is available
 * downstream from OMDB and is therefore handled in `omdb.ts`.
 *
 * This service attempts to retrieve the audience score from the RT page
 * via a reader-proxy (jina.ai) as a best-effort. Because RT actively
 * blocks scrapers / bots, the request almost always fails or returns a
 * consent wall, so audience scores default to "N/D" (not available).
 *
 * The function always resolves – never throws – and returns a single
 * audience rating entry marked `available: false` when the score cannot
 * be determined.
 */

const RT_BASE = 'https://www.rottentomatoes.com';
const RT_READ_PROXY = 'https://r.jina.ai/https://www.rottentomatoes.com';

async function tryFetchRTAudience(rtPath: string): Promise<string | null> {
  // Try both /m/ and /tv/ slugs are resolved by caller; here we attempt the proxy fetch.
  const targets = [
    `${RT_READ_PROXY}${rtPath}`,
    `${RT_READ_PROXY}${rtPath}?page=audience`,
  ];

  for (const url of targets) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(4000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CinePulse/1.0)' },
      });
      if (!res.ok) continue;
      const text = await res.text();
      // Audience score on RT audience page is the prominent percentage.
      const m = text.match(/Audience[\s\S]{0,80}?(\d{1,3})%/i);
      if (m && m[1]) return `${m[1]}%`;
      const m2 = text.match(/User\s+Score[\s\S]{0,80}?(\d{1,3})/i);
      if (m2 && m2[1]) return `${m2[1]}/10`;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Resolve the RT slug for a given imdbId by querying OMDB's `Ratings`
 * isn't enough (OMDB does not expose RT URL). We use the RT search API
 * indirectly via the proxy. This is best-effort.
 */
async function resolveRTSlug(imdbId?: string, title?: string): Promise<string | null> {
  if (imdbId) {
    // RT has an endpoint that redirects /m/imdb:<id> -> slug
    const redirect = await fetch(`${RT_BASE}/m/imdb:${imdbId}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);
    if (redirect && redirect.headers.get('location')) {
      const loc = redirect.headers.get('location') || '';
      if (loc.includes('/m/') && !loc.includes('imdb:')) return loc;
      if (loc.includes('/tv/')) return loc;
    }
  }
  return null;
}

export async function fetchRTAudience(
  imdbId?: string,
  title?: string
): Promise<AggregatedRating> {
  const base: AggregatedRating = {
    source: 'Rotten Tomatoes',
    subcategory: 'audience',
    value: 'N/D',
    scoreNormalized: 0,
    icon: '👥',
    available: false,
  };

  const slug = await resolveRTSlug(imdbId, title);
  if (!slug) return base;

  const value = await tryFetchRTAudience(slug);
  if (!value) return base;

  const num = parseFloat(value.replace('%', ''));
  return {
    ...base,
    value,
    scoreNormalized: isNaN(num) ? 0 : num / 10,
    available: true,
  };
}

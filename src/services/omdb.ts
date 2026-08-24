import { AggregatedRating, MediaItem, MediaType } from '../types';
import { getMediaExternalIds } from './tmdb';

const OMDB_API_KEYS = [
  'b9bd48a6',
  '4a3b711b',
  '4db85bde',
  'trilogy',
  import.meta.env.VITE_OMDB_API_KEY,
].filter(Boolean) as string[];

const BASE_URL = 'https://www.omdbapi.com/';

export interface OMDbResponse {
  Title?: string;
  Year?: string;
  imdbRating?: string;
  Metascore?: string;
  Ratings?: { Source: string; Value: string }[];
  imdbID?: string;
  Response: string;
  Error?: string;
}

// In-memory + persistent cache to save API quota and make lookups instantaneous
const memoryCache = new Map<string, AggregatedRating[]>();

export function getCacheKeys(item: {
  id?: number;
  media_type?: MediaType;
  imdb_id?: string;
  title?: string;
  original_title?: string;
  release_date?: string;
  name?: string;
}): string[] {
  const keys: string[] = [];
  if (item.imdb_id) {
    keys.push(`omdb_id_${item.imdb_id}`);
  }
  if (item.id && item.media_type) {
    keys.push(`omdb_tmdb_${item.media_type}_${item.id}`);
  }
  const year = item.release_date ? item.release_date.substring(0, 4) : '';
  const mainTitle = (item.title || item.name || '').toLowerCase().trim();
  const origTitle = (item.original_title || '').toLowerCase().trim();

  if (origTitle && year) keys.push(`omdb_t_${origTitle}_${year}`);
  if (mainTitle && year) keys.push(`omdb_t_${mainTitle}_${year}`);
  if (origTitle) keys.push(`omdb_t_${origTitle}`);
  if (mainTitle) keys.push(`omdb_t_${mainTitle}`);

  return keys;
}

function loadFromLocalCache(cacheKey: string): AggregatedRating[] | null {
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }
  try {
    const raw = localStorage.getItem(`cp_cache_${cacheKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch {}
  return null;
}

function saveToLocalCache(cacheKeys: string[], ratings: AggregatedRating[]) {
  if (!ratings || ratings.length === 0) return;
  cacheKeys.forEach((key) => {
    memoryCache.set(key, ratings);
    try {
      localStorage.setItem(`cp_cache_${key}`, JSON.stringify(ratings));
    } catch {}
  });
}

export function getCachedMediaRatings(item?: {
  id?: number;
  media_type?: MediaType;
  imdb_id?: string;
  title?: string;
  original_title?: string;
  release_date?: string;
  name?: string;
} | null): AggregatedRating[] | null {
  if (!item) return null;
  const keys = getCacheKeys(item);
  for (const k of keys) {
    const hit = loadFromLocalCache(k);
    if (hit && hit.length > 0) return hit;
  }
  return null;
}

export function getCachedImdbScore(item?: {
  id?: number;
  media_type?: MediaType;
  imdb_id?: string;
  title?: string;
  original_title?: string;
  release_date?: string;
  name?: string;
} | null): string | null {
  const cached = getCachedMediaRatings(item);
  if (!cached) return null;
  const imdb = cached.find((r) => r.source === 'IMDb' && r.available);
  if (imdb && imdb.value) {
    return imdb.value.replace('/10', '').trim();
  }
  return null;
}

async function queryOMDbWithFallback(params: Record<string, string>): Promise<OMDbResponse | null> {
  for (const apiKey of OMDB_API_KEYS) {
    try {
      const qParams = new URLSearchParams({
        apikey: apiKey,
        ...params,
      });

      const res = await fetch(`${BASE_URL}?${qParams.toString()}`);
      if (!res.ok) continue;

      const data: OMDbResponse = await res.json();
      if (data.Response === 'False') {
        if (data.Error && data.Error.toLowerCase().includes('limit')) {
          continue;
        }
        return data;
      }
      return data;
    } catch (e) {
      console.warn(`OMDb key ${apiKey} fetch error, attempting next key...`, e);
    }
  }
  return null;
}

export interface FetchRatingsOptions {
  imdbId?: string;
  title?: string;
  originalTitle?: string;
  year?: string;
  mediaType?: MediaType;
  tmdbId?: number;
}

export async function fetchOMDbRatings(
  imdbIdOrOptions?: string | FetchRatingsOptions,
  legacyTitle?: string,
  legacyYear?: string
): Promise<AggregatedRating[]> {
  let imdbId: string | undefined;
  let title: string | undefined;
  let originalTitle: string | undefined;
  let year: string | undefined;
  let mediaType: MediaType | undefined;
  let tmdbId: number | undefined;

  if (typeof imdbIdOrOptions === 'object' && imdbIdOrOptions !== null) {
    imdbId = imdbIdOrOptions.imdbId;
    title = imdbIdOrOptions.title;
    originalTitle = imdbIdOrOptions.originalTitle;
    year = imdbIdOrOptions.year;
    mediaType = imdbIdOrOptions.mediaType;
    tmdbId = imdbIdOrOptions.tmdbId;
  } else {
    imdbId = imdbIdOrOptions;
    title = legacyTitle;
    year = legacyYear;
  }

  const allKeys = getCacheKeys({
    id: tmdbId,
    media_type: mediaType,
    imdb_id: imdbId,
    title,
    original_title: originalTitle,
    release_date: year,
  });

  for (const k of allKeys) {
    const cached = loadFromLocalCache(k);
    if (cached) {
      return cached;
    }
  }

  try {
    let data: OMDbResponse | null = null;

    // 1. Direct query by IMDb ID if available
    if (imdbId) {
      data = await queryOMDbWithFallback({ i: imdbId });
    }

    // 2. If no IMDb ID, but TMDB ID and mediaType are provided, fetch exact IMDb ID via TMDB external IDs
    if ((!data || data.Response === 'False') && tmdbId && mediaType) {
      try {
        const ext = await getMediaExternalIds(tmdbId, mediaType);
        if (ext && ext.imdb_id) {
          imdbId = ext.imdb_id;
          allKeys.push(`omdb_id_${imdbId}`);
          data = await queryOMDbWithFallback({ i: imdbId });
        }
      } catch {}
    }

    // 3. Query by original title / title if still not resolved
    const cleanYear = year ? year.substring(0, 4) : undefined;
    const candidates = [originalTitle, title].filter(Boolean) as string[];

    // 3a. Try with Year
    if ((!data || data.Response === 'False') && cleanYear) {
      for (const t of candidates) {
        data = await queryOMDbWithFallback({ t, y: cleanYear });
        if (data && data.Response === 'True') break;
      }
    }

    // 3b. Try without Year (in case release dates differ across regions)
    if (!data || data.Response === 'False') {
      for (const t of candidates) {
        data = await queryOMDbWithFallback({ t });
        if (data && data.Response === 'True') break;
      }
    }

    if (!data || data.Response === 'False') {
      return [];
    }

    const ratings: AggregatedRating[] = [];

    // 1. Official IMDb Rating
    if (data.imdbRating && data.imdbRating !== 'N/A') {
      const num = parseFloat(data.imdbRating);
      ratings.push({
        source: 'IMDb',
        value: `${data.imdbRating}/10`,
        scoreNormalized: isNaN(num) ? 0 : num,
        icon: '⭐',
        available: true,
      });
    }

    // 2. Rotten Tomatoes (Critic) & Metacritic
    if (Array.isArray(data.Ratings)) {
      for (const r of data.Ratings) {
        if (r.Source === 'Rotten Tomatoes' || r.Source === 'Rotten Tomatoes®') {
          const valStr = r.Value.replace('%', '').trim();
          const valNum = parseFloat(valStr);
          ratings.push({
            source: 'Rotten Tomatoes',
            subcategory: 'critic',
            value: r.Value,
            scoreNormalized: isNaN(valNum) ? 0 : valNum / 10,
            icon: '🍅',
            available: true,
          });
        } else if (r.Source === 'Metacritic') {
          const valStr = r.Value.split('/')[0].trim();
          const valNum = parseFloat(valStr);
          ratings.push({
            source: 'Metacritic',
            value: r.Value,
            scoreNormalized: isNaN(valNum) ? 0 : valNum / 10,
            icon: '🎯',
            available: true,
          });
        }
      }
    }

    // 3. Fallback Metascore if not in Ratings array
    if (
      !ratings.some((r) => r.source === 'Metacritic' && r.available) &&
      data.Metascore &&
      data.Metascore !== 'N/A'
    ) {
      const num = parseFloat(data.Metascore);
      ratings.push({
        source: 'Metacritic',
        value: `${data.Metascore}/100`,
        scoreNormalized: isNaN(num) ? 0 : num / 10,
        icon: '🎯',
        available: true,
      });
    }

    if (data.imdbID && !imdbId) {
      imdbId = data.imdbID;
      allKeys.push(`omdb_id_${data.imdbID}`);
    }

    // Save in cache
    saveToLocalCache(allKeys, ratings);

    return ratings;
  } catch (error) {
    console.error('Error fetching OMDb ratings:', error);
    return [];
  }
}

export async function fetchMediaRatings(item: MediaItem): Promise<AggregatedRating[]> {
  return fetchOMDbRatings({
    tmdbId: item.id,
    mediaType: item.media_type,
    imdbId: item.imdb_id,
    title: item.title || item.name,
    originalTitle: item.original_title,
    year: item.release_date ? item.release_date.substring(0, 4) : undefined,
  });
}

export async function fetchMediaImdbScore(item: MediaItem): Promise<string | null> {
  const cached = getCachedImdbScore(item);
  if (cached) return cached;

  const ratings = await fetchMediaRatings(item);
  const imdb = ratings.find((r) => r.source === 'IMDb' && r.available);
  if (imdb && imdb.value) {
    return imdb.value.replace('/10', '').trim();
  }
  return null;
}

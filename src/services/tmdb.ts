import { MediaItem, MediaDetail, Genre, CastMember, VideoTrailer, MediaType } from '../types';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'da0504341603e7032ed45cdbaff8d927';
const READ_TOKEN = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN;
const BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w780';
export const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
export const ORIGINAL_IMAGE_URL = 'https://image.tmdb.org/t/p/original';

const headers: HeadersInit = {
  'Content-Type': 'application/json;charset=utf-8',
};

if (READ_TOKEN) {
  headers['Authorization'] = `Bearer ${READ_TOKEN}`;
}

const apiCache = new Map<string, any>();

async function fetchFromTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const queryParams = new URLSearchParams({
    api_key: API_KEY,
    language: 'it-IT',
    ...params,
  });

  const url = `${BASE_URL}${endpoint}?${queryParams.toString()}`;
  if (apiCache.has(url)) {
    return apiCache.get(url) as T;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  apiCache.set(url, data);
  return data;
}

function formatImagePath(path: string | null | undefined, isBackdrop = false): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = isBackdrop ? BACKDROP_BASE_URL : IMAGE_BASE_URL;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

function normalizeMediaItem(item: any, fallbackType: MediaType = 'movie'): MediaItem {
  const isMovie = fallbackType === 'movie' || item.media_type === 'movie' || Boolean(item.title);
  const mediaType: MediaType = isMovie ? 'movie' : 'tv';

  return {
    id: item.id,
    title: item.title || item.name || item.original_title || item.original_name || 'Titolo sconosciuto',
    original_title: item.original_title || item.original_name,
    overview: item.overview || '',
    poster_path: formatImagePath(item.poster_path, false),
    backdrop_path: formatImagePath(item.backdrop_path, true),
    media_type: mediaType,
    release_date: item.release_date || item.first_air_date || '',
    vote_average: typeof item.vote_average === 'number' ? item.vote_average : 0,
    vote_count: item.vote_count || 0,
    genre_ids: item.genre_ids || (item.genres ? item.genres.map((g: any) => g.id) : []),
    popularity: item.popularity || 0,
  };
}

export async function fetchMultiPage(
  endpoint: string,
  params: Record<string, string> = {},
  fallbackType: MediaType = 'movie',
  startPage = 1,
  numPages = 3
): Promise<MediaItem[]> {
  const all: MediaItem[] = [];
  const promises: Promise<any>[] = [];

  for (let p = startPage; p < startPage + numPages; p++) {
    promises.push(
      fetchFromTMDB<{ results: any[] }>(endpoint, {
        ...params,
        page: p.toString(),
      }).catch((e) => {
        console.warn(`Error on page ${p} of ${endpoint}:`, e);
        return { results: [] };
      })
    );
  }

  const resultsList = await Promise.all(promises);
  resultsList.forEach((data) => {
    if (data && Array.isArray(data.results)) {
      data.results.forEach((item: any) => {
        if (item.poster_path || item.backdrop_path) {
          all.push(normalizeMediaItem(item, item.media_type || fallbackType));
        }
      });
    }
  });

  return all;
}

export async function getNowPlayingMovies(numPages = 3, startPage = 1): Promise<MediaItem[]> {
  const items = await fetchMultiPage('/movie/now_playing', { region: 'IT' }, 'movie', startPage, numPages);
  return items.map((item) => ({ ...item, curatorStatus: 'in theatres' as const }));
}

export async function getUpcomingMovies(numPages = 3, startPage = 1): Promise<MediaItem[]> {
  const items = await fetchMultiPage('/movie/upcoming', { region: 'IT' }, 'movie', startPage, numPages);
  return items.map((item) => ({ ...item, curatorStatus: 'coming soon' as const }));
}

export async function getTrending(mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'day', numPages = 3): Promise<MediaItem[]> {
  return fetchMultiPage(`/trending/${mediaType}/${timeWindow}`, {}, mediaType === 'all' ? 'movie' : mediaType, 1, numPages);
}

export async function getPopular(mediaType: MediaType = 'movie', numPages = 3): Promise<MediaItem[]> {
  const endpoint = mediaType === 'movie' ? '/movie/popular' : '/tv/popular';
  return fetchMultiPage(endpoint, {}, mediaType, 1, numPages);
}

export async function getTopRated(mediaType: MediaType = 'movie', numPages = 3): Promise<MediaItem[]> {
  const endpoint = mediaType === 'movie' ? '/movie/top_rated' : '/tv/top_rated';
  return fetchMultiPage(endpoint, {}, mediaType, 1, numPages);
}

export async function discoverMedia(
  mediaType: MediaType,
  genreId?: number | null,
  year?: string | null,
  sortBy: string = 'popularity.desc',
  startPage = 1,
  numPages = 3,
  voteAverageGte?: number
): Promise<MediaItem[]> {
  const params: Record<string, string> = {
    sort_by: sortBy,
  };

  if (sortBy.startsWith('vote_average') || voteAverageGte) {
    // TMDB requires minimum vote threshold when sorting by vote_average or filtering by vote
    params['vote_count.gte'] = mediaType === 'movie' ? '150' : '60';
  }

  if (voteAverageGte) {
    params['vote_average.gte'] = voteAverageGte.toString();
  }

  if (genreId) {
    params.with_genres = genreId.toString();
  }

  if (year) {
    if (mediaType === 'movie') {
      params.primary_release_year = year;
    } else {
      params.first_air_date_year = year;
    }
  }

  const endpoint = `/discover/${mediaType}`;
  return fetchMultiPage(endpoint, params, mediaType, startPage, numPages);
}

export async function searchMedia(query: string, page = 1): Promise<MediaItem[]> {
  const clean = query.trim();
  if (!clean) return [];

  try {
    // 1. Search movies and TV shows by title
    const multiSearchPromise = fetchFromTMDB<{ results: any[] }>('/search/multi', {
      query: clean,
      page: page.toString(),
    }).catch(() => ({ results: [] }));

    // 2. Search directors / persons by name
    const personSearchPromise = fetchFromTMDB<{ results: any[] }>('/search/person', {
      query: clean,
      page: '1',
    }).catch(() => ({ results: [] }));

    const [multiData, personData] = await Promise.all([multiSearchPromise, personSearchPromise]);

    const titleMatches: MediaItem[] = (multiData.results || [])
      .filter((item) => (item.media_type === 'movie' || item.media_type === 'tv') && (item.poster_path || item.backdrop_path))
      .map((item) => normalizeMediaItem(item, item.media_type));

    // 3. For any matching directors, fetch their directed films
    let directorMatches: MediaItem[] = [];
    const topPersons = (personData.results || []).slice(0, 3);

    if (topPersons.length > 0) {
      const directorPromises = topPersons.map(async (person: any) => {
        try {
          const credits = await fetchFromTMDB<any>(`/person/${person.id}/movie_credits`);
          const crew = (credits.crew || [])
            .filter((c: any) => c.job === 'Director')
            .filter((c: any) => c.poster_path || c.backdrop_path)
            .map((c: any) => {
              const item = normalizeMediaItem(c, 'movie');
              item.directorName = person.name;
              return item;
            });
          return crew;
        } catch {
          return [];
        }
      });

      const dirResults = await Promise.all(directorPromises);
      directorMatches = dirResults.flat();
    }

    // 4. Combine and deduplicate
    const uniqueMap = new Map<string, MediaItem>();

    // If query matched a director, prioritize director's filmography
    directorMatches.forEach((item) => {
      uniqueMap.set(`${item.media_type}_${item.id}`, item);
    });

    // Add title matching items
    titleMatches.forEach((item) => {
      if (!uniqueMap.has(`${item.media_type}_${item.id}`)) {
        uniqueMap.set(`${item.media_type}_${item.id}`, item);
      }
    });

    return Array.from(uniqueMap.values());
  } catch (error) {
    console.error('Error searching media:', error);
    return [];
  }
}

export async function getGenres(mediaType: MediaType): Promise<Genre[]> {
  try {
    const data = await fetchFromTMDB<{ genres: Genre[] }>(`/genre/${mediaType}/list`);
    return data.genres || [];
  } catch (error) {
    console.error('Error fetching genres:', error);
    return [];
  }
}

export async function getMediaDetail(id: number, mediaType: MediaType): Promise<MediaDetail | null> {
  try {
    const detailIt = await fetchFromTMDB<any>(`/${mediaType}/${id}`, {
      append_to_response: 'credits,videos,external_ids,watch/providers',
    });

    let englishOverview = detailIt.overview;
    if (!detailIt.overview || detailIt.overview.length < 20) {
      try {
        const detailEn = await fetchFromTMDB<any>(`/${mediaType}/${id}`, { language: 'en-US' });
        englishOverview = detailEn.overview || 'Overview not available.';
      } catch {
        englishOverview = detailIt.overview || 'Trama non disponibile.';
      }
    }

    const cast: CastMember[] = (detailIt.credits?.cast || []).slice(0, 10).map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character || c.roles?.[0]?.character || '',
      profile_path: c.profile_path ? `${IMAGE_BASE_URL}${c.profile_path}` : null,
    }));

    const trailers: VideoTrailer[] = (detailIt.videos?.results || [])
      .filter((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
      .map((v: any) => ({
        id: v.id,
        key: v.key,
        name: v.name,
        site: v.site,
        type: v.type,
      }));

    const normalized = normalizeMediaItem(detailIt, mediaType);

    // Extract Director or Creator
    const directorName =
      detailIt.credits?.crew?.find((c: any) => c.job === 'Director')?.name ||
      detailIt.created_by?.[0]?.name ||
      detailIt.credits?.crew?.find((c: any) => c.department === 'Directing')?.name ||
      '';

    // Watch providers
    const itProviders = detailIt['watch/providers']?.results?.IT?.flatrate || [];
    const usProviders = detailIt['watch/providers']?.results?.US?.flatrate || [];
    const watchProviders: string[] = (itProviders.length > 0 ? itProviders : usProviders).map(
      (p: any) => p.provider_name
    );

    return {
      ...normalized,
      directorName: directorName || normalized.directorName,
      genres: detailIt.genres || [],
      runtime: detailIt.runtime || detailIt.episode_run_time?.[0],
      imdb_id: detailIt.external_ids?.imdb_id || detailIt.imdb_id,
      number_of_seasons: detailIt.number_of_seasons,
      number_of_episodes: detailIt.number_of_episodes,
      status: detailIt.status,
      tagline: detailIt.tagline,
      cast,
      trailers,
      watchProviders,
      italianPlot: detailIt.overview || 'Trama in italiano non ancora disponibile.',
      englishPlot: englishOverview,
      aggregatedRatings: [
        {
          source: 'TMDB',
          value: `${normalized.vote_average.toFixed(1)}/10`,
          scoreNormalized: normalized.vote_average,
          icon: '⭐',
          available: true,
        },
      ],
    };
  } catch (error) {
    console.error(`Error fetching detail for ${mediaType} #${id}:`, error);
    return null;
  }
}

const externalIdsCache = new Map<string, string | null>();

export async function getMediaExternalIds(id: number, mediaType: MediaType = 'movie'): Promise<{ imdb_id?: string | null } | null> {
  const key = `ext_${mediaType}_${id}`;
  if (externalIdsCache.has(key)) {
    const cached = externalIdsCache.get(key);
    return cached ? { imdb_id: cached } : null;
  }

  try {
    const data = await fetchFromTMDB<any>(`/${mediaType}/${id}/external_ids`);
    const imdbId = data?.imdb_id || null;
    externalIdsCache.set(key, imdbId);
    return { imdb_id: imdbId };
  } catch {
    externalIdsCache.set(key, null);
    return null;
  }
}

const watchProvidersCache = new Map<string, string[]>();

export async function getWatchProviders(id: number, type: MediaType): Promise<string[]> {
  const key = `${type}_${id}`;
  if (watchProvidersCache.has(key)) {
    return watchProvidersCache.get(key)!;
  }
  try {
    const data = await fetchFromTMDB<any>(`/${type}/${id}/watch/providers`);
    const itProviders = data?.results?.IT?.flatrate || [];
    const usProviders = data?.results?.US?.flatrate || [];
    const providers: string[] = (itProviders.length > 0 ? itProviders : usProviders).map(
      (p: any) => p.provider_name
    );
    watchProvidersCache.set(key, providers);
    return providers;
  } catch {
    return [];
  }
}

const directorFilmsCache = new Map<string, MediaItem[]>();

export async function getDirectorFilmography(directorName: string, personIdHint?: number): Promise<MediaItem[]> {
  const cacheKey = `${directorName.trim().toLowerCase()}_${personIdHint || ''}`;
  if (directorFilmsCache.has(cacheKey)) {
    return directorFilmsCache.get(cacheKey)!;
  }

  try {
    let personId = personIdHint;

    // Helper to find best person matching directing department
    const resolvePersonId = async (name: string): Promise<number | null> => {
      const searchRes = await fetchFromTMDB<{ results: any[] }>('/search/person', { query: name }).catch(() => ({ results: [] }));
      if (searchRes.results && searchRes.results.length > 0) {
        const directingPerson = searchRes.results.find((p: any) => p.known_for_department === 'Directing') || searchRes.results[0];
        return directingPerson.id;
      }
      return null;
    };

    if (!personId) {
      personId = (await resolvePersonId(directorName)) || undefined;
    }

    let crewWorks: any[] = [];

    if (personId) {
      // 1. Fetch combined credits (both movies and TV series)
      const credits = await fetchFromTMDB<any>(`/person/${personId}/combined_credits`).catch(async () => {
        return fetchFromTMDB<any>(`/person/${personId}/movie_credits`).catch(() => ({ crew: [] }));
      });

      crewWorks = (credits?.crew || []).filter((c: any) => {
        const isDirector = c.job === 'Director' || c.job === 'Co-Director' || c.job === 'Creator';
        const isDirecting = c.department === 'Directing';
        return isDirector || isDirecting;
      });
    }

    // 2. If no films found with personIdHint, search dynamically by director name
    if (crewWorks.length === 0) {
      const resolvedId = await resolvePersonId(directorName);
      if (resolvedId && resolvedId !== personId) {
        personId = resolvedId;
        const altCredits = await fetchFromTMDB<any>(`/person/${personId}/combined_credits`).catch(() => ({ crew: [] }));
        crewWorks = (altCredits?.crew || []).filter((c: any) => {
          const isDirector = c.job === 'Director' || c.job === 'Co-Director' || c.job === 'Creator';
          const isDirecting = c.department === 'Directing';
          return isDirector || isDirecting;
        });
      }
    }

    // 3. If still empty, query discover/movie with crew
    if (crewWorks.length === 0 && personId) {
      const discoverMovies = await fetchFromTMDB<{ results: any[] }>('/discover/movie', {
        with_crew: personId.toString(),
        sort_by: 'popularity.desc',
      }).catch(() => ({ results: [] }));

      if (discoverMovies.results && discoverMovies.results.length > 0) {
        crewWorks = discoverMovies.results.map((m: any) => ({ ...m, media_type: 'movie' }));
      }
    }

    // Deduplicate and normalize
    const uniqueMap = new Map<string, any>();
    crewWorks.forEach((m: any) => {
      if (m && m.id && (m.poster_path || m.backdrop_path)) {
        const key = `${m.media_type || 'movie'}_${m.id}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, m);
        }
      }
    });

    const results = Array.from(uniqueMap.values())
      .map((m: any) => {
        const item = normalizeMediaItem(m, m.media_type || 'movie');
        item.directorName = directorName;
        return item;
      })
      .sort((a, b) => {
        const rawDateA = a.release_date || a.first_air_date;
        const rawDateB = b.release_date || b.first_air_date;
        const dateA = rawDateA ? new Date(rawDateA).getTime() : 0;
        const dateB = rawDateB ? new Date(rawDateB).getTime() : 0;
        return dateB - dateA;
      });

    directorFilmsCache.set(cacheKey, results);
    return results;
  } catch (err) {
    console.error(`Error fetching films for director ${directorName}:`, err);
    return [];
  }
}

const directorProfileCache = new Map<string, any>();

export async function getDirectorProfile(directorName: string, personIdHint?: number): Promise<{ photoUrl: string | null; biography?: string } | null> {
  const cacheKey = `${directorName.trim().toLowerCase()}_${personIdHint || ''}`;
  if (directorProfileCache.has(cacheKey)) {
    return directorProfileCache.get(cacheKey);
  }

  try {
    let personId = personIdHint;
    if (!personId) {
      const searchRes = await fetchFromTMDB<{ results: any[] }>('/search/person', { query: directorName }).catch(() => ({ results: [] }));
      if (searchRes.results && searchRes.results.length > 0) {
        const directingPerson = searchRes.results.find((p: any) => p.known_for_department === 'Directing') || searchRes.results[0];
        personId = directingPerson.id;
      }
    }

    if (!personId) return null;

    const detail = await fetchFromTMDB<any>(`/person/${personId}`).catch(() => null);
    if (!detail) return null;

    const profile = {
      photoUrl: detail.profile_path ? `${IMAGE_BASE_URL}${detail.profile_path}` : null,
      biography: detail.biography || '',
    };
    directorProfileCache.set(cacheKey, profile);
    return profile;
  } catch (err) {
    console.error(`Error fetching profile for director ${directorName}:`, err);
    return null;
  }
}

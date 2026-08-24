export type MediaType = 'movie' | 'tv';

export type TaxonomyTag =
  | '[ALL]'
  | '[INDIE GEM]'
  | '[GLOBAL VOICES]'
  | '[MASTERPIECE]'
  | '[BLOCKBUSTER FLAW]'
  | '[CULT NOIR]'
  | '[AVANT-GARDE]'
  | '[RAW ESSENCE]'
  | '[DIRECTOR\'S CUT]';

export type StatusTag = 'coming soon' | 'in theatres' | 'archived' | 'curator pick';

export type GridCardLayout =
  | 'portrait-tall'      // Tall vertical frame (e.g., 3:4 or 9:16)
  | 'landscape-wide'     // Large horizontal cinematic scene (16:9 / 21:9)
  | 'square-compact'     // Compact square frame (1:1)
  | 'panorama-ultra'     // Ultra-wide 2.39:1 anamorphic frame
  | 'editorial-split';   // Image + negative space quote

export interface Genre {
  id: number;
  name: string;
}

export interface MediaItem {
  id: number;
  title: string;
  original_title?: string;
  name?: string; // For TV
  original_name?: string; // For TV
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: MediaType;
  release_date?: string; // Movie
  first_air_date?: string; // TV
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  genres?: Genre[];
  popularity?: number;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  tagline?: string;
  imdb_id?: string;
  imdb_rating?: number;
  imdb_rating_display?: string;
  watchProviders?: string[];
  // Editorial additions
  curatorTag?: TaxonomyTag;
  curatorStatus?: StatusTag;
  editorialQuote?: string;
  directorName?: string;
  aspectRatioPreference?: GridCardLayout;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface VideoTrailer {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface AggregatedRating {
  source:
    | 'TMDB'
    | 'IMDb'
    | 'Rotten Tomatoes'
    | 'Metacritic';
  subcategory?: 'critic' | 'audience';
  value: string;
  scoreNormalized: number;
  icon?: string;
  available: boolean;
}

export interface MediaDetail extends MediaItem {
  genres: Genre[];
  runtime?: number;
  imdb_id?: string;
  cast: CastMember[];
  trailers: VideoTrailer[];
  aggregatedRatings: AggregatedRating[];
  italianPlot?: string;
  englishPlot?: string;
  watchProviders?: string[];
  imdbRatingScore?: string;
}

export type FixedCriteriaKey = 'regia' | 'fotografia' | 'recitazione' | 'colonnaSonora' | 'sceneggiatura';

export interface MediaCriterion {
  key: string;
  label: string;
  score: number; // 1.0 to 10.0
  isCustom: boolean;
}

export interface ReviewRating {
  criteria: MediaCriterion[]; // fixed (5) + custom
  averageScore: number; // computed arithmetic mean
  finalScore: number; // averageScore, unless overridden
  overrideFinal: boolean;
  overrideScore: number | null;
  finalScoreSource: 'average' | 'manual';
}

export interface UserReview {
  id: string;
  mediaId: number;
  mediaType: MediaType;
  mediaTitle: string;
  posterPath: string | null;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 10 scale or 1 to 5
  comment: string;
  createdAt: string;
  detailedRating?: ReviewRating;
  editorialQuote?: string;
}

export interface WatchlistItem {
  mediaId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseYear: string;
  addedAt: string;
}

export interface FilterOptions {
  mediaType: MediaType | 'all';
  genreId: number | null;
  year: string | null;
  taxonomyTag: TaxonomyTag;
  sortBy: 'popularity.desc' | 'vote_average.desc' | 'release_date.desc';
  searchQuery: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL?: string;
}

export interface DirectorCurated {
  id: string;
  name: string;
  bio: string;
  style: string;
  photoUrl: string;
  notableFilms: string[];
}

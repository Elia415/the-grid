import React, { useState, useEffect } from 'react';
import { Dices, X, Play, RefreshCw } from 'lucide-react';
import { MediaItem, Genre, MediaType } from '../types';
import { discoverMedia, getMediaDetail } from '../services/tmdb';
import { fetchMediaRatings, getCachedImdbScore } from '../services/omdb';
import { enrichMediaWithEditorial } from '../services/curator';

interface DiceRollModalProps {
  isOpen: boolean;
  onClose: () => void;
  genres: Genre[];
  onSelectMedia: (item: MediaItem) => void;
}

const MOVIE_TO_TV_GENRE_MAP: Record<number, number> = {
  28: 10759, // Action -> Action & Adventure
  12: 10759, // Adventure -> Action & Adventure
  14: 10765, // Fantasy -> Sci-Fi & Fantasy
  878: 10765, // Sci-Fi -> Sci-Fi & Fantasy
  10752: 10768, // War -> War & Politics
};

export const DiceRollModal: React.FC<DiceRollModalProps> = ({
  isOpen,
  onClose,
  genres,
  onSelectMedia,
}) => {
  const [selectedType, setSelectedType] = useState<MediaType | 'both'>('both');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number>(7.0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState<MediaItem | null>(null);
  const [selectedResult, setSelectedResult] = useState<MediaItem | null>(null);
  const [pool, setPool] = useState<MediaItem[]>([]);
  const [history, setHistory] = useState<MediaItem[]>([]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedResult(null);
    } else {
      document.body.style.overflow = 'unset';
      setSelectedResult(null);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Retrieve official IMDb score for candidate
  const getMediaImdbScore = async (
    item: MediaItem
  ): Promise<{ score: number; displayValue: string }> => {
    try {
      const cached = getCachedImdbScore(item);
      if (cached) {
        const num = parseFloat(cached);
        return {
          score: isNaN(num) ? 7.0 : num,
          displayValue: cached,
        };
      }

      const omdbRatings = await fetchMediaRatings(item);
      const imdb = omdbRatings.find((r) => r.source === 'IMDb' && r.available);
      if (imdb && typeof imdb.scoreNormalized === 'number' && imdb.scoreNormalized > 0) {
        return {
          score: imdb.scoreNormalized,
          displayValue: imdb.value.replace('/10', '').trim(),
        };
      }
    } catch (e) {
      console.warn('Error fetching IMDb rating for candidate:', e);
    }

    const fallback = Number(item.vote_average) || 7.0;
    return {
      score: fallback,
      displayValue: fallback.toFixed(1),
    };
  };

  const fetchCandidates = async (
    targetType: MediaType,
    genreId: number | null,
    rating: number,
    page: number
  ): Promise<MediaItem[]> => {
    let tvGenre = genreId;
    if (targetType === 'tv' && genreId && MOVIE_TO_TV_GENRE_MAP[genreId]) {
      tvGenre = MOVIE_TO_TV_GENRE_MAP[genreId];
    }

    const baseRatingThreshold = Math.max(5.0, rating - 0.7);

    // 1. Try with target page
    try {
      const res = await discoverMedia(targetType, tvGenre, null, 'popularity.desc', page, 2, baseRatingThreshold);
      if (res && res.length > 0) return res;
    } catch (e) {
      console.warn('Discover page error, falling back:', e);
    }

    // 2. Try page 1
    if (page > 1) {
      try {
        const res = await discoverMedia(targetType, tvGenre, null, 'popularity.desc', 1, 3, baseRatingThreshold);
        if (res && res.length > 0) return res;
      } catch (e) {}
    }

    // 3. If TV returned nothing, fallback to movie
    if (targetType === 'tv') {
      try {
        const res = await discoverMedia('movie', genreId, null, 'popularity.desc', 1, 3, baseRatingThreshold);
        if (res && res.length > 0) return res;
      } catch (e) {}
    }

    // 4. Try sort_by vote_average.desc
    try {
      const res = await discoverMedia(targetType === 'tv' ? 'tv' : 'movie', genreId, null, 'vote_average.desc', 1, 3, baseRatingThreshold);
      if (res && res.length > 0) return res;
    } catch (e) {}

    // 5. Query top rated across all genres
    try {
      const res = await discoverMedia('movie', null, null, 'vote_average.desc', 1, 4, baseRatingThreshold);
      if (res && res.length > 0) return res;
    } catch (e) {}

    return [];
  };

  const handleRollDice = async () => {
    if (isSpinning) return;
    setIsSpinning(true);

    const targetType: MediaType = selectedType === 'both' ? (Math.random() > 0.5 ? 'movie' : 'tv') : selectedType;
    const randomPage = Math.floor(Math.random() * 4) + 1;

    try {
      const rawCandidates = await fetchCandidates(targetType, selectedGenre, minRating, randomPage);
      
      // Shuffle pool
      const shuffled = [...rawCandidates].sort(() => Math.random() - 0.5);
      
      // Find candidate that strictly satisfies IMDb score >= minRating
      let winnerItem: MediaItem | null = null;
      let winnerImdbScore: { score: number; displayValue: string } | null = null;

      // Check first candidate batch
      for (const candidate of shuffled.slice(0, 7)) {
        if (candidate.id === selectedResult?.id && shuffled.length > 1) continue;
        const imdbData = await getMediaImdbScore(candidate);
        if (imdbData.score >= minRating - 0.04) {
          winnerItem = candidate;
          winnerImdbScore = imdbData;
          break;
        }
      }

      // If no candidate in the random batch met the threshold, fallback to top masterpieces
      if (!winnerItem && shuffled.length > 0) {
        // Find best match in shuffled
        const candidateScores = await Promise.all(
          shuffled.slice(0, 4).map(async (c) => ({
            item: c,
            imdb: await getMediaImdbScore(c),
          }))
        );
        const valid = candidateScores.find((cs) => cs.imdb.score >= minRating - 0.04);
        if (valid) {
          winnerItem = valid.item;
          winnerImdbScore = valid.imdb;
        } else if (candidateScores.length > 0) {
          // Sort by highest IMDb score
          candidateScores.sort((a, b) => b.imdb.score - a.imdb.score);
          winnerItem = candidateScores[0].item;
          winnerImdbScore = candidateScores[0].imdb;
        }
      }

      if (winnerItem && winnerImdbScore) {
        const enriched = enrichMediaWithEditorial(winnerItem, 0);
        enriched.imdb_rating = winnerImdbScore.score;
        enriched.imdb_rating_display = winnerImdbScore.displayValue;
        enriched.vote_average = winnerImdbScore.score;

        setTimeout(() => {
          setIsSpinning(false);
          setSelectedResult(enriched);
        }, 400);
      } else {
        setIsSpinning(false);
      }
    } catch (e) {
      console.error('Error rolling dice:', e);
      setIsSpinning(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '92vw',
          maxWidth: '580px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#070709',
          border: '1px solid #ffffff',
          padding: 'clamp(1rem, 2.5vw, 2rem)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.8rem',
          marginBottom: '1.2rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Dices size={16} color="#ffffff" />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#ffffff',
            }}>
              BLIND CURATION ROLL
            </span>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.25rem' }}
            aria-label="Chiudi"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Format selector */}
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.4rem' }}>
              TIPOLOGIA
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { id: 'both', label: 'TUTTI I FORMATI' },
                { id: 'movie', label: 'SOLO FILM' },
                { id: 'tv', label: 'SOLO SERIE TV' },
              ].map((tab) => {
                const isActive = selectedType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedType(tab.id as any)}
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      padding: '0.4rem 0.6rem',
                      border: '1px solid',
                      borderColor: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
                      background: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? '#000000' : 'rgba(255, 255, 255, 0.6)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.4rem' }}>
              GENERE O AMBITO
            </label>
            <select
              value={selectedGenre || ''}
              onChange={(e) => setSelectedGenre(e.target.value ? Number(e.target.value) : null)}
              className="grid-select"
              style={{ width: '100%' }}
            >
              <option value="">QUALSIASI GENERE</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)' }}>
                  VOTO MINIMO CRITICA
                </span>
                <span style={{
                  background: '#f5c518',
                  color: '#000000',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  padding: '0.08rem 0.28rem',
                  borderRadius: '2px',
                  lineHeight: 1,
                }}>
                  IMDb
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: '#ffffff', fontWeight: 800 }}>
                {minRating.toFixed(1)} / 10
              </span>
            </div>
            <input
              type="range"
              min="5.0"
              max="9.0"
              step="0.5"
              value={minRating}
              onChange={(e) => setMinRating(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#ffffff' }}
            />
          </div>

          <button
            onClick={handleRollDice}
            disabled={isSpinning}
            className="btn-grid btn-grid-active"
            style={{
              padding: '0.85rem',
              justifyContent: 'center',
              width: '100%',
              marginTop: '0.5rem',
              opacity: isSpinning ? 0.6 : 1,
            }}
          >
            {isSpinning ? (
              <RefreshCw size={16} className="spin-animation" />
            ) : (
              <Dices size={16} />
            )}
            <span>
              {isSpinning
                ? 'ESTRAZIONE IN CORSO...'
                : selectedResult
                ? "ESTRAI UN'ALTRA OPERA DALL'ARCHIVIO"
                : "ESTRAI OPERA DALL'ARCHIVIO"}
            </span>
          </button>
        </div>

        {/* Selected Result Display */}
        {selectedResult && (
          <div
            style={{
              marginTop: '1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.5rem',
              display: 'flex',
              gap: '1.2rem',
              alignItems: 'center',
              opacity: isSpinning ? 0.4 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            <div style={{
              width: '100px',
              height: '150px',
              background: '#121216',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              <img
                src={selectedResult.poster_path || selectedResult.backdrop_path || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80'}
                alt={selectedResult.title || selectedResult.name || 'Cover'}
                onError={(e) => {
                  if (selectedResult.backdrop_path && e.currentTarget.src !== selectedResult.backdrop_path) {
                    e.currentTarget.src = selectedResult.backdrop_path;
                  } else {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80';
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
              <div>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.62rem',
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  {selectedResult.media_type === 'tv' ? 'SERIE TV' : 'FILM'} • {selectedResult.curatorTag || '[SELEZIONE CASUALE]'}
                </span>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  textTransform: 'lowercase',
                  margin: '0.2rem 0',
                }}>
                  {(selectedResult.title || selectedResult.name || '').toLowerCase()}.
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.35rem' }}>
                  <span style={{
                    background: '#f5c518',
                    color: '#000000',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.66rem',
                    fontWeight: 900,
                    padding: '0.12rem 0.32rem',
                    borderRadius: '2px',
                    lineHeight: 1,
                    letterSpacing: '0.04em',
                  }}>
                    IMDb
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#ffffff',
                  }}>
                    {selectedResult.imdb_rating_display || selectedResult.imdb_rating?.toFixed(1) || Number(selectedResult.vote_average).toFixed(1)} / 10
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectMedia(selectedResult);
                  onClose();
                }}
                className="btn-grid btn-grid-active"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.72rem', alignSelf: 'flex-start', marginTop: '0.8rem' }}
              >
                <Play size={12} fill="black" />
                <span>APRI SCHEDA COMPLETA</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



import React, { useState, useEffect } from 'react';
import { MediaItem, UserReview } from '../types';
import { getAllReviews } from '../services/firebase';
import { getMediaDetail } from '../services/tmdb';
import { Star, MessageSquare, Search, Film, Tv, Calendar, User, ArrowRight } from 'lucide-react';
import { TheGridLogoLoader } from './TheGridLogo';

interface ArchiveViewProps {
  onSelectMedia: (item: MediaItem) => void;
  watchlistMediaIds: Set<string>;
  onWatchlistToggle: () => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  onSelectMedia,
}) => {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'rating-desc' | 'rating-asc'>('recent');

  const loadReviews = async () => {
    try {
      setLoading(true);
      const all = await getAllReviews();
      setReviews(all);
    } catch (err) {
      console.error('Error fetching archive reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();

    const handleVaultUpdated = () => {
      loadReviews();
    };

    window.addEventListener('vault_updated', handleVaultUpdated);
    return () => window.removeEventListener('vault_updated', handleVaultUpdated);
  }, []);

  const handleCardClick = async (review: UserReview) => {
    try {
      const fullDetail = await getMediaDetail(review.mediaId, review.mediaType);
      if (fullDetail) {
        onSelectMedia(fullDetail);
        return;
      }
    } catch {}

    // Fallback MediaItem
    const fallbackItem: MediaItem = {
      id: review.mediaId,
      title: review.mediaTitle,
      overview: review.comment,
      poster_path: review.posterPath,
      backdrop_path: null,
      media_type: review.mediaType,
      vote_average: review.rating,
      vote_count: 1,
      genre_ids: [],
    };
    onSelectMedia(fallbackItem);
  };

  // Filter and Sort
  const filteredReviews = reviews
    .filter((r) => {
      if (filterType !== 'all' && r.mediaType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = r.mediaTitle.toLowerCase().includes(q);
        const matchAuthor = r.userName.toLowerCase().includes(q);
        const matchComment = r.comment.toLowerCase().includes(q);
        return matchTitle || matchAuthor || matchComment;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating-desc') return b.rating - a.rating;
      if (sortBy === 'rating-asc') return a.rating - b.rating;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).toUpperCase();
    } catch {
      return '';
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2.5rem', paddingBottom: '4rem' }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1.2rem',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          color: '#ffffff',
          margin: 0,
          textTransform: 'uppercase',
        }}>
          ARCHIVIO RECENSIONI
        </h1>
      </div>

      {/* Control Bar: Filters, Search & Sort */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        background: '#070709',
        border: '1px solid var(--border-subtle)',
        padding: 'clamp(0.85rem, 2vw, 1.25rem)',
      }}>
        {/* Type selector */}
        <div style={{ display: 'flex', gap: '0.4rem', width: '100%', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'TUTTE' },
            { id: 'movie', label: 'FILM' },
            { id: 'tv', label: 'SERIE TV' },
          ].map((tab) => {
            const isActive = filterType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                style={{
                  flex: '1 1 80px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  fontWeight: isActive ? 800 : 500,
                  letterSpacing: '0.06em',
                  padding: '0.5rem 0.75rem',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#000000' : 'rgba(255,255,255,0.6)',
                  border: '1px solid',
                  borderColor: isActive ? '#ffffff' : 'var(--border-subtle)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Sort */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center', width: '100%' }}>
          {/* Search box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#0c0c0e',
            border: '1px solid var(--border-subtle)',
            padding: '0.45rem 0.75rem',
            flex: '1 1 180px',
            minWidth: '160px',
          }}>
            <Search size={14} color="rgba(255,255,255,0.4)" />
            <input
              type="text"
              placeholder="Cerca titolo o curatore..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: '#0c0c0e',
              border: '1px solid var(--border-subtle)',
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              padding: '0.5rem 0.75rem',
              outline: 'none',
              cursor: 'pointer',
              flex: '1 1 160px',
              minWidth: '150px',
            }}
          >
            <option value="recent">ORDINAMENTO: PIÙ RECENTI</option>
            <option value="rating-desc">ORDINAMENTO: VOTO PIÙ ALTO</option>
            <option value="rating-asc">ORDINAMENTO: VOTO PIÙ BASSO</option>
          </select>

          {/* Counter */}
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.06em',
            marginLeft: 'auto',
          }}>
            [{filteredReviews.length} RECENSIONI]
          </span>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <TheGridLogoLoader size={90} minHeight="45vh" />
      ) : filteredReviews.length === 0 ? (
        <div style={{
          background: '#09090b',
          border: '1px solid var(--border-subtle)',
          padding: '4rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <MessageSquare size={32} color="rgba(255,255,255,0.2)" />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: '#ffffff', fontWeight: 800 }}>
            Nessuna recensione trovata
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', maxWidth: '400px' }}>
            Nessuna recensione corrisponde ai filtri attuali. Apri una scheda film nel catalogo per scrivere una recensione!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {filteredReviews.map((review) => {
            const hasDetailed = review.detailedRating && review.detailedRating.criteria.length > 0;
            const posterUrl = review.posterPath
              ? review.posterPath.startsWith('http')
                ? review.posterPath
                : `https://image.tmdb.org/t/p/w342${review.posterPath}`
              : null;

            return (
              <div
                key={review.id}
                onClick={() => handleCardClick(review)}
                style={{
                  background: '#070709',
                  border: '1px solid var(--border-subtle)',
                  padding: 'clamp(1rem, 2vw, 1.5rem)',
                  display: 'grid',
                  gridTemplateColumns: 'clamp(80px, 20vw, 120px) 1fr',
                  gap: 'clamp(0.9rem, 2vw, 1.8rem)',
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                  position: 'relative',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                  e.currentTarget.style.background = '#0b0b0e';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = '#070709';
                }}
              >
                {/* Poster Thumbnail */}
                <div
                  style={{
                    width: '120px',
                    height: '175px',
                    background: '#121216',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                  title="Apri scheda completa"
                >
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={review.mediaTitle}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255,255,255,0.2)',
                    }}>
                      <Film size={28} />
                    </div>
                  )}

                  {/* Format tag on poster */}
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    background: '#000000',
                    color: '#ffffff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.55rem',
                    fontWeight: 700,
                    padding: '2px 5px',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}>
                    {review.mediaType === 'tv' ? 'SERIE' : 'FILM'}
                  </div>
                </div>

                {/* Review Body */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', minWidth: 0 }}>
                  {/* Top Bar: Title & Rating */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.8rem',
                  }}>
                    <div>
                      <div
                        onClick={() => handleCardClick(review)}
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.35rem',
                          fontWeight: 900,
                          color: '#ffffff',
                          cursor: 'pointer',
                          letterSpacing: '-0.02em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {review.mediaTitle}
                      </div>

                      {/* Author & Date metadata */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginTop: '0.3rem',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.68rem',
                        color: 'rgba(255, 255, 255, 0.45)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <User size={12} color="rgba(255,255,255,0.6)" />
                          <span style={{ color: '#ffffff', fontWeight: 600 }}>{review.userName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={12} />
                          <span>{formatDate(review.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Voto Score Badge */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: '#000000',
                      border: '1px solid #ffffff',
                      padding: '0.4rem 0.8rem',
                    }}>
                      <Star size={14} color="#ffffff" fill="#ffffff" />
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '1.05rem',
                        fontWeight: 900,
                        color: '#ffffff',
                      }}>
                        {review.rating.toFixed(1)}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.5)',
                      }}>
                        / 10
                      </span>
                    </div>
                  </div>

                  {/* Review Text / Commentary */}
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    color: 'rgba(255, 255, 255, 0.82)',
                    lineHeight: 1.6,
                    margin: 0,
                    whiteSpace: 'pre-line',
                  }}>
                    "{review.comment}"
                  </p>

                  {/* Detailed Criteria Scores if present */}
                  {hasDetailed && review.detailedRating && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginTop: '0.3rem',
                      paddingTop: '0.6rem',
                      borderTop: '1px dashed var(--border-subtle)',
                    }}>
                      {review.detailedRating.criteria.map((c) => (
                        <div
                          key={c.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            background: '#0c0c0e',
                            border: '1px solid var(--border-subtle)',
                            padding: '0.25rem 0.55rem',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.62rem',
                          }}
                        >
                          <span style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                            {c.label}:
                          </span>
                          <span style={{ color: '#ffffff', fontWeight: 800 }}>
                            {c.score.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Link to open media detail modal */}
                  <div style={{ alignSelf: 'flex-start', marginTop: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => handleCardClick(review)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ffffff',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        padding: 0,
                        textTransform: 'uppercase',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
                    >
                      <span>VEDI SCHEDA TITOLO</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Play, Bookmark, Check, Lock, User as UserIcon, Trash2 } from 'lucide-react';
import { MediaItem, MediaDetail, AggregatedRating, UserReview, ReviewRating } from '../types';
import { getMediaDetail } from '../services/tmdb';
import { fetchOMDbRatings, getCachedMediaRatings, getCachedImdbScore } from '../services/omdb';
import { fetchRTAudience } from '../services/rt';
import { toggleWatchlist, getReviewsForMedia, saveUserReview, deleteUserReview, getCurrentUser } from '../services/firebase';
import { ReviewRatingInput } from './ReviewRatingInput';

interface MediaDetailModalProps {
  media: MediaItem | null;
  onClose: () => void;
  watchlistMediaIds: Set<string>;
  onWatchlistToggle: () => void;
  onSelectDirector?: (directorName: string) => void;
  onOpenAuth?: () => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  media,
  onClose,
  watchlistMediaIds,
  onWatchlistToggle,
  onSelectDirector,
  onOpenAuth,
}) => {
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<AggregatedRating[]>(() => (media ? getCachedMediaRatings(media) || [] : []));
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);
  const [isDirectorHovered, setIsDirectorHovered] = useState(false);

  // User Review State
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isReviewSaved, setIsReviewSaved] = useState(false);
  const [detailedRating, setDetailedRating] = useState<ReviewRating | null>(null);
  const currentUser = getCurrentUser();

  // Lock background scroll while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    if (!media) return;
    setLoading(true);
    setDetail(null);
    const cachedR = getCachedMediaRatings(media) || [];
    setRatings(cachedR);
    setActiveTrailerKey(null);
    setDetailedRating(null);
    setIsReviewSaved(false);
    setIsLocked(false);
    setUserHasReviewed(false);
    setNewComment('');

    async function loadAllDetails() {
      if (!media) return;
      try {
        const data = await getMediaDetail(media.id, media.media_type);
        setDetail(data);

        if (data) {
          const omdbRatings = await fetchOMDbRatings({
            imdbId: data.imdb_id,
            title: data.title,
            originalTitle: data.original_title,
            year: data.release_date ? data.release_date.substring(0, 4) : undefined,
            mediaType: media.media_type,
            tmdbId: media.id,
          });
          const rtAudience = await fetchRTAudience(data.imdb_id);

          const merged = [...data.aggregatedRatings, ...omdbRatings];
          const withoutAudience = merged.filter(
            (r) => !(r.source === 'Rotten Tomatoes' && r.subcategory === 'audience')
          );
          setRatings([...withoutAudience, rtAudience]);
        }
      } catch (err) {
        console.error('Error loading details:', err);
      }

      const userRevs = await getReviewsForMedia(media.id, media.media_type);
      setReviews(userRevs);

      const currentUser = getCurrentUser();
      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
        const myRev = userRevs.find((r) => r.userId === currentUser.uid);
        if (myRev) {
          setUserHasReviewed(true);
          setIsLocked(true);
          setNewComment(myRev.comment || '');
          if (myRev.detailedRating) {
            setDetailedRating(myRev.detailedRating);
          }
        }
      }

      setLoading(false);
    }

    loadAllDetails();
  }, [media]);

  if (!media) return null;

  const isBookmarked = watchlistMediaIds.has(`${media.media_type}_${media.id}`);
  const rawTitle = (media.title || media.name || 'untitled').toLowerCase();
  const displayTitle = rawTitle.endsWith('.') ? rawTitle : `${rawTitle}.`;

  // Determine official IMDb score
  const cachedImdb = getCachedImdbScore(media);
  const imdbRatingObj = ratings.find((r) => r.source === 'IMDb' && r.available);
  const imdbScoreDisplay = imdbRatingObj
    ? imdbRatingObj.value.replace('/10', '').trim()
    : (cachedImdb || (media.vote_average ? Number(media.vote_average).toFixed(1) : '7.5'));

  // Check if currently in cinema / theatres / coming soon / tv
  const isMovie = media.media_type === 'movie' || Boolean(media.title && !media.first_air_date);
  const releaseTime = media.release_date ? new Date(media.release_date).getTime() : 0;
  const now = Date.now();
  const isFutureMovie = isMovie && releaseTime > now;
  const isInTheatres =
    isMovie &&
    !isFutureMovie &&
    (media.curatorStatus === 'in theatres' ||
      (releaseTime > 0 && (now - releaseTime) <= 45 * 24 * 60 * 60 * 1000));

  // Platform streaming availability text
  const watchProvidersList = detail?.watchProviders && detail.watchProviders.length > 0
    ? detail.watchProviders.slice(0, 4).join(', ')
    : null;

  const handleWatchlistClick = async () => {
    await toggleWatchlist({
      mediaId: media.id,
      mediaType: media.media_type,
      title: media.title,
      posterPath: media.poster_path,
      voteAverage: media.vote_average,
      releaseYear: media.release_date ? media.release_date.substring(0, 4) : '',
    });
    onWatchlistToggle();
  };

  const handleUnlockForEditing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLocked(false);
    setIsReviewSaved(false);
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (!newComment.trim() || !detailedRating) return;

    setIsSubmittingReview(true);
    try {
      const saved = await saveUserReview(
        media.id,
        media.media_type,
        media.title || media.name || '',
        media.poster_path,
        detailedRating.finalScore,
        newComment,
        detailedRating
      );
      setReviews((prev) => {
        const filtered = prev.filter((r) => r.id !== saved.id && r.userId !== saved.userId);
        return [saved, ...filtered];
      });
      setUserHasReviewed(true);
      setIsLocked(true);
      setIsReviewSaved(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error saving review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const [isDeletingReview, setIsDeletingReview] = useState(false);

  const handleDeleteReview = async () => {
    if (!media) return;
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const reviewDocId = `${currentUser.uid}_${media.media_type}_${media.id}`;

    setIsDeletingReview(true);
    try {
      await deleteUserReview(reviewDocId, media.id, media.media_type);
      setReviews((prev) => prev.filter((r) => r.id !== reviewDocId && r.userId !== currentUser.uid));
      setUserHasReviewed(false);
      setIsLocked(false);
      setNewComment('');
      setDetailedRating(null);
      setIsReviewSaved(false);
    } catch (err) {
      console.error('Error deleting review:', err);
    } finally {
      setIsDeletingReview(false);
    }
  };

  const officialPlot =
    detail?.italianPlot && detail.italianPlot !== 'Trama in italiano non ancora disponibile.'
      ? detail.italianPlot
      : detail?.overview || detail?.englishPlot || 'Trama ufficiale non disponibile.';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '96vw',
          maxWidth: '1200px',
          maxHeight: '96vh',
          overflowY: 'auto',
          position: 'relative',
          background: '#070709',
          border: '1px solid #ffffff',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Header Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: '#000000',
          gap: '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            {!isMovie ? (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: '#ffffff',
                letterSpacing: '0.08em',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.12)',
                padding: '0.2rem 0.45rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {watchProvidersList ? `TV SERIES • ${watchProvidersList.toUpperCase()}` : 'TV SERIES'}
              </span>
            ) : isFutureMovie ? (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: '#ffffff',
                letterSpacing: '0.08em',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.12)',
                padding: '0.2rem 0.45rem',
              }}>
                COMING SOON
              </span>
            ) : isInTheatres ? (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: '#ffffff',
                letterSpacing: '0.08em',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.12)',
                padding: '0.2rem 0.45rem',
              }}>
                IN THEATRES
              </span>
            ) : watchProvidersList ? (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: '#ffffff',
                letterSpacing: '0.08em',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.12)',
                padding: '0.2rem 0.45rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                DISPONIBILE SU: {watchProvidersList.toUpperCase()}
              </span>
            ) : (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: '#ffffff',
                letterSpacing: '0.08em',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.12)',
                padding: '0.2rem 0.45rem',
              }}>
                DIGITAL RELEASE
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.35rem',
              flexShrink: 0,
            }}
            aria-label="Chiudi scheda"
          >
            <X size={20} />
          </button>
        </div>

        {/* Hero Backdrop Banner */}
        <div style={{
          position: 'relative',
          width: '100%',
          minHeight: 'clamp(220px, 32vh, 420px)',
          maxHeight: '440px',
          overflow: 'hidden',
          background: '#000000',
        }}>
          <img
            src={detail?.backdrop_path || media.backdrop_path || media.poster_path || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=2560&q=95'}
            alt={media.title}
            onError={(e) => {
              const fallback = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=2560&q=95';
              if (e.currentTarget.src !== fallback) {
                e.currentTarget.src = media.poster_path || fallback;
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.75)',
            }}
          />

          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(0deg, #070709 0%, rgba(7, 7, 9, 0.4) 50%, rgba(0,0,0,0.8) 100%)',
          }} />

          {/* Trailer Button Overlay */}
          {detail?.trailers && detail.trailers.length > 0 && !activeTrailerKey && (
            <button
              onClick={() => setActiveTrailerKey(detail.trailers[0].key)}
              className="btn-grid btn-grid-active"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                padding: 'clamp(0.6rem, 1.5vw, 0.8rem) clamp(1rem, 2vw, 1.6rem)',
                fontSize: '0.75rem',
                zIndex: 5,
                whiteSpace: 'nowrap',
              }}
            >
              <Play size={15} fill="black" />
              <span>GUARDA TRAILER UFFICIALE</span>
            </button>
          )}

          {/* Embedded YouTube Trailer Player */}
          {activeTrailerKey && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 15, background: 'black' }}>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${activeTrailerKey}?autoplay=1`}
                title="Trailer"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button
                onClick={() => setActiveTrailerKey(null)}
                className="btn-grid"
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  left: '0.75rem',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.7rem',
                  background: 'rgba(0,0,0,0.8)',
                }}
              >
                CHIUDI VIDEO
              </button>
            </div>
          )}

          {/* Official IMDb Score Watermark Display */}
          {!isFutureMovie && (
            <div style={{
              position: 'absolute',
              bottom: '1rem',
              right: '1.2rem',
              textAlign: 'right',
              zIndex: 4,
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 6vw, 5.5rem)',
                fontWeight: 900,
                lineHeight: 0.85,
                color: '#ffffff',
                letterSpacing: '-0.04em',
              }}>
                {imdbScoreDisplay}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.35rem',
                marginTop: '0.3rem',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.6)',
                  letterSpacing: '0.08em',
                  textTransform: 'none',
                }}>
                  IMDb RATING
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Body */}
        <div style={{ padding: 'clamp(1.2rem, 3vw, 2.5rem)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Title and Action Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1.2rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.6rem, 3.5vw, 3.2rem)',
                fontWeight: 900,
                color: '#ffffff',
                textTransform: 'lowercase',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                wordBreak: 'break-word',
              }}>
                {displayTitle}
              </h1>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem 1rem',
                marginTop: '0.6rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: 'rgba(255, 255, 255, 0.5)',
                flexWrap: 'wrap',
              }}>
                <span>ANNO: {media.release_date ? media.release_date.substring(0, 4) : 'N/D'}</span>
                <span>•</span>
                <span>DURATA: {detail?.runtime ? `${detail.runtime} MIN` : 'N/D'}</span>
                <span>•</span>
                <span>FORMATO: {media.media_type === 'movie' ? 'FILM' : 'SERIE'}</span>
                <span>•</span>
                <span>
                  REGISTA:{' '}
                  {(detail?.directorName || media.directorName) ? (
                    <span
                      onClick={() => {
                        const dir = detail?.directorName || media.directorName;
                        if (dir && onSelectDirector) {
                          onSelectDirector(dir);
                        }
                      }}
                      onMouseEnter={() => setIsDirectorHovered(true)}
                      onMouseLeave={() => setIsDirectorHovered(false)}
                      style={{
                        color: isDirectorHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                        cursor: 'pointer',
                        textDecoration: isDirectorHovered ? 'underline' : 'none',
                        textUnderlineOffset: '3px',
                        transition: 'color 0.15s ease',
                      }}
                      title={`Vai alla scheda del regista ${(detail?.directorName || media.directorName)}`}
                    >
                      {(detail?.directorName || media.directorName)!.toUpperCase()}
                    </span>
                  ) : (
                    'N/D'
                  )}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleWatchlistClick}
                className="btn-grid"
                style={{
                  background: isBookmarked ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: '#ffffff',
                  borderColor: isBookmarked ? '#ffffff' : 'var(--border-subtle)',
                }}
              >
                <Bookmark size={14} fill={isBookmarked ? '#ffffff' : 'none'} stroke="#ffffff" />
                <span>{isBookmarked ? 'SALVATO' : 'SALVA NEL VAULT'}</span>
              </button>
            </div>
          </div>

          {/* All 5 Official Critical Ratings Strip */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '1.2rem 0',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              VALUTAZIONI UFFICIALI
            </span>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.6rem',
            }}>
              {/* 1. IMDb */}
              <div style={{
                background: '#0c0c0e',
                border: '1px solid var(--border-subtle)',
                padding: '0.8rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: 700,
                }}>
                  IMDb
                </span>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  color: '#ffffff',
                }}>
                  {isFutureMovie
                    ? 'N/D'
                    : (ratings.find((r) => r.source === 'IMDb' && r.available)?.value || (cachedImdb ? `${cachedImdb}/10` : (loading ? '...' : `${imdbScoreDisplay}/10`)))}
                </div>
              </div>

              {/* 2. TMDB */}
              <div style={{
                background: '#0c0c0e',
                border: '1px solid var(--border-subtle)',
                padding: '0.8rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: 700,
                }}>
                  TMDB
                </span>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  color: '#ffffff',
                }}>
                  {isFutureMovie
                    ? 'N/D'
                    : detail?.vote_average
                    ? `${Number(detail.vote_average).toFixed(1)}/10`
                    : `${Number(media.vote_average).toFixed(1)}/10`}
                </div>
              </div>

              {/* 3. Rotten Tomatoes (Critica) */}
              <div style={{
                background: '#0c0c0e',
                border: '1px solid var(--border-subtle)',
                padding: '0.8rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: 700,
                }}>
                  ROTTEN (CRITICA)
                </span>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  color: '#ffffff',
                }}>
                  {isFutureMovie
                    ? 'N/D'
                    : ratings.find((r) => r.source === 'Rotten Tomatoes' && r.subcategory === 'critic' && r.available)?.value || 'N/D'}
                </div>
              </div>

              {/* 4. Rotten Tomatoes (Pubblico) */}
              <div style={{
                background: '#0c0c0e',
                border: '1px solid var(--border-subtle)',
                padding: '0.8rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: 700,
                }}>
                  ROTTEN (PUBBLICO)
                </span>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  color: '#ffffff',
                }}>
                  {isFutureMovie
                    ? 'N/D'
                    : ratings.find((r) => r.source === 'Rotten Tomatoes' && r.subcategory === 'audience' && r.available)?.value || 'N/D'}
                </div>
              </div>

              {/* 5. Metacritic */}
              <div style={{
                background: '#0c0c0e',
                border: '1px solid var(--border-subtle)',
                padding: '0.8rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: 700,
                }}>
                  METACRITIC
                </span>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  color: '#ffffff',
                }}>
                  {isFutureMovie
                    ? 'N/D'
                    : ratings.find((r) => r.source === 'Metacritic' && r.available)?.value || 'N/D'}
                </div>
              </div>
            </div>
          </div>

          {/* Plot Section */}
          <div>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '0.8rem',
            }}>
              TRAMA
            </span>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              color: 'rgba(255, 255, 255, 0.85)',
            }}>
              {officialPlot}
            </p>
          </div>

          {/* Cast */}
          {detail?.cast && detail.cast.length > 0 && (
            <div>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '0.8rem',
              }}>
                CAST PRINCIPALE
              </span>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
                gap: '0.75rem',
              }}>
                {detail.cast.map((actor) => (
                  <div key={actor.id} style={{ background: '#0a0a0c', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: '100%', aspectRatio: '2 / 3', background: '#121214', overflow: 'hidden' }}>
                      {actor.profile_path ? (
                        <img
                          src={actor.profile_path}
                          alt={actor.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(255,255,255,0.2)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.65rem',
                        }}>
                          NO PHOTO
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '0.5rem' }}>
                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#ffffff',
                        lineHeight: 1.2,
                        wordBreak: 'break-word',
                      }}>
                        {actor.name}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.62rem',
                        color: 'rgba(255,255,255,0.4)',
                        marginTop: '0.2rem',
                        wordBreak: 'break-word',
                      }}>
                        {actor.character}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editorial Criteria Rating & User Reviews */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '2rem' }}>
            {(() => {
              const currentUser = getCurrentUser();
              const isLoggedIn = Boolean(currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_'));

              if (!isLoggedIn) {
                return (
                  <div style={{
                    background: '#070709',
                    border: '1px solid var(--border-subtle)',
                    padding: '2.5rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '1rem',
                  }}>
                    <Lock size={26} color="rgba(255,255,255,0.4)" />
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                      ACCEDI PER SCRIVERE UNA RECENSIONE
                    </div>
                    <p style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.85rem',
                      color: 'rgba(255,255,255,0.65)',
                      maxWidth: '480px',
                      lineHeight: 1.5,
                      margin: 0,
                    }}>
                      Le recensioni su <strong>THE GRID</strong> sono riservate agli utenti registrati. Effettua l'accesso per valutare i singoli criteri e pubblicare la tua recensione nell'archivio.
                    </p>
                    {onOpenAuth && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAuth();
                        }}
                        className="btn-grid btn-grid-active"
                        style={{ padding: '0.75rem 1.8rem', fontSize: '0.75rem', letterSpacing: '0.08em', marginTop: '0.4rem' }}
                      >
                        <span>ACCEDI / REGISTRATI ORA</span>
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                    paddingBottom: '0.8rem',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      color: isLocked ? '#ffffff' : 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}>
                      {isLocked ? (
                        <>
                          <Lock size={12} />
                          <span>LA TUA RECENSIONE SALVATA</span>
                        </>
                      ) : (
                        <span>SCHEDA DI VALUTAZIONE CRITICA</span>
                      )}
                    </span>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.8)',
                    }}>
                      <UserIcon size={13} />
                      <span>PUBBLICA COME: <strong>{currentUser?.displayName || currentUser?.email || 'Curatore'}</strong></span>
                    </div>
                  </div>

                  <ReviewRatingInput
                    key={`${media.id}_${userHasReviewed ? 'reviewed' : 'new'}_${isLocked ? 'locked' : 'unlocked'}`}
                    initialValue={detailedRating || undefined}
                    onChange={setDetailedRating}
                    disabled={isLocked}
                  />

                  {/* Submit / Edit Review Form */}
                  <form onSubmit={handleAddReview} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}>
                      TESTO DELLA RECENSIONE
                    </span>

                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      disabled={isLocked}
                      readOnly={isLocked}
                      placeholder={
                        isLocked
                          ? 'La tua recensione salvata...'
                          : 'Scrivi la tua analisi critica dettagliata dell\'opera...'
                      }
                      rows={4}
                      style={{
                        width: '100%',
                        background: isLocked ? 'rgba(255, 255, 255, 0.02)' : '#09090b',
                        border: isLocked ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--border-subtle)',
                        padding: '1rem',
                        color: isLocked ? 'rgba(255, 255, 255, 0.85)' : '#ffffff',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.88rem',
                        outline: 'none',
                        resize: isLocked ? 'none' : 'vertical',
                        cursor: isLocked ? 'default' : 'text',
                      }}
                    />

                    {isReviewSaved ? (
                      <button
                        type="button"
                        disabled
                        className="btn-grid btn-grid-active"
                        style={{
                          alignSelf: 'flex-start',
                          padding: '0.8rem 1.8rem',
                          letterSpacing: '0.06em',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          background: '#ffffff',
                          color: '#000000',
                        }}
                      >
                        <Check size={14} />
                        <span>RECENSIONE SALVATA</span>
                      </button>
                    ) : userHasReviewed && isLocked ? (
                      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleUnlockForEditing}
                          className="btn-grid"
                          style={{
                            padding: '0.8rem 1.6rem',
                            letterSpacing: '0.06em',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.08)',
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                            color: '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          <span>MODIFICA RECENSIONE</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteReview}
                          disabled={isDeletingReview}
                          className="btn-grid"
                          style={{
                            padding: '0.8rem 1.4rem',
                            letterSpacing: '0.06em',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            background: 'rgba(255, 77, 77, 0.1)',
                            borderColor: 'rgba(255, 77, 77, 0.4)',
                            color: '#ff6b6b',
                            cursor: isDeletingReview ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            opacity: isDeletingReview ? 0.6 : 1,
                          }}
                        >
                          <Trash2 size={13} />
                          <span>{isDeletingReview ? 'ELIMINAZIONE...' : 'ELIMINA RECENSIONE'}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSubmittingReview || !newComment.trim() || !detailedRating}
                        className="btn-grid btn-grid-active"
                        style={{
                          alignSelf: 'flex-start',
                          padding: '0.8rem 1.8rem',
                          letterSpacing: '0.06em',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        <span>
                          {isSubmittingReview
                            ? 'SALVATAGGIO...'
                            : 'SALVA RECENSIONE'}
                        </span>
                      </button>
                    )}
                  </form>
                </>
              );
            })()}

            {/* Community Reviews List */}
            {reviews.length > 0 && (
              <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  RECENSIONI DELLA COMMUNITY ({reviews.length})
                </span>

                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    style={{
                      background: '#0b0b0e',
                      border: '1px solid var(--border-subtle)',
                      padding: '1.2rem',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#ffffff',
                        }}>
                          {rev.userName || 'CRITICO ANONIMO'}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.68rem',
                          color: 'rgba(255,255,255,0.3)',
                        }}>
                          {new Date(rev.createdAt).toLocaleDateString('it-IT')}
                        </span>
                        {currentUser && rev.userId === currentUser.uid && (
                          <button
                            type="button"
                            onClick={handleDeleteReview}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'rgba(255, 77, 77, 0.65)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.62rem',
                              padding: '0.1rem 0.35rem',
                              transition: 'color 0.15s ease',
                              marginLeft: '0.3rem',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4d4d')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 77, 77, 0.65)')}
                            title="Elimina la tua recensione"
                          >
                            <Trash2 size={11} />
                            <span>ELIMINA</span>
                          </button>
                        )}
                      </div>

                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.1rem',
                        fontWeight: 900,
                        color: '#ffffff',
                      }}>
                        {Number(rev.rating).toFixed(1)}
                      </div>
                    </div>

                    <p style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.88rem',
                      lineHeight: 1.5,
                      color: 'rgba(255,255,255,0.8)',
                    }}>
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

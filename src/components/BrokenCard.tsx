import React, { useState, useEffect } from 'react';
import { Bookmark, Check, Play } from 'lucide-react';
import { MediaItem, GridCardLayout } from '../types';
import { toggleWatchlist } from '../services/firebase';
import { getCachedImdbScore, fetchMediaImdbScore } from '../services/omdb';

interface BrokenCardProps {
  item: MediaItem;
  variant: GridCardLayout;
  onSelect: (item: MediaItem) => void;
  isBookmarked?: boolean;
  onWatchlistToggle: () => void;
  priority?: boolean;
}

const CINEMA_FALLBACKS = [
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=2560&q=95',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=2560&q=95',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2560&q=95',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=2560&q=95',
];

export const BrokenCard: React.FC<BrokenCardProps> = ({
  item,
  variant,
  onSelect,
  isBookmarked = false,
  onWatchlistToggle,
  priority = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isTall = variant === 'portrait-tall';
  const isUltraWide = variant === 'panorama-ultra';

  // Compute best image source
  const getInitialImage = () => {
    if (isTall && item.poster_path) return item.poster_path;
    return item.backdrop_path || item.poster_path || CINEMA_FALLBACKS[item.id % CINEMA_FALLBACKS.length];
  };

  const [currentImg, setCurrentImg] = useState<string>(getInitialImage);

  // IMDb rating state - check memory + persistent localStorage cache first
  const [imdbScore, setImdbScore] = useState<string | null>(() => getCachedImdbScore(item));

  useEffect(() => {
    setCurrentImg(getInitialImage());
  }, [item, variant]);

  // Fetch true IMDb rating asynchronously via OMDb with TMDB external ID fallback
  useEffect(() => {
    const cached = getCachedImdbScore(item);
    if (cached) {
      setImdbScore(cached);
      return;
    }

    let isMounted = true;
    fetchMediaImdbScore(item)
      .then((score) => {
        if (!isMounted) return;
        if (score) {
          setImdbScore(score);
        } else if (item.vote_average) {
          setImdbScore(Number(item.vote_average).toFixed(1));
        }
      })
      .catch(() => {
        if (isMounted && item.vote_average) {
          setImdbScore(Number(item.vote_average).toFixed(1));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [item.id, item.media_type, item.title, item.name, item.original_title, item.release_date]);

  const handleImageError = () => {
    if (currentImg === item.backdrop_path && item.poster_path) {
      setCurrentImg(item.poster_path);
    } else if (currentImg === item.poster_path && item.backdrop_path) {
      setCurrentImg(item.backdrop_path);
    } else {
      const fallback = CINEMA_FALLBACKS[item.id % CINEMA_FALLBACKS.length] || CINEMA_FALLBACKS[0];
      setCurrentImg(fallback);
    }
  };

  const handleWatchlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleWatchlist({
      mediaId: item.id,
      mediaType: item.media_type,
      title: item.title,
      posterPath: item.poster_path,
      voteAverage: item.vote_average,
      releaseYear: item.release_date ? item.release_date.substring(0, 4) : '',
    });
    onWatchlistToggle();
  };

  const rawTitle = (item.title || item.name || 'untitled').toLowerCase();
  const displayTitle = rawTitle.endsWith('.') ? rawTitle : `${rawTitle}.`;

  // Real tagline if available, otherwise no fake phrases
  const realTagline = item.tagline ? `"${item.tagline}"` : null;

  // Check movie status: coming soon vs in theatres
  const isMovie = item.media_type === 'movie' || Boolean(item.title && !item.first_air_date);
  const isTv = item.media_type === 'tv' || Boolean(item.first_air_date && !item.title);
  const releaseTime = item.release_date ? new Date(item.release_date).getTime() : 0;
  const now = Date.now();
  const isFutureMovie = isMovie && releaseTime > now;
  const isInTheatres =
    isMovie &&
    !isFutureMovie &&
    (item.curatorStatus === 'in theatres' ||
      (releaseTime > 0 && (now - releaseTime) <= 45 * 24 * 60 * 60 * 1000));

  const getAspectStyle = () => {
    switch (variant) {
      case 'portrait-tall':
        return { height: '100%', minHeight: 'clamp(340px, 48vh, 440px)' };
      case 'landscape-wide':
        return { aspectRatio: '16 / 9', minHeight: 'clamp(200px, 28vh, 320px)' };
      case 'panorama-ultra':
        return { aspectRatio: '21 / 9', minHeight: 'clamp(190px, 24vh, 300px)' };
      case 'square-compact':
        return { aspectRatio: '1 / 1', minHeight: 'clamp(180px, 22vh, 240px)' };
      default:
        return { aspectRatio: '16 / 9', minHeight: 'clamp(200px, 26vh, 280px)' };
    }
  };

  return (
    <div
      onClick={() => onSelect(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
        background: '#08080a',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        outline: isHovered ? '1px solid rgba(255, 255, 255, 0.4)' : 'none',
        outlineOffset: '-1px',
        zIndex: isHovered ? 10 : 1,
        ...getAspectStyle(),
      }}
    >
      {/* Background Cinematic Frame */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        zIndex: 1,
        background: '#0d0d12',
      }}>
        <img
          src={currentImg}
          alt={item.title || item.name || 'Movie still'}
          loading="lazy"
          onError={handleImageError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: isTall ? 'center top' : 'center center',
            transform: isHovered ? 'scale(1.04)' : 'scale(1.0)',
            filter: isHovered ? 'brightness(0.95) contrast(1.05)' : 'brightness(0.85) contrast(1.02)',
            transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), filter 0.35s ease',
          }}
        />

        {/* Minimal gradient overlays for maximum contrast */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 85%, rgba(0,0,0,0.98) 100%)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Top Bar inside image frame */}
      <div style={{
        position: 'absolute',
        top: '0.8rem',
        left: '0.9rem',
        right: '0.9rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 5,
        pointerEvents: 'none',
      }}>
        {/* Left Tag: TV shows TV SERIES, Movies show IN THEATRES or COMING SOON */}
        {isTv || !isMovie ? (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#ffffff',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            padding: '0.2rem 0.45rem',
          }}>
            TV SERIES
          </span>
        ) : isFutureMovie ? (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#ffffff',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            padding: '0.2rem 0.45rem',
          }}>
            COMING SOON
          </span>
        ) : isInTheatres ? (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#ffffff',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            padding: '0.2rem 0.45rem',
          }}>
            IN THEATRES
          </span>
        ) : (
          <div />
        )}

        {/* Bookmark Button */}
        <button
          onClick={handleWatchlistClick}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(0, 0, 0, 0.65)',
            color: '#ffffff',
            border: 'none',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: isHovered || isBookmarked ? 1 : 0.6,
            transition: 'opacity 0.2s ease',
          }}
          title={isBookmarked ? 'Rimuovi dal Vault' : 'Salva nel Vault'}
          aria-label={isBookmarked ? 'Rimuovi dal Vault' : 'Salva nel Vault'}
        >
          <Bookmark size={14} fill={isBookmarked ? '#ffffff' : 'none'} stroke="#ffffff" />
        </button>
      </div>

      {/* Big Score Watermark ONLY (Hidden for coming soon unreleased movies) */}
      {!isFutureMovie && (
        <div style={{
          position: 'absolute',
          top: '2.8rem',
          right: '0.9rem',
          zIndex: 4,
          textAlign: 'right',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: isUltraWide ? 'clamp(2rem, 4.5vw, 3.2rem)' : isTall ? 'clamp(1.8rem, 4vw, 2.8rem)' : 'clamp(1.5rem, 3.5vw, 2.1rem)',
            fontWeight: 900,
            lineHeight: 0.85,
            color: 'rgba(255, 255, 255, 0.95)',
            letterSpacing: '-0.04em',
            textShadow: '0 4px 18px rgba(0,0,0,0.85)',
          }}>
            {imdbScore}
          </div>
        </div>
      )}

      {/* Bottom Content Area */}
      <div style={{
        position: 'relative',
        zIndex: 6,
        padding: 'clamp(0.8rem, 2vw, 1.2rem)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}>
        {/* Film Name: Bold Lowercase with period */}
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: isUltraWide ? 'clamp(1.2rem, 3vw, 1.85rem)' : isTall ? 'clamp(1.15rem, 2.5vw, 1.6rem)' : 'clamp(1rem, 2vw, 1.3rem)',
          fontWeight: 900,
          color: '#ffffff',
          textTransform: 'lowercase',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          wordBreak: 'break-word',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
        }}>
          {displayTitle}
        </h3>

        {/* Real tagline only if present, else zero fake text */}
        {realTagline && (
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.76rem',
            color: 'rgba(255, 255, 255, 0.75)',
            lineHeight: 1.35,
            marginTop: '0.2rem',
            maxHeight: isHovered || isUltraWide ? '38px' : '0px',
            opacity: isHovered || isUltraWide ? 1 : 0,
            overflow: 'hidden',
            transition: 'all 0.3s ease',
          }}>
            {realTagline}
          </p>
        )}

        {/* Action indicator on hover */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: '#ffffff',
          fontSize: '0.68rem',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginTop: '0.2rem',
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateY(0)' : 'translateY(4px)',
          transition: 'all 0.2s ease',
        }}>
          <Play size={9} fill="white" />
          <span>VEDI SCHEDA COMPLETA</span>
        </div>
      </div>
    </div>
  );
};

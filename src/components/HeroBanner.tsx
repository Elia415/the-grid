import React, { useState, useEffect } from 'react';
import { Play, Star, Bookmark, Check } from 'lucide-react';
import { MediaItem } from '../types';
import { toggleWatchlist } from '../services/firebase';

interface HeroBannerProps {
  items: MediaItem[];
  onSelectMedia: (item: MediaItem) => void;
  watchlistMediaIds: Set<string>;
  onWatchlistToggle: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  items,
  onSelectMedia,
  watchlistMediaIds,
  onWatchlistToggle,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const SLIDE_DURATION = 8000; // 8 seconds per slide

  useEffect(() => {
    if (!items || items.length === 0) return;
    setProgress(0);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100);
      setProgress(pct);

      if (elapsed >= SLIDE_DURATION) {
        setCurrentIndex((prev) => (prev + 1) % Math.min(items.length, 5));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentIndex, items]);

  if (!items || items.length === 0) return null;
  const currentItem = items[currentIndex];
  const isBookmarked = watchlistMediaIds.has(`${currentItem.media_type}_${currentItem.id}`);

  // Dynamic editorial quotes generator
  const editorialQuotes: Record<number, string> = {
    0: "«Una visione monumentale ad alta tensione visiva e narrativa.»",
    1: "«L'evento cinematografico dell'anno secondo la critica internazionale.»",
    2: "«Regia magistrale e performance straordinaria dal primo all'ultimo minuto.»",
    3: "«Un viaggio immersivo che ridefinisce i canoni del genere.»",
    4: "«Puro spettacolo visivo, acclamato nei principali festival.»",
  };

  const currentQuote = editorialQuotes[currentIndex % 5];

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleWatchlist({
      mediaId: currentItem.id,
      mediaType: currentItem.media_type,
      title: currentItem.title,
      posterPath: currentItem.poster_path,
      voteAverage: currentItem.vote_average,
      releaseYear: currentItem.release_date ? currentItem.release_date.substring(0, 4) : '',
    });
    onWatchlistToggle();
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '72vh',
      minHeight: '540px',
      marginBottom: '2.5rem',
      background: '#121216',
    }}>
      {/* Background Backdrop Canvas */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${currentItem.backdrop_path || currentItem.poster_path})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 25%',
        transition: 'background-image 0.8s ease-in-out',
      }}>
        {/* Soft Ambient Fade Overlays */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, #121216 0%, rgba(18, 18, 22, 0.85) 50%, transparent 100%), linear-gradient(0deg, #121216 0%, transparent 50%)',
        }} />
      </div>

      {/* Hero Editorial Content */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        height: '100%',
        width: '100%',
        padding: '3.5rem 4rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        boxSizing: 'border-box',
      }}>
        <div style={{ maxWidth: '760px' }}>
          {/* Simplified Editorial Meta Line with discrete dots (•) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.9rem',
            fontSize: '0.88rem',
            color: '#cbd5e1',
            fontWeight: 500,
          }}>
            <span style={{ color: 'white', fontWeight: 700 }}>In Evidenza</span>
            <span>•</span>
            <span>{currentItem.media_type === 'movie' ? 'Film' : 'Serie TV'}</span>
            {currentItem.release_date && (
              <>
                <span>•</span>
                <span>{currentItem.release_date.substring(0, 4)}</span>
              </>
            )}
            {currentItem.vote_average > 0 && (
              <>
                <span>•</span>
                <span style={{ color: 'var(--accent-amber)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Star size={13} fill="var(--accent-amber)" color="var(--accent-amber)" />
                  {currentItem.vote_average.toFixed(1)}/10
                </span>
              </>
            )}
          </div>

          {/* Cinematic Editorial Display Serif Title */}
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(3.2rem, 6.5vw, 5.2rem)',
              fontWeight: 400,
              fontStyle: 'normal',
              color: 'white',
              lineHeight: 1.02,
              marginBottom: '1rem',
              textShadow: '0 4px 25px rgba(0,0,0,0.8)',
            }}
          >
            {currentItem.title}
          </h1>

          {/* Editorial Quote / Tagline Space */}
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.25rem',
            fontStyle: 'italic',
            color: 'var(--accent-cyan)',
            marginBottom: '0.9rem',
            letterSpacing: '0.01em',
          }}>
            {currentQuote}
          </p>

          {/* Overview */}
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.94rem',
            lineHeight: 1.6,
            marginBottom: '2.2rem',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {currentItem.overview || 'Trama in sincronizzazione con le fonti TMDB & OMDb.'}
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
            <button
              onClick={() => onSelectMedia(currentItem)}
              className="btn-editorial btn-editorial-primary"
              style={{ padding: '0.8rem 1.8rem', fontSize: '0.92rem' }}
            >
              <Play size={18} fill="white" />
              <span>Guarda Scheda e Trailer</span>
            </button>

            <button
              onClick={handleToggle}
              className="btn-editorial"
              style={{
                padding: '0.8rem 1.5rem',
                fontSize: '0.92rem',
                borderColor: isBookmarked ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.15)',
                color: isBookmarked ? 'var(--accent-cyan)' : 'white',
              }}
            >
              {isBookmarked ? <Check size={18} /> : <Bookmark size={18} />}
              <span>{isBookmarked ? 'In Watchlist' : 'Aggiungi a Lista'}</span>
            </button>
          </div>
        </div>

        {/* Timed Progress Bar & Next Content Thumbnails */}
        <div style={{
          position: 'absolute',
          bottom: '1.8rem',
          right: '4rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '0.6rem',
        }}>
          {/* Timed Slider Progress Bar */}
          <div style={{
            width: '280px',
            height: '3px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'var(--accent-crimson)',
              transition: 'width 0.05s linear',
            }} />
          </div>

          {/* Clickable Next Content Thumbnails */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {items.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                style={{
                  width: idx === currentIndex ? '56px' : '44px',
                  height: '36px',
                  borderRadius: 'var(--radius-xs)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: idx === currentIndex ? '2px solid white' : '1px solid rgba(255, 255, 255, 0.2)',
                  opacity: idx === currentIndex ? 1 : 0.6,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                }}
              >
                <img
                  src={item.backdrop_path || item.poster_path || ''}
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

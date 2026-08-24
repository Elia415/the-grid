import React, { useState } from 'react';
import { Star, Bookmark, Check, Play } from 'lucide-react';
import { MediaItem } from '../types';
import { toggleWatchlist } from '../services/firebase';

interface MediaCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  isBookmarked: boolean;
  onWatchlistToggle: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onSelect,
  isBookmarked,
  onWatchlistToggle,
}) => {
  const [isHovered, setIsHovered] = useState(false);

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

  const posterUrl = item.poster_path || 'https://via.placeholder.com/300x450?text=No+Poster';
  const year = item.release_date ? item.release_date.substring(0, 4) : '';

  return (
    <div
      onClick={() => onSelect(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        userSelect: 'none',
      }}
    >
      {/* Clean Poster Canvas (No Overlay Icons or Red Tags in Default State) */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '148%',
        overflow: 'hidden',
        borderRadius: 'var(--radius-sm)',
        background: '#181820',
      }}>
        <img
          src={posterUrl}
          alt={item.title}
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: isHovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        {/* Hover Reveal Overlay (Appears ONLY on mouse hover) */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(0deg, rgba(14, 15, 20, 0.95) 0%, rgba(14, 15, 20, 0.6) 60%, transparent 100%)',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '0.8rem',
          boxSizing: 'border-box',
          zIndex: 5,
        }}>
          {/* Top Bar on Hover: Media Type Tag & Bookmark Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              background: item.media_type === 'movie' ? 'var(--accent-crimson)' : 'rgba(6, 182, 212, 0.9)',
              color: 'white',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.2rem 0.5rem',
              borderRadius: 'var(--radius-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {item.media_type === 'movie' ? 'Film' : 'Serie TV'}
            </span>

            <button
              onClick={handleWatchlistClick}
              style={{
                background: isBookmarked ? 'var(--accent-cyan)' : 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                border: isBookmarked ? 'none' : '1px solid rgba(255, 255, 255, 0.25)',
                color: isBookmarked ? '#121216' : 'white',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              {isBookmarked ? <Check size={15} /> : <Bookmark size={15} />}
            </button>
          </div>

          {/* Bottom Info on Hover: Play Hint & Ratings */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'white',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '0.4rem',
            }}>
              <Play size={14} fill="white" />
              <span>Esplora Scheda</span>
            </div>

            {item.vote_average > 0 && (
              <div className="badge-clean badge-tmdb">
                <Star size={11} fill="var(--accent-amber)" color="var(--accent-amber)" />
                <span>{item.vote_average.toFixed(1)}/10</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clean Poster Label */}
      <div>
        <h3 style={{
          fontSize: '0.92rem',
          fontWeight: 700,
          color: isHovered ? 'var(--accent-cyan)' : 'white',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '0.15rem',
          fontFamily: 'var(--font-heading)',
          transition: 'color 0.2s ease',
        }}>
          {item.title}
        </h3>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{year || 'Data N/D'}</span>
          {item.vote_count > 0 && <span style={{ opacity: 0.8 }}>{item.vote_count} voti</span>}
        </div>
      </div>
    </div>
  );
};

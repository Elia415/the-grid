import React from 'react';
import { MediaCard } from './MediaCard';
import { MediaItem } from '../types';
import { Film } from 'lucide-react';

interface MediaGridProps {
  items: MediaItem[];
  title?: string;
  onSelectMedia: (item: MediaItem) => void;
  watchlistMediaIds: Set<string>;
  onWatchlistToggle: () => void;
  isLoading?: boolean;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  title,
  onSelectMedia,
  watchlistMediaIds,
  onWatchlistToggle,
  isLoading,
}) => {
  return (
    <div style={{ marginBottom: '4rem', width: '100%' }}>
      {title && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.4rem',
          paddingBottom: '0.6rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
            {title}
          </h2>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {items.length} Titoli trovati
          </span>
        </div>
      )}

      {isLoading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1.4rem',
          width: '100%',
        }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '310px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.03)',
              }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '5rem 2rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-subtle)',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <Film size={44} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '0.3rem' }}>Nessun contenuto trovato</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Prova a selezionare un altro genere o a modificare i filtri.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1.4rem 1.2rem',
          width: '100%',
        }}>
          {items.map((item) => (
            <MediaCard
              key={`${item.media_type}_${item.id}`}
              item={item}
              onSelect={onSelectMedia}
              isBookmarked={watchlistMediaIds.has(`${item.media_type}_${item.id}`)}
              onWatchlistToggle={onWatchlistToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

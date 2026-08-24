import React, { useEffect } from 'react';
import { X, Bookmark, Trash2, Film, Play } from 'lucide-react';
import { WatchlistItem, MediaItem } from '../types';
import { toggleWatchlist } from '../services/firebase';
import { getMediaDetail } from '../services/tmdb';

interface WatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WatchlistItem[];
  onSelectMedia: (item: MediaItem) => void;
  onWatchlistToggle: () => void;
}

export const WatchlistModal: React.FC<WatchlistModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelectMedia,
  onWatchlistToggle,
}) => {
  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenItem = async (w: WatchlistItem) => {
    try {
      const detail = await getMediaDetail(w.mediaId, w.mediaType);
      if (detail) {
        onSelectMedia(detail);
        onClose();
        return;
      }
    } catch {}
    onSelectMedia({
      id: w.mediaId,
      media_type: w.mediaType,
      title: w.title,
      poster_path: w.posterPath,
      backdrop_path: null,
      release_date: w.releaseYear ? `${w.releaseYear}-01-01` : '',
      vote_average: w.voteAverage || 0,
      vote_count: 0,
      overview: '',
      genre_ids: [],
    });
    onClose();
  };

  const handleRemove = async (e: React.MouseEvent, w: WatchlistItem) => {
    e.stopPropagation();
    await toggleWatchlist({
      mediaId: w.mediaId,
      mediaType: w.mediaType,
      title: w.title,
      posterPath: w.posterPath,
      voteAverage: w.voteAverage,
      releaseYear: w.releaseYear,
    });
    onWatchlistToggle();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95vw',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#070709',
          border: '1px solid #ffffff',
          padding: 'clamp(1rem, 2.5vw, 2rem)',
          position: 'relative',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.8rem',
          marginBottom: '1.2rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bookmark size={16} color="#ffffff" />
            <h2 style={{
              fontSize: '1rem',
              fontWeight: 800,
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: 0,
            }}>
              CURATOR VAULT [{items.length}]
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
            aria-label="Chiudi Vault"
          >
            <X size={18} />
          </button>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.4)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
              [IL VAULT È ATTUALMENTE VUOTO. SALVA FILM DALLA GRIGLIA CLICCANDO SUL SEGNALIBRO]
            </span>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '0.75rem',
          }}>
            {items.map((item) => (
              <div
                key={`${item.mediaType}_${item.mediaId}`}
                onClick={() => handleOpenItem(item)}
                style={{
                  background: '#0a0a0c',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ position: 'relative', paddingTop: '135%', background: '#000000', overflow: 'hidden' }}>
                  <img
                    src={item.posterPath || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80'}
                    alt={item.title}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  <button
                    onClick={(e) => handleRemove(e, item)}
                    style={{
                      position: 'absolute',
                      top: '0.4rem',
                      right: '0.4rem',
                      background: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#ffffff',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Rimuovi dal Vault"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div style={{ padding: '0.8rem' }}>
                  <h4 style={{
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    fontFamily: 'var(--font-display)',
                    textTransform: 'lowercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {item.title.toLowerCase()}.
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>
                    <span>{item.releaseYear || 'N/D'}</span>
                    {item.voteAverage > 0 && <span style={{ color: '#ffffff', fontWeight: 700 }}>{item.voteAverage.toFixed(1)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Play, Bookmark, Check } from 'lucide-react';
import { searchMedia } from '../services/tmdb';
import { fetchMediaImdbScore } from '../services/omdb';
import { MediaItem } from '../types';
import { enrichMediaWithEditorial, SIGNATURE_CINEMA_ITEMS } from '../services/curator';
import { BrokenGridCluster } from './BrokenGridCluster';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (item: MediaItem) => void;
  watchlistMediaIds: Set<string>;
  onWatchlistToggle: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
  watchlistMediaIds,
  onWatchlistToggle,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
      setResults([]);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const tmdbResults = await searchMedia(query);
        const enriched = tmdbResults.map((item, idx) => enrichMediaWithEditorial(item, idx));
        setResults(enriched);

        // Pre-warm IMDb scores in parallel for instantaneous card display
        enriched.slice(0, 12).forEach((item) => {
          fetchMediaImdbScore(item).catch(() => {});
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(5, 5, 5, 0.96)',
      backdropFilter: 'blur(25px)',
      WebkitBackdropFilter: 'blur(25px)',
      display: 'flex',
      flexDirection: 'column',
      padding: 'clamp(1rem, 3vw, 2rem)',
      boxSizing: 'border-box',
      overflowY: 'auto',
    }}>
      {/* Top Bar with Close Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1600px',
        width: '100%',
        margin: '0 auto clamp(1rem, 2vw, 2rem) auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '6px', height: '6px', background: '#ffffff' }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            letterSpacing: '0.1em',
            color: 'rgba(255, 255, 255, 0.4)',
            textTransform: 'uppercase',
          }}>
            THE GRID SEARCH INDEX
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            padding: '0.45rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Chiudi ricerca"
        >
          <X size={18} />
        </button>
      </div>

      {/* Big Search Input */}
      <div style={{ maxWidth: '1600px', width: '100%', margin: '0 auto clamp(1.2rem, 3vw, 2.5rem) auto' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '2px solid #ffffff',
          paddingBottom: '0.6rem',
        }}>
          <Search size={24} color="#ffffff" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="cerca titolo film/serie o regista..."
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.3rem, 3.5vw, 2.6rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              textTransform: 'lowercase',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Results Container */}
      <div style={{ maxWidth: '1600px', width: '100%', margin: '0 auto', flex: 1 }}>
        {isSearching && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.5)',
            textAlign: 'center',
            padding: '4rem 0',
          }}>
            [RICERCA PER TITOLO E REGISTA IN CORSO...]
          </div>
        )}

        {!isSearching && query.trim() && results.length === 0 && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.4)',
            textAlign: 'center',
            padding: '4rem 0',
          }}>
            [NESSUN TITOLO O REGISTA TROVATO PER: "{query.toLowerCase()}"]
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '0.6rem',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: 'rgba(255, 255, 255, 0.45)',
                letterSpacing: '0.08em',
              }}>
                [RISULTATI TROVATI: <strong style={{ color: '#ffffff' }}>{results.length}</strong>]
              </span>
            </div>

            <div style={{ width: '100%', margin: 0, padding: 0 }}>
              <BrokenGridCluster
                items={results}
                onSelectMedia={(selected) => {
                  onSelectMedia(selected);
                  onClose();
                }}
                watchlistMediaIds={watchlistMediaIds}
                onWatchlistToggle={onWatchlistToggle}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

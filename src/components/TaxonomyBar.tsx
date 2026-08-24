import React from 'react';
import { TaxonomyTag, StatusTag, Genre, MediaType } from '../types';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

interface TaxonomyBarProps {
  selectedTag: TaxonomyTag;
  onSelectTag: (tag: TaxonomyTag) => void;
  selectedStatus: StatusTag | 'all';
  onSelectStatus: (status: StatusTag | 'all') => void;
  selectedMediaType: MediaType | 'all';
  onSelectMediaType: (type: MediaType | 'all') => void;
  genres: Genre[];
  selectedGenreId: number | null;
  onSelectGenreId: (id: number | null) => void;
  sortBy: 'popularity.desc' | 'vote_average.desc';
  onSelectSortBy: (sort: 'popularity.desc' | 'vote_average.desc') => void;
  totalCount: number;
  onReset: () => void;
}

const TAXONOMIES: TaxonomyTag[] = [
  '[ALL]',
  '[INDIE GEM]',
  '[GLOBAL VOICES]',
  '[MASTERPIECE]',
  '[BLOCKBUSTER FLAW]',
  '[CULT NOIR]',
  '[AVANT-GARDE]',
  '[RAW ESSENCE]',
];

export const TaxonomyBar: React.FC<TaxonomyBarProps> = ({
  selectedTag,
  onSelectTag,
  selectedStatus,
  onSelectStatus,
  selectedMediaType,
  onSelectMediaType,
  genres,
  selectedGenreId,
  onSelectGenreId,
  sortBy,
  onSelectSortBy,
  totalCount,
  onReset,
}) => {
  return (
    <div style={{
      width: '100%',
      marginBottom: '2.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.2rem',
      borderBottom: '1px solid var(--border-subtle)',
      paddingBottom: '1.5rem',
    }}>
      {/* Top Row: Horizontal Non-Standard Taxonomy Tags */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.4rem',
        scrollbarWidth: 'none',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          color: 'rgba(255, 255, 255, 0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginRight: '0.5rem',
          whiteSpace: 'nowrap',
        }}>
          TAXONOMIA:
        </span>

        {TAXONOMIES.map((tag) => {
          const isActive = selectedTag === tag;
          return (
            <button
              key={tag}
              onClick={() => onSelectTag(tag)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.06em',
                padding: '0.4rem 0.85rem',
                border: '1px solid',
                borderColor: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
                background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.02)',
                color: isActive ? '#000000' : 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Bottom Filter Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        {/* Left: Media Type & Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Format pills */}
          {(['all', 'movie', 'tv'] as (MediaType | 'all')[]).map((type) => {
            const isActive = selectedMediaType === type;
            const label = type === 'all' ? 'TUTTI I FORMATI' : type === 'movie' ? 'FILM' : 'SERIE TV';
            return (
              <button
                key={type}
                onClick={() => onSelectMediaType(type)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  letterSpacing: '0.04em',
                  padding: '0.35rem 0.7rem',
                  border: '1px solid',
                  borderColor: isActive ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.08)',
                  background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </button>
            );
          })}

          {/* Status selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: '0.5rem' }}>
            {(['all', 'coming soon', 'in theatres', 'new'] as (StatusTag | 'all')[]).map((status) => {
              const isActive = selectedStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => onSelectStatus(status)}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    padding: '0.3rem 0.6rem',
                    background: isActive ? '#27272a' : 'transparent',
                    border: '1px solid',
                    borderColor: isActive ? '#52525b' : 'rgba(255, 255, 255, 0.06)',
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                    cursor: 'pointer',
                    textTransform: 'lowercase',
                  }}
                >
                  {status === 'all' ? 'status: all' : status}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Genre, Sort & Counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Genre Dropdown */}
          <select
            value={selectedGenreId || ''}
            onChange={(e) => onSelectGenreId(e.target.value ? Number(e.target.value) : null)}
            className="grid-select"
          >
            <option value="">GENERE: TUTTI</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => onSelectSortBy(e.target.value as any)}
            className="grid-select"
          >
            <option value="popularity.desc">RILEVANZA / TREND</option>
            <option value="vote_average.desc">VOTO CRITICA (MAX)</option>
          </select>

          {/* Reset Button if filtered */}
          {(selectedTag !== '[ALL]' || selectedGenreId || selectedMediaType !== 'all' || selectedStatus !== 'all') && (
            <button
              onClick={onReset}
              className="btn-grid"
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.68rem' }}
              title="Azzera filtri"
            >
              <RotateCcw size={11} />
              <span>RESET</span>
            </button>
          )}

          {/* Minimalist Live Counter */}
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'rgba(255, 255, 255, 0.45)',
            letterSpacing: '0.04em',
          }}>
            [COUNT: <strong style={{ color: '#ffffff' }}>{totalCount}</strong>]
          </span>
        </div>
      </div>
    </div>
  );
};

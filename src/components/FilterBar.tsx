import React from 'react';
import { Filter } from 'lucide-react';
import { Genre, MediaType } from '../types';

interface FilterBarProps {
  genres: Genre[];
  selectedMediaType: MediaType | 'all';
  onSelectMediaType: (type: MediaType | 'all') => void;
  selectedGenreId: number | null;
  onSelectGenre: (genreId: number | null) => void;
  sortBy: 'popularity.desc' | 'vote_average.desc';
  onSelectSortBy: (sort: 'popularity.desc' | 'vote_average.desc') => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  genres,
  selectedMediaType,
  onSelectMediaType,
  selectedGenreId,
  onSelectGenre,
  sortBy,
  onSelectSortBy,
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem',
      marginBottom: '2.2rem',
      paddingBottom: '1rem',
      borderBottom: '1px solid var(--border-subtle)',
      width: '100%',
    }}>
      {/* Label Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem' }}>
        <Filter size={16} color="var(--accent-crimson)" />
        <span>Filtra il Catalogo</span>
      </div>

      {/* Consolidated Compact Dropdown Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
        {/* Dropdown 1: Tipologia */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <select
            value={selectedMediaType}
            onChange={(e) => onSelectMediaType(e.target.value as any)}
            className="filter-dropdown"
          >
            <option value="all">Tutte le Tipologie</option>
            <option value="movie">Solo Film</option>
            <option value="tv">Solo Serie TV</option>
          </select>
        </div>

        {/* Dropdown 2: Genere */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <select
            value={selectedGenreId || ''}
            onChange={(e) => onSelectGenre(e.target.value ? Number(e.target.value) : null)}
            className="filter-dropdown"
          >
            <option value="">Tutti i Generi</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* Dropdown 3: Ordina Per */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <select
            value={sortBy}
            onChange={(e) => onSelectSortBy(e.target.value as any)}
            className="filter-dropdown"
          >
            <option value="popularity.desc">Ordina per: Popolarità</option>
            <option value="vote_average.desc">Ordina per: Valutazione Più Alta</option>
          </select>
        </div>
      </div>
    </div>
  );
};

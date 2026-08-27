import React, { useState } from 'react';
import { Search, Dices, Bookmark, User, SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { UserProfile, StatusTag, Genre, MediaType } from '../types';
import { TheGridLogo } from './TheGridLogo';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSearch: () => void;
  onOpenDiceModal: () => void;
  onOpenWatchlist: () => void;
  onOpenAuth: () => void;
  user: UserProfile | null;
  watchlistCount: number;

  // Filter props integrated in header
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
  onResetFilters: () => void;
}

interface NavItemButtonProps {
  id: string;
  label: string;
  isActive: boolean;
  onSelect: (id: string) => void;
}

const NavItemButton: React.FC<NavItemButtonProps> = ({ id, label, isActive, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [origin, setOrigin] = useState<'left' | 'right'>('left');

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setOrigin(x < rect.width / 2 ? 'left' : 'right');
    setIsHovered(true);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setOrigin(x < rect.width / 2 ? 'left' : 'right');
    setIsHovered(false);
  };

  return (
    <button
      onClick={() => {
        setIsHovered(false);
        onSelect(id);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background: 'none',
        border: 'none',
        // ONLY WHITE WHEN ACTIVE / CLICKED. NOT on hover!
        color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.82rem',
        fontWeight: isActive ? 800 : 500,
        letterSpacing: '0.12em',
        cursor: 'pointer',
        padding: '0.35rem 0',
        position: 'relative',
        outline: 'none',
        transition: 'color 0.2s ease',
      }}
    >
      {label}
      {/* Direction-aware underline: ONLY the bar appears on hover */}
      <span
        style={{
          position: 'absolute',
          bottom: '-2px',
          left: 0,
          right: 0,
          height: '2px',
          backgroundColor: '#ffffff',
          transformOrigin: origin,
          transform: isHovered && !isActive ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none',
        }}
      />
    </button>
  );
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSearch,
  onOpenDiceModal,
  onOpenWatchlist,
  onOpenAuth,
  user,
  watchlistCount,
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
  onResetFilters,
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const isFilterActive =
    selectedStatus !== 'all' ||
    selectedMediaType !== 'all' ||
    selectedGenreId !== null ||
    sortBy !== 'popularity.desc';

  const navItems = [
    { id: 'home', label: 'ESPLORA' },
    { id: 'directors', label: 'REGISTI' },
    { id: 'archive', label: 'ARCHIVIO' },
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      width: '100%',
      backgroundColor: '#000000',
      borderBottom: '1px solid var(--border-subtle)',
      boxSizing: 'border-box',
    }}>
      {/* Primary Top Bar with 3-Column Grid on Desktop */}
      <div className="navbar-top-grid">
        {/* Left Column: Brand Logo THE GRID */}
        <div style={{ justifySelf: 'start' }}>
          <TheGridLogo onHomeClick={() => setActiveTab('home')} />
        </div>

        {/* Center Column: Perfectly Fixed Navigation Links */}
        <nav
          className="hide-mobile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2.5rem',
            justifySelf: 'center',
          }}
        >
          {navItems.map((item) => (
            <NavItemButton
              key={item.id}
              id={item.id}
              label={item.label}
              isActive={activeTab === item.id}
              onSelect={setActiveTab}
            />
          ))}
        </nav>

        {/* Right Column: Controls & Filters Trigger */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          justifySelf: 'end',
        }}>
          {/* Filters Toggle Button */}
          <button
            onClick={() => {
              if (activeTab !== 'home') setActiveTab('home');
              setShowFilters(!showFilters);
            }}
            className={`btn-grid ${showFilters || isFilterActive ? 'btn-grid-active' : ''}`}
            style={{ padding: '0.45rem 0.85rem', gap: '0.4rem' }}
            title="Filtri catalogo"
            aria-label="Filtri catalogo"
          >
            <SlidersHorizontal size={13} />
            <span className="hide-mobile" style={{ fontSize: '0.72rem' }}>
              FILTRI {isFilterActive ? '●' : ''}
            </span>
            <span className="show-mobile-only" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
              {isFilterActive ? '●' : ''}
            </span>
            {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {/* Search */}
          <button
            onClick={onOpenSearch}
            className="btn-grid"
            style={{ padding: '0.45rem 0.75rem', gap: '0.35rem' }}
            title="Cerca"
            aria-label="Cerca"
          >
            <Search size={13} />
            <span className="hide-mobile" style={{ fontSize: '0.72rem' }}>SEARCH</span>
          </button>

          {/* Roll */}
          <button
            onClick={onOpenDiceModal}
            className="btn-grid"
            style={{ padding: '0.45rem 0.75rem', gap: '0.35rem' }}
            title="Estrazione casuale"
            aria-label="Estrazione casuale"
          >
            <Dices size={13} />
            <span className="hide-mobile" style={{ fontSize: '0.72rem' }}>ROLL</span>
          </button>

          {/* Vault */}
          <button
            onClick={onOpenWatchlist}
            className="btn-grid"
            style={{ padding: '0.45rem 0.75rem', gap: '0.35rem' }}
            title="Vault"
            aria-label="Vault"
          >
            <Bookmark size={13} />
            <span className="hide-mobile" style={{ fontSize: '0.72rem' }}>VAULT [{watchlistCount}]</span>
            <span className="show-mobile-only" style={{ fontSize: '0.68rem', fontWeight: 800 }}>[{watchlistCount}]</span>
          </button>

          {/* User Profile */}
          <button
            onClick={onOpenAuth}
            className="btn-grid"
            style={{
              padding: '0.45rem 0.65rem',
              gap: '0.35rem',
            }}
            title={user && !user.uid.startsWith('guest_') ? (user.displayName || 'Profilo') : 'Accedi o Registrati'}
            aria-label={user && !user.uid.startsWith('guest_') ? 'Profilo utente' : 'Accedi o Registrati'}
          >
            <User size={13} color="#ffffff" />
            <span className="hide-mobile" style={{ fontSize: '0.72rem', color: '#ffffff' }}>
              {user && !user.uid.startsWith('guest_') ? (user.displayName || 'CURATORE').toUpperCase() : 'ACCEDI'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Tabs Bar - Centered */}
      <div
        className="show-mobile-only"
        style={{
          width: '100%',
          backgroundColor: '#070709',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'clamp(1.5rem, 8vw, 3.5rem)',
          padding: '0.4rem 1rem',
          boxSizing: 'border-box',
        }}
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                padding: '0.5rem 0.5rem',
                background: 'transparent',
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: isActive ? 800 : 500,
                letterSpacing: '0.08em',
                border: 'none',
                borderBottom: isActive ? '2px solid #ffffff' : '2px solid transparent',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Integrated Filter Bar in Header */}
      {showFilters && (
        <div style={{
          backgroundColor: '#070709',
          borderTop: '1px solid var(--border-subtle)',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxSizing: 'border-box',
        }}>
          {/* Format & Status Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexWrap: 'wrap',
            width: '100%',
          }}>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {(['all', 'movie', 'tv'] as (MediaType | 'all')[]).map((type) => {
                const isActive = selectedMediaType === type;
                const label = type === 'all' ? 'TUTTI' : type === 'movie' ? 'FILM' : 'SERIE';
                return (
                  <button
                    key={type}
                    onClick={() => onSelectMediaType(type)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      padding: '0.35rem 0.6rem',
                      border: '1px solid',
                      borderColor: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                      background: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? '#000000' : 'rgba(255, 255, 255, 0.6)',
                      cursor: 'pointer',
                      fontWeight: isActive ? 800 : 500,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 0.2rem' }} />

            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {(['all', 'coming soon', 'in theatres'] as (StatusTag | 'all')[]).map((status) => {
                const isActive = selectedStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => onSelectStatus(status)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      padding: '0.35rem 0.55rem',
                      background: isActive ? '#27272a' : 'transparent',
                      border: '1px solid',
                      borderColor: isActive ? '#52525b' : 'rgba(255, 255, 255, 0.06)',
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
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

          {/* Dropdowns, Reset & Total count */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            width: '100%',
          }}>
            <select
              value={selectedGenreId || ''}
              onChange={(e) => onSelectGenreId(e.target.value ? Number(e.target.value) : null)}
              className="grid-select"
              style={{
                fontSize: '0.72rem',
                padding: '0.4rem 0.6rem',
                flex: '1 1 140px',
                minWidth: '130px',
              }}
            >
              <option value="">GENERE: TUTTI</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name.toUpperCase()}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => onSelectSortBy(e.target.value as any)}
              className="grid-select"
              style={{
                fontSize: '0.72rem',
                padding: '0.4rem 0.6rem',
                flex: '1 1 140px',
                minWidth: '130px',
              }}
            >
              <option value="popularity.desc">TREND / RILEVANZA</option>
              <option value="vote_average.desc">VOTO CRITICA (MAX)</option>
            </select>

            {isFilterActive && (
              <button
                onClick={onResetFilters}
                className="btn-grid"
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.68rem' }}
                title="Azzera filtri"
              >
                <RotateCcw size={11} />
                <span>RESET</span>
              </button>
            )}

            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'rgba(255, 255, 255, 0.45)',
              marginLeft: 'auto',
            }}>
              [OPERE: <strong style={{ color: '#ffffff' }}>{totalCount}</strong>]
            </span>
          </div>
        </div>
      )}
    </header>
  );
};


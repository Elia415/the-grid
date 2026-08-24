import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { TheGridLogoLoader } from './components/TheGridLogo';
import { DystopianBackground } from './components/DystopianBackground';
import { BrokenGridCluster } from './components/BrokenGridCluster';
import { DirectorsView } from './components/DirectorsView';
import { ArchiveView } from './components/ArchiveView';
import { MediaDetailModal } from './components/MediaDetailModal';
import { DiceRollModal } from './components/DiceRollModal';
import { WatchlistModal } from './components/WatchlistModal';
import { AuthModal } from './components/AuthModal';
import { SearchOverlay } from './components/SearchOverlay';

import {
  getNowPlayingMovies,
  getUpcomingMovies,
  getTrending,
  getPopular,
  getTopRated,
  getGenres,
  discoverMedia,
} from './services/tmdb';
import { subscribeToAuth, getWatchlist } from './services/firebase';
import { enrichMediaWithEditorial } from './services/curator';
import { MediaItem, Genre, MediaType, WatchlistItem, UserProfile, StatusTag } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [user, setUser] = useState<UserProfile | null>(null);

  // Raw fetched items & genres
  const [rawItems, setRawItems] = useState<MediaItem[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);

  // Selected Media for Modal
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedDirectorForView, setSelectedDirectorForView] = useState<string | null>(null);

  // Modal Dialog states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDiceModalOpen, setIsDiceModalOpen] = useState(false);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Watchlist & Vault State
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistMediaIds, setWatchlistMediaIds] = useState<Set<string>>(new Set());

  // Filter States
  const [selectedStatus, setSelectedStatus] = useState<StatusTag | 'all'>('all');
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType | 'all'>('all');
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'popularity.desc' | 'vote_average.desc'>('popularity.desc');

  // Pagination & Loading States
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Floating Back to Top Button
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Subscribe to Firebase Auth
  useEffect(() => {
    const unsubscribe = subscribeToAuth((u) => {
      setUser(u);
      loadUserWatchlist();
    });
    return () => unsubscribe();
  }, []);

  // Fetch initial genres
  useEffect(() => {
    async function initGenres() {
      const movieGenres = await getGenres('movie');
      setGenres(movieGenres);
    }
    initGenres();
  }, []);

  // Sync Watchlist
  const loadUserWatchlist = useCallback(async () => {
    try {
      const list = await getWatchlist();
      setWatchlist(list);
      const setIds = new Set<string>();
      list.forEach((w) => setIds.add(`${w.mediaType}_${w.mediaId}`));
      setWatchlistMediaIds(setIds);
    } catch (e) {
      console.error('Error loading watchlist:', e);
    }
  }, []);

  // Listen for vault updates and load initial watchlist
  useEffect(() => {
    loadUserWatchlist();
    window.addEventListener('vault_updated', loadUserWatchlist);
    return () => window.removeEventListener('vault_updated', loadUserWatchlist);
  }, [loadUserWatchlist]);

  // Fetch optimized dataset from TMDB based on active filters
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setCurrentPage(1);
    setHasMore(true);

    try {
      let items: MediaItem[] = [];

      if (selectedStatus === 'coming soon') {
        items = await getUpcomingMovies(5);
      } else if (selectedStatus === 'in theatres') {
        items = await getNowPlayingMovies(5);
      } else if (sortBy === 'vote_average.desc') {
        if (selectedMediaType === 'tv') {
          items = await discoverMedia('tv', selectedGenreId, null, 'vote_average.desc', 1, 5);
        } else if (selectedMediaType === 'movie') {
          items = await discoverMedia('movie', selectedGenreId, null, 'vote_average.desc', 1, 5);
        } else {
          const [topMovies, topTv] = await Promise.all([
            discoverMedia('movie', selectedGenreId, null, 'vote_average.desc', 1, 3),
            discoverMedia('tv', selectedGenreId, null, 'vote_average.desc', 1, 3),
          ]);
          items = [...topMovies, ...topTv];
        }
      } else if (selectedGenreId || selectedMediaType !== 'all') {
        if (selectedMediaType === 'tv') {
          items = await discoverMedia('tv', selectedGenreId, null, sortBy, 1, 5);
        } else if (selectedMediaType === 'movie') {
          items = await discoverMedia('movie', selectedGenreId, null, sortBy, 1, 5);
        } else {
          const [movies, tv] = await Promise.all([
            discoverMedia('movie', selectedGenreId, null, sortBy, 1, 3),
            discoverMedia('tv', selectedGenreId, null, sortBy, 1, 3),
          ]);
          items = [...movies, ...tv];
        }
      } else {
        const [trending, topMovies, topTv, popularMovies, popularTv] = await Promise.all([
          getTrending('all', 'week', 4),
          getTopRated('movie', 3),
          getTopRated('tv', 3),
          getPopular('movie', 3),
          getPopular('tv', 3),
        ]);

        const map = new Map<string, MediaItem>();
        [...trending, ...topMovies, ...topTv, ...popularMovies, ...popularTv].forEach((m) => {
          if (m && m.id && (m.poster_path || m.backdrop_path)) {
            map.set(`${m.media_type}_${m.id}`, m);
          }
        });
        items = Array.from(map.values());
      }

      setRawItems(items);
    } catch (err) {
      console.error('Error fetching catalog:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedMediaType, selectedGenreId, sortBy]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load more pages on demand / infinite scrolling
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = currentPage + 4;

    try {
      let newItems: MediaItem[] = [];
      if (selectedStatus === 'coming soon') {
        newItems = await getUpcomingMovies(4, nextPage);
      } else if (selectedStatus === 'in theatres') {
        newItems = await getNowPlayingMovies(4, nextPage);
      } else if (sortBy === 'vote_average.desc') {
        if (selectedMediaType === 'tv') {
          newItems = await discoverMedia('tv', selectedGenreId, null, 'vote_average.desc', nextPage, 4);
        } else if (selectedMediaType === 'movie') {
          newItems = await discoverMedia('movie', selectedGenreId, null, 'vote_average.desc', nextPage, 4);
        } else {
          const [topMovies, topTv] = await Promise.all([
            discoverMedia('movie', selectedGenreId, null, 'vote_average.desc', nextPage, 3),
            discoverMedia('tv', selectedGenreId, null, 'vote_average.desc', nextPage, 3),
          ]);
          newItems = [...topMovies, ...topTv];
        }
      } else if (selectedGenreId || selectedMediaType !== 'all') {
        if (selectedMediaType === 'tv') {
          newItems = await discoverMedia('tv', selectedGenreId, null, sortBy, nextPage, 4);
        } else if (selectedMediaType === 'movie') {
          newItems = await discoverMedia('movie', selectedGenreId, null, sortBy, nextPage, 4);
        } else {
          const [movies, tv] = await Promise.all([
            discoverMedia('movie', selectedGenreId, null, sortBy, nextPage, 3),
            discoverMedia('tv', selectedGenreId, null, sortBy, nextPage, 3),
          ]);
          newItems = [...movies, ...tv];
        }
      } else {
        const [trending, popMovies, popTv] = await Promise.all([
          getTrending('all', 'week', 3),
          getPopular('movie', 3),
          getPopular('tv', 3),
        ]);
        newItems = [...trending, ...popMovies, ...popTv];
      }

      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setRawItems((prev) => {
          const map = new Map<string, MediaItem>();
          prev.forEach((m) => map.set(`${m.media_type}_${m.id}`, m));
          newItems.forEach((m) => {
            if (m && m.id && (m.poster_path || m.backdrop_path)) {
              map.set(`${m.media_type}_${m.id}`, m);
            }
          });
          return Array.from(map.values());
        });
        setCurrentPage(nextPage);
      }
    } catch (err) {
      console.error('Error loading more media:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Scroll listener for Infinite Scroll & Floating Back to Top Button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);

      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 800 &&
        !loading &&
        !loadingMore &&
        hasMore &&
        activeTab === 'home'
      ) {
        handleLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, loadingMore, hasMore, activeTab, currentPage]);

  // Enrich items with layout sizing and filter
  const displayItems = useMemo(() => {
    let enriched = rawItems.map((item, idx) => enrichMediaWithEditorial(item, idx));

    if (selectedStatus !== 'all') {
      enriched = enriched.filter((item) => item.curatorStatus === selectedStatus);
    }

    if (selectedMediaType !== 'all') {
      enriched = enriched.filter((item) => item.media_type === selectedMediaType);
    }

    if (selectedGenreId) {
      enriched = enriched.filter((item) => item.genre_ids?.includes(selectedGenreId));
    }

    // Deduplicate by unique composite key
    const uniqueMap = new Map<string, MediaItem>();
    enriched.forEach((item) => {
      const key = `${item.media_type}_${item.id}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    const items = Array.from(uniqueMap.values());

    if (sortBy === 'vote_average.desc') {
      items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (sortBy === 'popularity.desc') {
      items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    return items;
  }, [rawItems, selectedStatus, selectedMediaType, selectedGenreId, sortBy]);

  const handleResetFilters = () => {
    setSelectedStatus('all');
    setSelectedMediaType('all');
    setSelectedGenreId(null);
    setSortBy('popularity.desc');
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000000',
      color: '#ffffff',
      margin: 0,
      padding: 0,
      overflowX: 'hidden',
    }}>
      {/* 35mm Analog Film Grain Patina Overlay */}
      <div className="film-grain-patina" />

      {/* Dystopian Cybernetic Animated Atmosphere */}
      <DystopianBackground />

      {/* Minimalist Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenDiceModal={() => setIsDiceModalOpen(true)}
        onOpenWatchlist={() => setIsWatchlistOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        user={user}
        watchlistCount={watchlist.length}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        selectedMediaType={selectedMediaType}
        onSelectMediaType={setSelectedMediaType}
        genres={genres}
        selectedGenreId={selectedGenreId}
        onSelectGenreId={setSelectedGenreId}
        sortBy={sortBy}
        onSelectSortBy={setSortBy}
        totalCount={displayItems.length}
        onResetFilters={handleResetFilters}
      />

      {/* Main Full-Bleed Content Area */}
      <main style={{
        flex: 1,
        width: '100%',
        margin: 0,
        padding: activeTab === 'home' || activeTab === 'directors' ? 0 : 'clamp(1.2rem, 3vw, 2.5rem) clamp(0.75rem, 3vw, 2rem)',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* ESPLORA / HOME: 100% FULL-SCREEN ZERO-GAP BROKEN GRID WITH MASSIVE LIVE CATALOG */}
        {activeTab === 'home' && (
          <div style={{ width: '100%', margin: 0, padding: 0 }}>
            {loading && rawItems.length === 0 ? (
              <TheGridLogoLoader size={120} minHeight="65vh" />
            ) : displayItems.length === 0 ? (
              <div style={{
                padding: '8rem 2rem',
                textAlign: 'center',
                background: '#000000',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  [NESSUNA OPERA CORRISPONDENTE AI FILTRI ATTIVI]
                </span>
                <div style={{ marginTop: '1.2rem' }}>
                  <button onClick={handleResetFilters} className="btn-grid btn-grid-active">
                    AZZERA FILTRI
                  </button>
                </div>
              </div>
            ) : (
              <>
                <BrokenGridCluster
                  items={displayItems}
                  onSelectMedia={setSelectedMedia}
                  watchlistMediaIds={watchlistMediaIds}
                  onWatchlistToggle={loadUserWatchlist}
                />

                {/* Bottom Load More Block */}
                <div style={{
                  padding: 'clamp(2rem, 4vw, 3rem) 1.5rem',
                  textAlign: 'center',
                  background: '#000000',
                  borderTop: '1px solid var(--border-subtle)',
                }}>
                  {loadingMore ? (
                    <TheGridLogoLoader size={38} minHeight="50px" />
                  ) : hasMore ? (
                    <button
                      onClick={handleLoadMore}
                      className="btn-grid btn-grid-active"
                      style={{ padding: '0.75rem 1.5rem', fontSize: '0.74rem' }}
                    >
                      CARICA ALTRI TITOLI ({displayItems.length} ATTUALMENTE VISUALIZZATI)
                    </button>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                      [FINE DELL'ARCHIVIO - TUTTI I TITOLI CARICATI]
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* REGISTI TAB */}
        {activeTab === 'directors' && (
          <div style={{ width: '100%', margin: 0, padding: 0 }}>
            <DirectorsView
              onSelectMedia={setSelectedMedia}
              watchlistMediaIds={watchlistMediaIds}
              onWatchlistToggle={loadUserWatchlist}
              selectedDirectorName={selectedDirectorForView}
            />
          </div>
        )}

        {/* ARCHIVIO TAB */}
        {activeTab === 'archive' && (
          <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
            <ArchiveView
              onSelectMedia={setSelectedMedia}
              watchlistMediaIds={watchlistMediaIds}
              onWatchlistToggle={loadUserWatchlist}
            />
          </div>
        )}
      </main>

      {/* Floating "TORNA IN CIMA" Button with smooth right-to-left slide in & left-to-right slide out */}
      <button
        onClick={scrollToTop}
        className="btn-grid btn-grid-active"
        style={{
          position: 'fixed',
          bottom: 'clamp(1rem, 2.5vw, 2rem)',
          right: 'clamp(1rem, 2.5vw, 2rem)',
          zIndex: 90,
          padding: '0.65rem 1rem',
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.9)',
          border: '1px solid #ffffff',
          cursor: 'pointer',
          transform: showScrollTop ? 'translateX(0)' : 'translateX(calc(100% + 3rem))',
          opacity: showScrollTop ? 1 : 0,
          pointerEvents: showScrollTop ? 'auto' : 'none',
          transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
        }}
        title="Torna in cima alla pagina"
        aria-label="Torna in cima alla pagina"
      >
        <ArrowUp size={14} strokeWidth={2.5} />
        <span className="hide-mobile">TORNA IN CIMA</span>
      </button>

      {/* Interactive Modals */}
      {selectedMedia && (
        <MediaDetailModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          watchlistMediaIds={watchlistMediaIds}
          onWatchlistToggle={loadUserWatchlist}
          onOpenAuth={() => setIsAuthOpen(true)}
          onSelectDirector={(dirName) => {
            setSelectedMedia(null);
            setSelectedDirectorForView(dirName);
            setActiveTab('directors');
          }}
        />
      )}

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectMedia={setSelectedMedia}
        watchlistMediaIds={watchlistMediaIds}
        onWatchlistToggle={loadUserWatchlist}
      />

      <DiceRollModal
        isOpen={isDiceModalOpen}
        onClose={() => setIsDiceModalOpen(false)}
        genres={genres}
        onSelectMedia={setSelectedMedia}
      />

      <WatchlistModal
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
        items={watchlist}
        onSelectMedia={setSelectedMedia}
        onWatchlistToggle={loadUserWatchlist}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        user={user}
        onUserChange={setUser}
      />
    </div>
  );
};

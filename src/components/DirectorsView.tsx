import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DIRECTORS_DATABASE, DirectorItem } from '../services/directorsData';
import { getDirectorFilmography, getDirectorProfile } from '../services/tmdb';
import { MediaItem } from '../types';
import { BrokenGridCluster } from './BrokenGridCluster';
import { TheGridLogoLoader } from './TheGridLogo';
import { getCachedImdbScore, fetchMediaImdbScore } from '../services/omdb';

interface DirectorsViewProps {
  onSelectMedia: (item: MediaItem) => void;
  watchlistMediaIds: Set<string>;
  onWatchlistToggle: () => void;
  selectedDirectorName?: string | null;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const DirectorsView: React.FC<DirectorsViewProps> = ({
  onSelectMedia,
  watchlistMediaIds,
  onWatchlistToggle,
  selectedDirectorName,
}) => {
  // Default selected director: Denis Villeneuve
  const [selectedDirector, setSelectedDirector] = useState<DirectorItem>(() => {
    return DIRECTORS_DATABASE.find((d) => d.lastName === 'Villeneuve') || DIRECTORS_DATABASE[0];
  });

  // Sort filter: 'featured' vs 'rating'
  const [sortBy, setSortBy] = useState<'featured' | 'rating'>('featured');

  // Sync selectedDirector when selectedDirectorName changes from external navigation
  useEffect(() => {
    if (!selectedDirectorName) return;
    const cleanQuery = selectedDirectorName.trim().toLowerCase();
    const found = DIRECTORS_DATABASE.find(
      (d) =>
        d.name.toLowerCase() === cleanQuery ||
        d.lastName.toLowerCase() === cleanQuery ||
        cleanQuery.includes(d.lastName.toLowerCase())
    );

    if (found) {
      setSelectedDirector(found);
    } else {
      const parts = selectedDirectorName.trim().split(' ');
      const lastName = parts[parts.length - 1] || selectedDirectorName;
      const letter = lastName[0] ? lastName[0].toUpperCase() : 'A';
      setSelectedDirector({
        id: selectedDirectorName.toLowerCase().replace(/\s+/g, '-'),
        name: selectedDirectorName,
        lastName,
        letter,
        photoUrl: '',
        bio: `Autore e cineasta cinematografico.`,
        style: 'Visione e direzione autoriale.',
        nationality: 'Cinema Internazionale',
        birthYear: 'N/D',
      });
    }
  }, [selectedDirectorName]);

  // Active letter hovered or opened
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState<number>(70);
  const [isMenuHovered, setIsMenuHovered] = useState(false);

  // Filmography & Profile state
  const [films, setFilms] = useState<MediaItem[]>([]);
  const [loadingFilms, setLoadingFilms] = useState(false);
  const [realDirectorPhoto, setRealDirectorPhoto] = useState<string | null>(null);

  // Close menu timer
  const menuTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch real films & profile directed by the selected director
  useEffect(() => {
    if (!selectedDirector) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    let isMounted = true;
    setLoadingFilms(true);
    setRealDirectorPhoto(null);

    // Fetch genuine TMDB profile photo
    getDirectorProfile(selectedDirector.name, selectedDirector.tmdbId)
      .then((profile) => {
        if (isMounted && profile?.photoUrl) {
          setRealDirectorPhoto(profile.photoUrl);
        }
      })
      .catch(() => {});

    // Fetch full authentic filmography
    getDirectorFilmography(selectedDirector.name, selectedDirector.tmdbId)
      .then((res) => {
        if (isMounted) {
          setFilms(res);
          // Pre-warm IMDb scores for the films
          res.slice(0, 15).forEach((f) => {
            fetchMediaImdbScore(f).catch(() => {});
          });
        }
      })
      .catch((err) => {
        console.error('Error loading director films:', err);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingFilms(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDirector]);

  // Group directors by letter
  const directorsByLetter = useMemo(() => {
    const map = new Map<string, DirectorItem[]>();
    ALPHABET.forEach((l) => map.set(l, []));
    DIRECTORS_DATABASE.forEach((dir) => {
      const char = dir.letter.toUpperCase();
      if (map.has(char)) {
        map.get(char)!.push(dir);
      } else {
        map.set(char, [dir]);
      }
    });
    // Sort each group alphabetically by lastName
    map.forEach((list) => {
      list.sort((a, b) => a.lastName.localeCompare(b.lastName));
    });
    return map;
  }, []);

  const handleLetterMouseEnter = (letter: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const letterCenter = rect.top + rect.height / 2;
    const dirs = directorsByLetter.get(letter) || [];
    const count = Math.max(1, dirs.length);
    const approxHeight = Math.min(460, count * 48);
    const minTop = 60;
    const maxBottom = window.innerHeight - 16;

    let optimalTop = letterCenter - approxHeight / 2;
    if (optimalTop + approxHeight > maxBottom) {
      optimalTop = Math.max(minTop, maxBottom - approxHeight);
    }
    if (optimalTop < minTop) {
      optimalTop = minTop;
    }

    setMenuTop(optimalTop);
    setActiveLetter(letter);
  };

  const handleLetterMouseLeave = () => {
    menuTimerRef.current = setTimeout(() => {
      if (!isMenuHovered) {
        setActiveLetter(null);
      }
    }, 200);
  };

  const handleMenuMouseEnter = () => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    setIsMenuHovered(true);
  };

  const handleMenuMouseLeave = () => {
    setIsMenuHovered(false);
    setActiveLetter(null);
  };

  const currentLetterDirectors = activeLetter ? directorsByLetter.get(activeLetter) || [] : [];

  // Sorted films based on active filter ('featured' vs 'rating')
  const sortedFilms = useMemo(() => {
    const list = [...films];
    if (sortBy === 'rating') {
      list.sort((a, b) => {
        const scoreA = parseFloat(getCachedImdbScore(a) || '') || a.vote_average || 0;
        const scoreB = parseFloat(getCachedImdbScore(b) || '') || b.vote_average || 0;
        return scoreB - scoreA;
      });
    } else {
      list.sort((a, b) => {
        const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
        const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
        return (dateB - dateA) || ((b.popularity || 0) - (a.popularity || 0));
      });
    }
    return list;
  }, [films, sortBy]);

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      background: '#000000',
    }}>
      {/* MOBILE ONLY: Horizontal swipeable letter ribbon at top */}
      <div
        className="show-mobile-only horizontal-scroll-ribbon"
        style={{
          width: '100%',
          backgroundColor: '#070709',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0.5rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          boxSizing: 'border-box',
          position: 'sticky',
          top: '80px',
          zIndex: 90,
        }}
      >
        {ALPHABET.map((letter) => {
          const count = (directorsByLetter.get(letter) || []).length;
          const hasDirectors = count > 0;
          const isSelected = selectedDirector.letter === letter;

          return (
            <button
              key={`mob-letter-${letter}`}
              onClick={() => {
                const list = directorsByLetter.get(letter);
                if (list && list.length > 0) {
                  setSelectedDirector(list[0]);
                }
              }}
              disabled={!hasDirectors}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                fontWeight: isSelected ? 800 : 600,
                color: isSelected ? '#000000' : hasDirectors ? '#ffffff' : 'rgba(255, 255, 255, 0.2)',
                background: isSelected ? '#ffffff' : hasDirectors ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: '1px solid',
                borderColor: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                padding: '0.35rem 0.65rem',
                flexShrink: 0,
                cursor: hasDirectors ? 'pointer' : 'default',
                borderRadius: '2px',
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* MOBILE ONLY: Directors selector pills for the active letter */}
      {directorsByLetter.get(selectedDirector.letter) && directorsByLetter.get(selectedDirector.letter)!.length > 1 && (
        <div
          className="show-mobile-only horizontal-scroll-ribbon"
          style={{
            width: '100%',
            backgroundColor: '#0c0c10',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '0.4rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxSizing: 'border-box',
          }}
        >
          {directorsByLetter.get(selectedDirector.letter)!.map((dir) => {
            const isDirActive = selectedDirector.id === dir.id;
            return (
              <button
                key={`mob-dir-${dir.id}`}
                onClick={() => setSelectedDirector(dir)}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.72rem',
                  fontWeight: isDirActive ? 800 : 600,
                  color: isDirActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                  background: isDirActive ? '#27272a' : 'transparent',
                  border: '1px solid',
                  borderColor: isDirActive ? '#52525b' : 'rgba(255, 255, 255, 0.1)',
                  padding: '0.25rem 0.55rem',
                  flexShrink: 0,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {dir.name}
              </button>
            );
          })}
        </div>
      )}

      {/* DESKTOP ONLY: Alphabet Letters Vertical Rail */}
      <div
        className="hide-mobile"
        style={{
          position: 'fixed',
          left: 0,
          top: '55px',
          bottom: 0,
          width: '34px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          alignItems: 'center',
          userSelect: 'none',
          zIndex: 80,
          background: '#000000',
          borderRight: '1px solid var(--border-subtle)',
          padding: '0.4rem 0',
          boxSizing: 'border-box',
        }}
      >
        {ALPHABET.map((letter) => {
          const count = (directorsByLetter.get(letter) || []).length;
          const hasDirectors = count > 0;
          const isHovered = activeLetter === letter;
          const isCurrentSelected = selectedDirector.letter === letter;

          return (
            <div
              key={letter}
              onMouseEnter={(e) => handleLetterMouseEnter(letter, e)}
              onMouseLeave={handleLetterMouseLeave}
              onClick={() => {
                const list = directorsByLetter.get(letter);
                if (list && list.length > 0) {
                  setSelectedDirector(list[0]);
                }
              }}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: isHovered || isCurrentSelected ? 800 : 500,
                color: isHovered
                  ? '#ffffff'
                  : hasDirectors
                  ? isCurrentSelected
                    ? '#ffffff'
                    : 'rgba(255, 255, 255, 0.7)'
                  : 'rgba(255, 255, 255, 0.15)',
                background: isHovered
                  ? '#222226'
                  : isCurrentSelected
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'transparent',
                width: '100%',
                height: 'calc((100vh - 80px) / 26)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: hasDirectors ? 'pointer' : 'default',
                transition: 'background 0.12s ease, color 0.12s ease',
              }}
            >
              {letter}
            </div>
          );
        })}
      </div>

      {/* FLYOUT DIRECTORS DROPDOWN / MENU (Desktop only) */}
      {activeLetter && (
        <div
          className="hide-mobile"
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
          style={{
            position: 'fixed',
            left: '34px',
            top: `${menuTop}px`,
            width: '280px',
            maxHeight: `calc(100vh - ${menuTop + 16}px)`,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            background: '#0a0a0d',
            border: '1px solid #ffffff',
            boxShadow: '0 20px 50px rgba(0,0,0,0.95)',
            zIndex: 120,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {currentLetterDirectors.length === 0 ? (
            <div style={{
              padding: '1.2rem 1rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'rgba(255, 255, 255, 0.4)',
              textAlign: 'center',
            }}>
              Nessun autore per la lettera {activeLetter}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {currentLetterDirectors.map((director) => {
                const isSelected = selectedDirector.id === director.id;
                return (
                  <div
                    key={director.id}
                    onClick={() => {
                      setSelectedDirector(director);
                      setActiveLetter(null);
                      setIsMenuHovered(false);
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isSelected ? '#1c1c22' : 'transparent',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.92rem',
                      fontWeight: isSelected ? 800 : 700,
                      color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                      letterSpacing: '-0.01em',
                    }}>
                      {director.name}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.62rem',
                      color: isSelected ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.35)',
                    }}>
                      {director.nationality}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div style={{
        marginLeft: '34px',
        padding: 'clamp(1.2rem, 3vw, 3rem)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem',
        boxSizing: 'border-box',
        width: 'calc(100% - 34px)',
      }}>
        {/* Selected Director Spotlight Banner */}
        <div style={{
          background: '#070709',
          border: '1px solid #ffffff',
          padding: 'clamp(1.2rem, 2.5vw, 2rem)',
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          position: 'relative',
        }}>
          {realDirectorPhoto && (
            <img
              src={realDirectorPhoto}
              alt={selectedDirector.name}
              style={{
                width: 'clamp(100px, 20vw, 130px)',
                height: 'clamp(100px, 20vw, 130px)',
                borderRadius: '2px',
                objectFit: 'cover',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                flexShrink: 0,
              }}
              onError={() => setRealDirectorPhoto(null)}
            />
          )}

          <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#000000',
                background: '#ffffff',
                padding: '0.2rem 0.5rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                REGISTA AUTORE
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: 'rgba(255, 255, 255, 0.5)',
              }}>
                {selectedDirector.nationality} • NATO NEL {selectedDirector.birthYear}
              </span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              textTransform: 'lowercase',
              lineHeight: 1.05,
              margin: 0,
            }}>
              {selectedDirector.name.toLowerCase()}.
            </h1>

            <p style={{
              fontFamily: 'var(--font-body)',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '0.92rem',
              lineHeight: 1.4,
              maxWidth: '850px',
              margin: 0,
            }}>
              {selectedDirector.bio}
            </p>

            <div style={{
              marginTop: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'rgba(255, 255, 255, 0.45)',
                letterSpacing: '0.04em',
              }}>
                FIRMA VISIVA:
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: 'rgba(255, 255, 255, 0.9)',
              }}>
                {selectedDirector.style}
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'center',
            minWidth: '120px',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.8rem',
              fontWeight: 900,
              lineHeight: 0.9,
              color: '#ffffff',
            }}>
              {loadingFilms ? '...' : films.length}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.08em',
              marginTop: '0.3rem',
            }}>
              OPERE DIRETTE
            </span>
          </div>
        </div>

        {/* FILMOGRAPHY GRID */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.8rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              FILMOGRAFIA COMPLETA DI {selectedDirector.name.toUpperCase()}
            </span>

            {/* Filter Toggle: Più in Evidenza vs Meglio Recensito */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '2px',
              gap: '2px',
            }}>
              <button
                onClick={() => setSortBy('featured')}
                style={{
                  background: sortBy === 'featured' ? '#ffffff' : 'transparent',
                  color: sortBy === 'featured' ? '#000000' : 'rgba(255, 255, 255, 0.6)',
                  border: 'none',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  padding: '0.35rem 0.75rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s ease',
                }}
              >
                PIÙ IN EVIDENZA
              </button>
              <button
                onClick={() => setSortBy('rating')}
                style={{
                  background: sortBy === 'rating' ? '#ffffff' : 'transparent',
                  color: sortBy === 'rating' ? '#000000' : 'rgba(255, 255, 255, 0.6)',
                  border: 'none',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  padding: '0.35rem 0.75rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s ease',
                }}
              >
                MEGLIO RECENSITO
              </button>
            </div>
          </div>

          {loadingFilms ? (
            <TheGridLogoLoader size={90} minHeight="45vh" />
          ) : sortedFilms.length === 0 ? (
            <div style={{
              padding: '4rem',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: 'rgba(255,255,255,0.5)',
            }}>
              Nessun film trovato per questo regista.
            </div>
          ) : (
            <div style={{ width: '100%', margin: 0, padding: 0 }}>
              <BrokenGridCluster
                items={sortedFilms}
                onSelectMedia={onSelectMedia}
                watchlistMediaIds={watchlistMediaIds}
                onWatchlistToggle={onWatchlistToggle}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

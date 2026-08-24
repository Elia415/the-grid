import { MediaItem, TaxonomyTag, StatusTag, GridCardLayout, DirectorCurated } from '../types';

const TAXONOMY_TAGS: TaxonomyTag[] = [
  '[INDIE GEM]',
  '[GLOBAL VOICES]',
  '[MASTERPIECE]',
  '[CULT NOIR]',
  '[AVANT-GARDE]',
  '[RAW ESSENCE]',
  '[DIRECTOR\'S CUT]',
];

const STATUS_TAGS: StatusTag[] = ['coming soon', 'in theatres', 'archived', 'curator pick'];

const EDITORIAL_QUOTES: string[] = [
  'Un\'opera di silenzio assoluto e tensione geometrica.',
  'A brutal, hypnotic study in light and existential alienation.',
  'Framing as emotional architecture. Devastating.',
  'Uncompromising auteur vision that redefines visual stillness.',
  'Poesia visiva scolpita nel buio e nel grano della pellicola.',
  'A sensory avalanche of light, shadow and existential reckoning.',
  'Monumental pacing with unmatched framing precision.',
  'A delicate balance between cruelty and poetic transcendence.',
  'Masterful use of negative space and atmospheric soundscapes.',
  'Pure kinetic adrenaline wrapped in melancholic noir hues.',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function enrichMediaWithEditorial(item: MediaItem, index: number): MediaItem {
  const hash = hashString(item.title || item.name || `${item.id}`);

  const isMovie = item.media_type === 'movie' || Boolean(item.title && !item.first_air_date);
  let curatorStatus: StatusTag | undefined = item.curatorStatus;

  if (!curatorStatus) {
    if (isMovie && item.release_date) {
      const releaseTime = new Date(item.release_date).getTime();
      const now = Date.now();
      const fortyFiveDaysMs = 45 * 24 * 60 * 60 * 1000;
      if (releaseTime > now) {
        curatorStatus = 'coming soon';
      } else if (releaseTime <= now && (now - releaseTime) <= fortyFiveDaysMs) {
        curatorStatus = 'in theatres';
      }
    }
  }

  const layouts: GridCardLayout[] = [
    'portrait-tall',
    'landscape-wide',
    'square-compact',
    'square-compact',
    'panorama-ultra',
    'editorial-split',
  ];
  const layout = item.aspectRatioPreference || layouts[index % layouts.length];

  return {
    ...item,
    curatorStatus,
    aspectRatioPreference: layout,
  };
}

// Curated Visionary Directors
export const CURATED_DIRECTORS: DirectorCurated[] = [
  {
    id: 'denis-villeneuve',
    name: 'Denis Villeneuve',
    bio: 'Maestro del cinema visivo contemporaneo, scultore della scala e del silenzio monumentale.',
    style: 'Brutalismo geometrico, sound design tellurico, introspezione fantascientifica.',
    photoUrl: 'https://image.tmdb.org/t/p/w500/zvhkg1N3T9w3t3X1a9W9g8bL5Jb.jpg',
    notableFilms: ['Dune: Part Two', 'Blade Runner 2049', 'Arrival', 'Sicario'],
  },
  {
    id: 'wong-kar-wai',
    name: 'Wong Kar-wai',
    bio: 'Il poeta visivo della memoria frammentata, dei colori saturi al neon e della nostalgia inespressa.',
    style: 'Step-printing, luce al tungsteno, movimenti di camera lenti e sensuali.',
    photoUrl: 'https://image.tmdb.org/t/p/w500/6y5K0U5xM10yB3A0c8p2P1Q8y0.jpg',
    notableFilms: ['In the Mood for Love', 'Chungking Express', 'Fallen Angels', 'Happy Together'],
  },
  {
    id: 'david-lynch',
    name: 'David Lynch',
    bio: 'Architetto del subconscio, dove l\'ordinario suburbano collassa nel surreale e nell\'inquietudine.',
    style: 'Texture industriali, bassi sonori profondi, doppie identità oniriche.',
    photoUrl: 'https://image.tmdb.org/t/p/w500/7bQyQo5rNq6rT3Q8Y1L2m8K9.jpg',
    notableFilms: ['Mulholland Drive', 'Twin Peaks', 'Blue Velvet', 'Eraserhead'],
  },
  {
    id: 'celine-sciamma',
    name: 'Céline Sciamma',
    bio: 'Sguardo intimo, politico e pittorico sulla connessione umana, la memoria e l\'intimità femminile.',
    style: 'Luce naturale a candela, sguardi prolungati, silenzi musicali carichi di significato.',
    photoUrl: 'https://image.tmdb.org/t/p/w500/1X0183181827492942491.jpg',
    notableFilms: ['Ritratto della giovane in fiamme', 'Petite Maman', 'Tomboy', 'Water Lilies'],
  },
  {
    id: 'christopher-nolan',
    name: 'Christopher Nolan',
    bio: 'Ingegnere del tempo e della percezione, devoto alla grandiosità del formato pellicola 70mm.',
    style: 'Montaggio parallelo ad alta tensione, concetti temporali non lineari, scala fisica.',
    photoUrl: 'https://image.tmdb.org/t/p/w500/xuAIuYSmsUzKlUMBFGVZaWsY3fX.jpg',
    notableFilms: ['Oppenheimer', 'Interstellar', 'Tenet', 'Memento'],
  },
  {
    id: 'hayao-miyazaki',
    name: 'Hayao Miyazaki',
    bio: 'Visionario animatore della natura, del volo e dell\'infinita complessità morale ed ecologica.',
    style: 'Animazione disegnata a mano, ritmo contemplativo "Ma", cieli infiniti.',
    photoUrl: 'https://image.tmdb.org/t/p/w500/7d6z9z62k7310j5bMvF28A4U8k.jpg',
    notableFilms: ['La città incantata', 'Principessa Mononoke', 'Il ragazzo e l\'airone', 'Il mio vicino Totoro'],
  },
];

// Curated Real Masterpieces of Cinema & Television
export const SIGNATURE_CINEMA_ITEMS: MediaItem[] = [
  {
    id: 872585,
    title: 'oppenheimer.',
    original_title: 'Oppenheimer',
    overview: 'La storia del fisico statunitense J. Robert Oppenheimer e del suo ruolo pionieristico nello sviluppo della prima bomba atomica durante il Progetto Manhattan.',
    poster_path: 'https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg',
    media_type: 'movie',
    release_date: '2023-07-19',
    vote_average: 8.9,
    vote_count: 9800,
    genre_ids: [18, 36],
    curatorTag: '[MASTERPIECE]',
    curatorStatus: 'curator pick',
    editorialQuote: 'Un monumento visivo alla finitezza e al terrore della coscienza umana.',
    directorName: 'Christopher Nolan',
    aspectRatioPreference: 'portrait-tall',
  },
  {
    id: 693134,
    title: 'dune: part two.',
    original_title: 'Dune: Part Two',
    overview: 'Paul Atreides si unisce a Chani e ai Fremen mentre trama la vendetta contro i cospiratori che hanno distrutto la sua famiglia, affrontando una scelta tra l\'amore della sua vita e il destino dell\'universo.',
    poster_path: 'https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520b4a.jpg',
    media_type: 'movie',
    release_date: '2024-02-27',
    vote_average: 9.3,
    vote_count: 8500,
    genre_ids: [878, 12],
    curatorTag: '[MASTERPIECE]',
    curatorStatus: 'curator pick',
    editorialQuote: 'Scultura pura nel deserto di Arrakis. Scala cosmica senza precedenti.',
    directorName: 'Denis Villeneuve',
    aspectRatioPreference: 'landscape-wide',
  },
  {
    id: 97951,
    title: 'severance.',
    original_title: 'Severance',
    overview: 'Mark Scout guida un team alla Lumon Industries i cui dipendenti sono stati sottoposti a una procedura di scissione chirurgica che separa i ricordi della vita lavorativa da quelli della vita privata.',
    poster_path: 'https://image.tmdb.org/t/p/w780/9faGSFi5jam6pDWGNd0ip80ioXA.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/9faGSFi5jam6pDWGNd0ip80ioXA.jpg',
    media_type: 'tv',
    first_air_date: '2022-02-17',
    vote_average: 9.1,
    vote_count: 3200,
    genre_ids: [18, 878, 9648],
    curatorTag: '[CULT NOIR]',
    curatorStatus: 'coming soon',
    editorialQuote: 'Brutalismo geometrico per uffici e claustrofobia esistenziale allo stato puro.',
    directorName: 'Ben Stiller',
    aspectRatioPreference: 'square-compact',
  },
  {
    id: 335984,
    title: 'blade runner 2049.',
    original_title: 'Blade Runner 2049',
    overview: 'Trent\'anni dopo gli eventi del primo film, un nuovo blade runner dell\'LAPD, l\'Agente K, dissotterra un segreto a lungo sepolto che ha il potenziale di far precipitare nel caos ciò che resta della società.',
    poster_path: 'https://image.tmdb.org/t/p/w780/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/ilRyazdMJwN05exqhwK4tMKBYZs.jpg',
    media_type: 'movie',
    release_date: '2017-10-04',
    vote_average: 9.2,
    vote_count: 14500,
    genre_ids: [878, 18, 9648],
    curatorTag: '[RAW ESSENCE]',
    curatorStatus: 'curator pick',
    editorialQuote: 'La fotografia di Roger Deakins ridefinisce il concetto stesso di luce cinematografica.',
    directorName: 'Denis Villeneuve',
    aspectRatioPreference: 'square-compact',
  },
  {
    id: 843,
    title: 'in the mood for love.',
    original_title: 'Fa yeung nin wa',
    overview: 'Hong Kong, 1962. Due vicini di casa scoprono che i rispettivi coniugi hanno una relazione e sviluppano un legame intimo ma trattenuto, segnato da una dolorosa promessa di non oltrepassare il limite.',
    poster_path: 'https://image.tmdb.org/t/p/w780/i4bgZcr2QbIQ4k87pC19602410m.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/rAiYTua5tWw4wzfc0f156d66e74b.jpg',
    media_type: 'movie',
    release_date: '2000-09-29',
    vote_average: 9.4,
    vote_count: 5400,
    genre_ids: [18, 10749],
    curatorTag: '[AVANT-GARDE]',
    curatorStatus: 'curator pick',
    editorialQuote: 'Nostalgia allo stato puro. La composizione dell\'inquadratura come respiro trattenuto.',
    directorName: 'Wong Kar-wai',
    aspectRatioPreference: 'portrait-tall',
  },
  {
    id: 157336,
    title: 'interstellar.',
    original_title: 'Interstellar',
    overview: 'In un futuro prossimo in cui la Terra è diventata inospitale, un gruppo di coraggiosi astronauti intraprende un viaggio attraverso un wormhole nello spazio alla ricerca di una nuova casa per l\'umanità.',
    poster_path: 'https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/rAiYTua5tWw4wzfc0f156d66e74b.jpg',
    media_type: 'movie',
    release_date: '2014-11-05',
    vote_average: 9.5,
    vote_count: 36000,
    genre_ids: [12, 18, 878],
    curatorTag: '[MASTERPIECE]',
    curatorStatus: 'curator pick',
    editorialQuote: 'Il vertice del cinema cosmico. La relatività generale scolpita in 70mm.',
    directorName: 'Christopher Nolan',
    aspectRatioPreference: 'panorama-ultra',
  },
  {
    id: 531428,
    title: 'ritratto della giovane in fiamme.',
    original_title: 'Portrait de la jeune fille en feu',
    overview: 'Bretagna, fine del XVIII secolo. Una pittrice riceve l\'incarico di dipingere il ritratto nuziale di una giovane donna riluttante, dando inizio a un amore segreto e indimenticabile.',
    poster_path: 'https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg',
    media_type: 'movie',
    release_date: '2019-09-18',
    vote_average: 9.2,
    vote_count: 4100,
    genre_ids: [18, 10749, 36],
    curatorTag: '[INDIE GEM]',
    curatorStatus: 'curator pick',
    editorialQuote: 'Luce naturale a candela e sguardi che bruciano più di mille parole.',
    directorName: 'Céline Sciamma',
    aspectRatioPreference: 'portrait-tall',
  },
  {
    id: 1018,
    title: 'mulholland drive.',
    original_title: 'Mulholland Drive',
    overview: 'Dopo un incidente d\'auto sulla tortuosa Mulholland Drive, una donna affetta da amnesia e un\'aspirante attrice di Hollywood cercano di scoprire la verità sulla sua reale identità in una Los Angeles onirica.',
    poster_path: 'https://image.tmdb.org/t/p/w780/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/ilRyazdMJwN05exqhwK4tMKBYZs.jpg',
    media_type: 'movie',
    release_date: '2001-10-12',
    vote_average: 9.1,
    vote_count: 6700,
    genre_ids: [53, 18, 9648],
    curatorTag: '[CULT NOIR]',
    curatorStatus: 'curator pick',
    editorialQuote: 'La decostruzione definitiva del sogno cinematografico hollywoodiano.',
    directorName: 'David Lynch',
    aspectRatioPreference: 'square-compact',
  },
  {
    id: 76331,
    title: 'succession.',
    original_title: 'Succession',
    overview: 'La saga shakespeariana della potente famiglia Roy, proprietaria del colosso globale dei media Waystar RoyCo, e della spietata lotta fratricida per la successione al patriarca Logan Roy.',
    poster_path: 'https://image.tmdb.org/t/p/w780/7k3j29104818.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg',
    media_type: 'tv',
    first_air_date: '2018-06-03',
    vote_average: 9.4,
    vote_count: 4200,
    genre_ids: [18],
    curatorTag: '[GLOBAL VOICES]',
    curatorStatus: 'curator pick',
    editorialQuote: 'Dinamiche di potere feroci, camera a mano e scrittura di livello supremo.',
    directorName: 'Jesse Armstrong',
    aspectRatioPreference: 'square-compact',
  },
  {
    id: 125910,
    title: 'the bear.',
    original_title: 'The Bear',
    overview: 'Un giovane e talentuoso chef dell\'alta cucina torna a Chicago per gestire la paninoteca di famiglia dopo la tragica morte del fratello, scontrandosi con una cucina caotica e debiti asfissianti.',
    poster_path: 'https://image.tmdb.org/t/p/w780/9faGSFi5jam6pDWGNd0ip80ioXA.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/9faGSFi5jam6pDWGNd0ip80ioXA.jpg',
    media_type: 'tv',
    first_air_date: '2022-06-23',
    vote_average: 9.3,
    vote_count: 3800,
    genre_ids: [18, 35],
    curatorTag: '[RAW ESSENCE]',
    watchProviders: ['Disney+'],
    editorialQuote: 'Ritmo frenetico a 180 battiti al minuto. Pura adrenalina cinematografica.',
    directorName: 'Christopher Storer',
    aspectRatioPreference: 'panorama-ultra',
  },
];

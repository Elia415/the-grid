import React from 'react';
import { MediaItem } from '../types';
import { BrokenCard } from './BrokenCard';

interface BrokenGridClusterProps {
  items: MediaItem[];
  onSelectMedia: (item: MediaItem) => void;
  watchlistMediaIds: Set<string>;
  onWatchlistToggle: () => void;
}

export const BrokenGridCluster: React.FC<BrokenGridClusterProps> = ({
  items,
  onSelectMedia,
  watchlistMediaIds,
  onWatchlistToggle,
}) => {
  if (!items || items.length === 0) return null;

  // Split into chunks of 5 items to generate seamless asymmetric broken-grid modules
  const clusters: MediaItem[][] = [];
  const chunkSize = 5;
  for (let i = 0; i < items.length; i += chunkSize) {
    clusters.push(items.slice(i, i + chunkSize));
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      width: '100%',
      margin: 0,
      padding: 0,
    }}>
      {clusters.map((cluster, clusterIndex) => {
        // If chunk has fewer than 5 items (e.g. remainder or small list), render exactly the items present
        if (cluster.length < 5) {
          return (
            <section
              key={`cluster-remainder-${clusterIndex}`}
              style={{
                display: 'grid',
                gridTemplateColumns: cluster.length === 1 ? '1fr' : cluster.length === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 0,
                width: '100%',
                margin: 0,
                padding: 0,
              }}
            >
              {cluster.map((item, idx) => (
                <BrokenCard
                  key={`rem-${item.media_type}-${item.id}-${idx}`}
                  item={item}
                  variant={idx === 0 ? 'landscape-wide' : 'square-compact'}
                  onSelect={onSelectMedia}
                  isBookmarked={watchlistMediaIds.has(`${item.media_type}_${item.id}`)}
                  onWatchlistToggle={onWatchlistToggle}
                />
              ))}
            </section>
          );
        }

        const patternType = clusterIndex % 2;

        // PATTERN 0: Exact Direct Replica of image_0.png Reference
        // Zero-Gap Full Bleed
        // Left: Tall Portrait (2 rows height)
        // Right Top: Wide Panoramic Frame
        // Right Bottom: 3 Touching Vertical/Square Stills
        if (patternType === 0) {
          const tallItem = cluster[0];
          const wideTopItem = cluster[1];
          const subItem1 = cluster[2];
          const subItem2 = cluster[3];
          const subItem3 = cluster[4];

          return (
            <section
              key={`cluster-${clusterIndex}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(280px, 3.8fr) minmax(360px, 8.2fr)',
                gap: 0,
                width: '100%',
                margin: 0,
                padding: 0,
              }}
              className="broken-cluster"
            >
              {/* Left Column: Full-Height Tall Portrait touching flush */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: 0, padding: 0 }}>
                {tallItem && (
                  <BrokenCard
                    item={tallItem}
                    variant="portrait-tall"
                    onSelect={onSelectMedia}
                    isBookmarked={watchlistMediaIds.has(`${tallItem.media_type}_${tallItem.id}`)}
                    onWatchlistToggle={onWatchlistToggle}
                    priority
                  />
                )}
              </div>

              {/* Right Column: Wide Top + 3 Bottom Stills (All 0 gap) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%', margin: 0, padding: 0 }}>
                {/* Top Wide Panoramic Frame */}
                {wideTopItem && (
                  <BrokenCard
                    item={wideTopItem}
                    variant="landscape-wide"
                    onSelect={onSelectMedia}
                    isBookmarked={watchlistMediaIds.has(`${wideTopItem.media_type}_${wideTopItem.id}`)}
                    onWatchlistToggle={onWatchlistToggle}
                  />
                )}

                {/* Bottom Row: 3 Touching Asymmetric Panels */}
                <div
                  className="broken-cluster-sub3"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 0,
                    flex: 1,
                    margin: 0,
                    padding: 0,
                  }}
                >
                  {subItem1 && (
                    <BrokenCard
                      item={subItem1}
                      variant="square-compact"
                      onSelect={onSelectMedia}
                      isBookmarked={watchlistMediaIds.has(`${subItem1.media_type}_${subItem1.id}`)}
                      onWatchlistToggle={onWatchlistToggle}
                    />
                  )}
                  {subItem2 && (
                    <BrokenCard
                      item={subItem2}
                      variant="square-compact"
                      onSelect={onSelectMedia}
                      isBookmarked={watchlistMediaIds.has(`${subItem2.media_type}_${subItem2.id}`)}
                      onWatchlistToggle={onWatchlistToggle}
                    />
                  )}
                  {subItem3 && (
                    <BrokenCard
                      item={subItem3}
                      variant="portrait-tall"
                      onSelect={onSelectMedia}
                      isBookmarked={watchlistMediaIds.has(`${subItem3.media_type}_${subItem3.id}`)}
                      onWatchlistToggle={onWatchlistToggle}
                    />
                  )}
                </div>
              </div>
            </section>
          );
        }

        // PATTERN 1: The Requested Simulation (0-Gap Full Screen)
        // Left Upper: Wide Scene + 2 Touching Squares
        // Right Upper: Narrow Tall Portrait
        // Bottom: 100% Full-Bleed Panoramic Vista
        const panoramaItem = cluster[0];
        const portraitItem = cluster[1];
        const squareItem1 = cluster[2];
        const squareItem2 = cluster[3];
        const ultraWideItem = cluster[4];

        return (
          <section
            key={`cluster-${clusterIndex}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              width: '100%',
              margin: 0,
              padding: 0,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(360px, 8.2fr) minmax(280px, 3.8fr)',
                gap: 0,
                margin: 0,
                padding: 0,
              }}
              className="broken-cluster"
            >
              {/* Left Side: Wide Scene above + Two Touching Squares below (0 gap) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: 0, padding: 0 }}>
                {panoramaItem && (
                  <BrokenCard
                    item={panoramaItem}
                    variant="landscape-wide"
                    onSelect={onSelectMedia}
                    isBookmarked={watchlistMediaIds.has(`${panoramaItem.media_type}_${panoramaItem.id}`)}
                    onWatchlistToggle={onWatchlistToggle}
                  />
                )}

                <div className="broken-cluster-sub2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, margin: 0, padding: 0 }}>
                  {squareItem1 && (
                    <BrokenCard
                      item={squareItem1}
                      variant="square-compact"
                      onSelect={onSelectMedia}
                      isBookmarked={watchlistMediaIds.has(`${squareItem1.media_type}_${squareItem1.id}`)}
                      onWatchlistToggle={onWatchlistToggle}
                    />
                  )}
                  {squareItem2 && (
                    <BrokenCard
                      item={squareItem2}
                      variant="square-compact"
                      onSelect={onSelectMedia}
                      isBookmarked={watchlistMediaIds.has(`${squareItem2.media_type}_${squareItem2.id}`)}
                      onWatchlistToggle={onWatchlistToggle}
                    />
                  )}
                </div>
              </div>

              {/* Right Side: Narrow Tall Portrait */}
              <div style={{ height: '100%', margin: 0, padding: 0 }}>
                {portraitItem && (
                  <BrokenCard
                    item={portraitItem}
                    variant="portrait-tall"
                    onSelect={onSelectMedia}
                    isBookmarked={watchlistMediaIds.has(`${portraitItem.media_type}_${portraitItem.id}`)}
                    onWatchlistToggle={onWatchlistToggle}
                  />
                )}
              </div>
            </div>

            {/* Bottom 100% Edge-to-Edge Vista */}
            {ultraWideItem && (
              <div style={{ width: '100%', margin: 0, padding: 0 }}>
                <BrokenCard
                  item={ultraWideItem}
                  variant="panorama-ultra"
                  onSelect={onSelectMedia}
                  isBookmarked={watchlistMediaIds.has(`${ultraWideItem.media_type}_${ultraWideItem.id}`)}
                  onWatchlistToggle={onWatchlistToggle}
                />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

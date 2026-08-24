import React from 'react';
import { TheGridLogoIcon } from './TheGridLogo';

export const DystopianBackground: React.FC = () => {
  return (
    <div className="dystopian-bg-root" aria-hidden="true">
      {/* 1. Base Dystopian Radial Atmospheric Lighting */}
      <div className="dystopian-base-layer" />

      {/* 2. Drifting Cyber Atmospheric Nebulae */}
      <div className="dystopian-nebula nebula-teal" />
      <div className="dystopian-nebula nebula-crimson" />
      <div className="dystopian-nebula nebula-amber" />

      {/* 3. Cybernetic Horizon Grid (Animated scrolling perspective lines) */}
      <div className="dystopian-grid-floor" />

      {/* 4. Fine Digital Scanline Texture */}
      <div className="dystopian-scanlines" />

      {/* 5. Slow Drifting Vertical Laser Scan Ray */}
      <div className="dystopian-scan-ray" />

      {/* 6. Centered Monolithic "THE GRID" Logo Watermark */}
      <div className="dystopian-logo-watermark">
        <TheGridLogoIcon size={540} color="#ffffff" opacity={1} />
      </div>

      {/* 7. Dystopian Vignette Shadow around viewport edges */}
      <div className="dystopian-vignette" />
    </div>
  );
};

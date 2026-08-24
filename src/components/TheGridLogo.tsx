import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface TheGridLogoProps {
  onHomeClick?: () => void;
}

export const TheGridLogo: React.FC<TheGridLogoProps> = ({ onHomeClick }) => {
  const [hasStarted, setHasStarted] = useState(false);

  // Clear any old flags so each refresh starts cleanly with the standalone logo
  React.useEffect(() => {
    try {
      localStorage.removeItem('grid_logo_assembled');
      sessionStorage.removeItem('grid_logo_assembled');
    } catch {}
  }, []);

  const handleMouseEnter = () => {
    if (!hasStarted) {
      setHasStarted(true);
    }
  };

  // Letters of THE GRID with precise native typography kerning
  const brandLetters = [
    { char: 'T', delay: 0.15, piecePath: "M 0,0 L 14,0 L 14,3 L 3,3 L 3,14 L 0,14 Z" },
    { char: 'H', delay: 0.28, piecePath: "M 5,4 L 16,4 L 16,7 L 8,7 L 8,11 L 5,11 Z" },
    { char: 'E', delay: 0.41, piecePath: "M 0,15 L 3,15 L 3,19 L 11,19 L 11,15 L 14,15 L 14,22 L 0,22 Z" },
    { char: '\u00A0', delay: 0.48, isSpace: true },
    { char: 'G', delay: 0.55, piecePath: "M 9,10 L 17,10 L 17,15 L 14,15 L 14,13 L 9,13 Z" },
    { char: 'R', delay: 0.68, piecePath: "M 17,0 L 22,0 L 22,4 L 19,4 L 19,2 L 17,2 Z" },
    { char: 'I', delay: 0.81, piecePath: "M 17,5 L 22,5 L 22,22 L 17,22 Z" },
    { char: 'D', delay: 0.94, piecePath: "M 3,3 L 8,3 L 8,6 L 3,6 Z" },
  ];

  return (
    <div
      onClick={onHomeClick}
      onMouseEnter={handleMouseEnter}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.65rem',
        cursor: 'pointer',
        userSelect: 'none',
        height: '32px',
        lineHeight: 1,
        verticalAlign: 'middle',
      }}
      title="The Grid — Home"
    >
      {/* 1. Left Logo Icon (Seamless from start to finish, scales smoothly without repositioning) */}
      <motion.div
        animate={{
          scale: hasStarted ? 1 : 1.15,
        }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="18"
          height="18"
          style={{ display: 'block' }}
        >
          <path d="M 0,0 L 62,0 L 62,13 L 13,13 L 13,62 L 0,62 Z" fill="#ffffff" />
          <path d="M 24,20 L 71,20 L 71,33 L 37,33 L 37,46 L 24,46 Z" fill="#ffffff" />
          <path d="M 42,46 L 75,46 L 75,65 L 61,65 L 61,56 L 42,56 Z" fill="#ffffff" />
          <path d="M 0,70 L 13,70 L 13,85 L 50,85 L 50,68 L 62,68 L 62,98 L 0,98 Z" fill="#ffffff" />
          <path d="M 75,0 L 100,0 L 100,18 L 88,18 L 88,8 L 75,8 Z" fill="#ffffff" />
          <path d="M 75,22 L 100,22 L 100,98 L 75,98 Z" fill="#ffffff" />
        </svg>
      </motion.div>

      {/* 2. Permanent Brand Text with Continuous Letter Animation (Zero Cuts, Exact Spacing) */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          fontWeight: 900,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#ffffff',
          lineHeight: 1,
          position: 'relative',
        }}
      >
        {brandLetters.map((item, idx) => (
          <span
            key={idx}
            style={{
              position: 'relative',
              display: 'inline-block',
            }}
          >
            {/* Flying piece arriving at this exact letter */}
            {hasStarted && item.piecePath && (
              <motion.svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                initial={{
                  x: -30 - idx * 8,
                  y: 0,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  x: 0,
                  y: 0,
                  opacity: [1, 0.7, 0],
                  scale: [1, 0.8, 0.4],
                }}
                transition={{
                  duration: 0.65,
                  delay: item.delay,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              >
                <path d={item.piecePath} fill="#ffffff" />
              </motion.svg>
            )}

            {/* The actual letter animating directly into its permanent kerning position */}
            <motion.span
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{
                opacity: hasStarted ? 1 : 0,
                scale: hasStarted ? 1 : 0.6,
              }}
              transition={{
                duration: 0.4,
                delay: hasStarted ? item.delay + 0.35 : 0,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                display: 'inline-block',
                color: '#ffffff',
              }}
            >
              {item.char}
            </motion.span>
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * Pure Graphic Vector Logo Icon
 */
export const TheGridLogoIcon: React.FC<{ size?: number; color?: string; opacity?: number }> = ({
  size = 48,
  color = '#ffffff',
  opacity = 1,
}) => (
  <svg
    viewBox="0 0 100 100"
    width={size}
    height={size}
    style={{ display: 'block', opacity }}
  >
    <path d="M 0,0 L 62,0 L 62,13 L 13,13 L 13,62 L 0,62 Z" fill={color} />
    <path d="M 24,20 L 71,20 L 71,33 L 37,33 L 37,46 L 24,46 Z" fill={color} />
    <path d="M 42,46 L 75,46 L 75,65 L 61,65 L 61,56 L 42,56 Z" fill={color} />
    <path d="M 0,70 L 13,70 L 13,85 L 50,85 L 50,68 L 62,68 L 62,98 L 0,98 Z" fill={color} />
    <path d="M 75,0 L 100,0 L 100,18 L 88,18 L 88,8 L 75,8 Z" fill={color} />
    <path d="M 75,22 L 100,22 L 100,98 L 75,98 Z" fill={color} />
  </svg>
);

/**
 * Large Pulsing Center Loader with NO TEXT
 */
export const TheGridLogoLoader: React.FC<{ size?: number; minHeight?: string }> = ({
  size = 110,
  minHeight = '45vh',
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight,
      width: '100%',
      padding: '2rem 0',
      pointerEvents: 'none',
      userSelect: 'none',
    }}
  >
    <motion.div
      animate={{
        opacity: [0.25, 0.9, 0.25],
        scale: [0.96, 1.04, 0.96],
      }}
      transition={{
        duration: 1.8,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <TheGridLogoIcon size={size} color="#ffffff" />
    </motion.div>
  </div>
);

/**
 * Fixed Background Watermark Logo behind the grid and views
 */
export const TheGridBackgroundLogo: React.FC = () => (
  <div
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 0,
      opacity: 0.032,
      userSelect: 'none',
    }}
  >
    <TheGridLogoIcon size={520} color="#ffffff" />
  </div>
);


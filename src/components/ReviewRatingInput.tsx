import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MediaCriterion, ReviewRating, FixedCriteriaKey } from '../types';

const FIXED_CRITERIA: { key: FixedCriteriaKey; label: string }[] = [
  { key: 'regia', label: 'REGIA' },
  { key: 'fotografia', label: 'FOTOGRAFIA & LUCE' },
  { key: 'recitazione', label: 'RECITAZIONE' },
  { key: 'colonnaSonora', label: 'SOUND DESIGN & OST' },
  { key: 'sceneggiatura', label: 'SCENEGGIATURA' },
];

interface ReviewRatingInputProps {
  initialValue?: ReviewRating;
  onChange: (rating: ReviewRating) => void;
  disabled?: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
function round1(v: number) {
  return Math.round(v * 10) / 10;
}

export const ReviewRatingInput: React.FC<ReviewRatingInputProps> = ({
  initialValue,
  onChange,
  disabled = false,
}) => {
  const [criteria, setCriteria] = useState<MediaCriterion[]>(() => {
    if (initialValue?.criteria && initialValue.criteria.length > 0) {
      const existing = initialValue.criteria;
      const fixed = FIXED_CRITERIA.map((c) => {
        const found = existing.find((e) => e.key === c.key && !e.isCustom);
        return found ?? { key: c.key, label: c.label, score: 7.5, isCustom: false };
      });
      const custom = existing.filter((e) => e.isCustom);
      return [...fixed, ...custom];
    }
    return FIXED_CRITERIA.map((c) => ({ key: c.key, label: c.label, score: 7.5, isCustom: false }));
  });

  const [overrideFinal, setOverrideFinal] = useState(initialValue?.overrideFinal ?? false);
  const [overrideScore, setOverrideScore] = useState(initialValue?.overrideScore ?? null);
  const [newCustomName, setNewCustomName] = useState('');

  const currentAverage = round1(
    criteria.reduce((sum, c) => sum + c.score, 0) / Math.max(criteria.length, 1)
  );

  const emitChange = (
    nextCriteria: MediaCriterion[],
    nextOverrideFinal: boolean,
    nextOverrideScore: number | null
  ) => {
    const scores = nextCriteria.map((c) => c.score);
    const avg = scores.length > 0 ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const finalScore = nextOverrideFinal && nextOverrideScore !== null ? nextOverrideScore : avg;
    onChange({
      criteria: nextCriteria.map((c) => ({ ...c })),
      averageScore: avg,
      finalScore,
      overrideFinal: nextOverrideFinal,
      overrideScore: nextOverrideScore,
      finalScoreSource: nextOverrideFinal && nextOverrideScore !== null ? 'manual' : 'average',
    });
  };

  // Emit initial evaluation on mount once
  useEffect(() => {
    emitChange(criteria, overrideFinal, overrideScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScoreChange = (key: string, val: number) => {
    const rounded = round1(clamp(val, 1.0, 10.0));
    const next = criteria.map((c) => (c.key === key ? { ...c, score: rounded } : c));
    setCriteria(next);
    emitChange(next, overrideFinal, overrideScore);
  };

  const handleAddCustom = () => {
    const name = newCustomName.trim().toUpperCase();
    if (!name) return;
    if (criteria.some((c) => c.label.toUpperCase() === name)) return;

    const newKey = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const next = [
      ...criteria,
      { key: newKey, label: name, score: 8.0, isCustom: true },
    ];
    setCriteria(next);
    setNewCustomName('');
    emitChange(next, overrideFinal, overrideScore);
  };

  const handleRemoveCustom = (key: string) => {
    const next = criteria.filter((c) => c.key !== key);
    setCriteria(next);
    emitChange(next, overrideFinal, overrideScore);
  };

  const handleToggleOverride = (checked: boolean) => {
    const nextScore = checked && overrideScore === null ? currentAverage : overrideScore;
    setOverrideFinal(checked);
    setOverrideScore(nextScore);
    emitChange(criteria, checked, nextScore);
  };

  const handleOverrideScoreChange = (val: number) => {
    const rounded = round1(clamp(val, 1.0, 10.0));
    setOverrideScore(rounded);
    emitChange(criteria, overrideFinal, rounded);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.2rem',
      background: 'transparent',
      border: 'none',
      padding: 0,
    }}>
      {/* Header with Title and Average / Override Score */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '0.6rem',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          fontWeight: 800,
          letterSpacing: '0.04em',
          color: '#ffffff',
          textTransform: 'uppercase',
        }}>
          VALUTAZIONE PARAMETRICA
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              MEDIA:
            </span>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 900,
              color: overrideFinal ? 'rgba(255,255,255,0.45)' : '#ffffff',
              textDecoration: overrideFinal ? 'line-through' : 'none',
            }}>
              {currentAverage.toFixed(1)}
            </span>
          </div>

          {overrideFinal && overrideScore !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingLeft: '0.8rem', borderLeft: '1px solid var(--border-subtle)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#ffffff', fontWeight: 700 }}>
                VOTO:
              </span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                fontWeight: 900,
                color: '#ffffff',
              }}>
                {overrideScore.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Criteria Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {criteria.map((c) => (
          <div
            key={c.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(0.65rem, 2.5vw, 0.75rem)',
              color: '#d4d4d8',
              width: 'clamp(100px, 32vw, 180px)',
              flexShrink: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {c.label}
            </span>

            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.1"
              disabled={disabled}
              value={c.score}
              onChange={(e) => handleScoreChange(c.key, parseFloat(e.target.value))}
              style={{
                flex: 1,
                minWidth: '60px',
                accentColor: '#ffffff',
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.75 : 1,
              }}
            />

            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#ffffff',
              width: '32px',
              textAlign: 'right',
              flexShrink: 0,
            }}>
              {c.score.toFixed(1)}
            </span>

            {c.isCustom && !disabled && (
              <button
                type="button"
                onClick={() => handleRemoveCustom(c.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Custom Criterion */}
      {!disabled && (
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.2rem' }}>
          <input
            type="text"
            value={newCustomName}
            onChange={(e) => setNewCustomName(e.target.value)}
            placeholder="+ AGGIUNGI CRITERIO (es. MONTAGGIO, COLOR GRADING)"
            style={{
              flex: 1,
              background: '#040404',
              border: '1px solid var(--border-subtle)',
              color: '#ffffff',
              padding: '0.45rem 0.8rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="btn-grid"
            style={{ padding: '0.45rem 0.8rem', fontSize: '0.7rem' }}
          >
            <Plus size={12} />
            <span>AGGIUNGI</span>
          </button>
        </div>
      )}

      {/* Bypass Arithmetic Mean / Direct Score Assignment */}
      <div style={{
        marginTop: '0.6rem',
        paddingTop: '0.8rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: disabled ? 'default' : 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.74rem',
            color: overrideFinal ? '#ffffff' : 'rgba(255,255,255,0.6)',
            userSelect: 'none',
            opacity: disabled ? 0.75 : 1,
          }}>
            <input
              type="checkbox"
              disabled={disabled}
              checked={overrideFinal}
              onChange={(e) => handleToggleOverride(e.target.checked)}
              style={{
                accentColor: '#ffffff',
                cursor: disabled ? 'default' : 'pointer',
                width: '14px',
                height: '14px',
              }}
            />
            <span>BYPASSA MEDIA ARITMETICA</span>
          </label>
        </div>

        {overrideFinal && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '0.75rem 1rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}>
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.1"
              disabled={disabled}
              value={overrideScore !== null ? overrideScore : currentAverage}
              onChange={(e) => handleOverrideScoreChange(parseFloat(e.target.value))}
              style={{
                flex: 1,
                accentColor: '#ffffff',
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.75 : 1,
              }}
            />

            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 900,
              color: '#ffffff',
              width: '45px',
              textAlign: 'right',
            }}>
              {(overrideScore !== null ? overrideScore : currentAverage).toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

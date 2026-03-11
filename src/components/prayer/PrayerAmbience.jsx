import './PrayerAmbience.css';

/**
 * Breathing animation and color changes based on emotional context
 * Creates an immersive atmosphere during prayer generation
 * Pure CSS implementation (no framer-motion dependency)
 */
export function PrayerAmbience({ isActive, emotion = 'peace' }) {
  if (!isActive) {
    return null;
  }

  return (
    <div className="prayer-ambience" data-emotion={emotion}>
      {/* Primary breathing circle */}
      <div className="ambience-circle primary" />

      {/* Secondary breathing circle with slight delay */}
      <div className="ambience-circle secondary" />

      {/* Subtle particles for depth */}
      <div className="ambience-particles">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{ animationDelay: `${i * 0.4}s` }}
          />
        ))}
      </div>
    </div>
  );
}

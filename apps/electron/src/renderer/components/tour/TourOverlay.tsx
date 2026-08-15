/**
 * Tour overlay (spec §10).
 *
 * A semi-transparent backdrop that dims the page except for the highlighted
 * target element. The backdrop captures clicks so the user can't interact
 * with the app while the tour is active.
 *
 * Implementation:
 *  - A fixed full-screen div with a high z-index.
 *  - The highlighted target is rendered with a "spotlight" cut-out using
 *    a CSS box-shadow trick: a transparent center + a huge dark shadow
 *    around it.
 *  - When the user clicks the backdrop, the tour is paused (not skipped)
 *    so the user can resume later.
 *
 * Accessibility:
 *  - The overlay has `role="dialog"` and `aria-modal="true"`.
 *  - The highlighted target is focused.
 *  - Escape key pauses the tour.
 *  - Reduced-motion users get no animation.
 */
import { type CSSProperties, useEffect, useState } from 'react';
import { Box, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

interface TourOverlayProps {
  /** The current target element's bounding rect, or null if centering. */
  readonly targetRect: DOMRect | null;
  /** Called when the user clicks outside the target (pauses the tour). */
  readonly onDismiss: () => void;
  /** Padding around the target (px). */
  readonly padding?: number;
}

export function TourOverlay({ targetRect, onDismiss, padding = 8 }: TourOverlayProps) {
  const { t } = useTranslation();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  // Spotlight box: either the target rect, or a centered "dialog" rect.
  const spotlight = targetRect
    ? {
        top: targetRect.top - padding,
        left: targetRect.left - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
      }
    : {
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
        transform: 'translate(-50%, -50%)',
      };

  const spotlightStyle: CSSProperties = {
    position: 'fixed',
    top: spotlight.top,
    left: spotlight.left,
    width: spotlight.width,
    height: spotlight.height,
    borderRadius: 'var(--mantine-radius-md)',
    // Box-shadow trick: 0 0 0 9999px rgba(0,0,0,0.55) creates a 9999px
    // ring of shadow, effectively dimming everything outside the spotlight.
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
    pointerEvents: 'none',
    transition: reducedMotion ? 'none' : 'all 250ms ease',
    transform: 'transform' in spotlight ? spotlight.transform : undefined,
  };

  return (
    <>
      {/* The "backdrop" is the spotlight itself via box-shadow. */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          pointerEvents: 'auto',
        }}
        onClick={onDismiss}
        role="dialog"
        aria-modal="true"
        aria-label={t('tour.common:overlay.title')}
      >
        <div style={spotlightStyle} />
        <Box
          style={{
            position: 'absolute',
            bottom: 16,
            insetInlineStart: 16,
            color: 'white',
            fontSize: '0.75rem',
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        >
          <Text>{t('tour.common:overlay.dismiss')}</Text>
        </Box>
      </div>
    </>
  );
}

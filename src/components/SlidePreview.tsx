import { useEffect, useRef, useState } from 'react';
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '../types';

interface SlidePreviewProps {
  /** Self-contained HTML fragment to render, or null for a placeholder. */
  html: string | null;
  background?: string;
  placeholder?: React.ReactNode;
}

/**
 * Renders a 1280x720 slide fragment scaled down to fit the available width,
 * preserving the 16:9 aspect ratio.
 */
export function SlidePreview({ html, background = '#ffffff', placeholder }: SlidePreviewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      setScale(width / SLIDE_WIDTH);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="slide-frame"
      style={{ aspectRatio: `${SLIDE_WIDTH} / ${SLIDE_HEIGHT}`, background }}
    >
      {html ? (
        <div
          className="slide-canvas"
          style={{
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="slide-placeholder">{placeholder}</div>
      )}
    </div>
  );
}

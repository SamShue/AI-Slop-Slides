import { useState } from 'react';
import type { SlideData } from '../types';
import { useStore } from '../state/store';
import { SlidePreview } from './SlidePreview';

interface SlideCardProps {
  slide: SlideData;
}

const STATUS_LABEL: Record<SlideData['status'], string> = {
  pending: 'Not generated',
  generating: 'Generating…',
  done: 'Ready to review',
  accepted: 'Accepted',
  error: 'Error',
};

export function SlideCard({ slide }: SlideCardProps) {
  const theme = useStore((s) => s.theme);
  const acceptSlide = useStore((s) => s.acceptSlide);
  const regenerateSlide = useStore((s) => s.regenerateSlide);
  const [instruction, setInstruction] = useState('');
  const [showInstruction, setShowInstruction] = useState(false);

  const generating = slide.status === 'generating';

  return (
    <div className={`slide-card status-${slide.status}`}>
      <div className="slide-card-header">
        <span className="slide-number">Slide {slide.index + 1}</span>
        <span className={`status-badge status-${slide.status}`}>
          {STATUS_LABEL[slide.status]}
        </span>
      </div>

      <div className="compare">
        <div className="compare-col">
          <div className="compare-label">Original</div>
          <div className="slide-frame">
            <img src={slide.originalImage} alt={`Original slide ${slide.index + 1}`} />
          </div>
        </div>

        <div className="compare-col">
          <div className="compare-label">Beautified</div>
          <SlidePreview
            html={generating ? null : slide.generatedHtml}
            background={theme.backgroundColor}
            placeholder={
              generating ? (
                <span className="spinner-text">Generating…</span>
              ) : slide.status === 'error' ? (
                <span className="error-text">{slide.error ?? 'Generation failed'}</span>
              ) : (
                <span>Not generated yet</span>
              )
            }
          />
        </div>
      </div>

      {showInstruction && (
        <input
          className="instruction-input"
          placeholder="Optional: guidance for regeneration (e.g. 'add a diagram', 'less text')"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
        />
      )}

      <div className="slide-actions">
        <button
          className="btn primary"
          disabled={!slide.generatedHtml || generating || slide.status === 'accepted'}
          onClick={() => acceptSlide(slide.id)}
        >
          {slide.status === 'accepted' ? 'Accepted ✓' : 'Accept'}
        </button>
        <button
          className="btn"
          disabled={generating}
          onClick={() => regenerateSlide(slide.id, instruction || undefined)}
        >
          {slide.generatedHtml ? 'Regenerate' : 'Generate'}
        </button>
        <button
          className="btn ghost"
          disabled={generating}
          onClick={() => setShowInstruction((v) => !v)}
        >
          {showInstruction ? 'Hide notes' : 'Add notes'}
        </button>
      </div>
    </div>
  );
}

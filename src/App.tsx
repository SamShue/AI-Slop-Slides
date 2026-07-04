import { useState } from 'react';
import { useStore } from './state/store';
import { Settings } from './components/Settings';
import { ThemePanel } from './components/ThemePanel';
import { Uploader } from './components/Uploader';
import { Toolbar } from './components/Toolbar';
import { SlideCard } from './components/SlideCard';

export default function App() {
  const slides = useStore((s) => s.slides);
  const error = useStore((s) => s.error);
  const setError = useStore((s) => s.setError);
  const settings = useStore((s) => s.settings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const hasKey = Boolean(settings.apiKey && settings.model);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="logo">✨</span>
          <div>
            <h1>AI Slop Slides</h1>
            <p>Beautify your class slides with AI</p>
          </div>
        </div>
        <div className="header-actions">
          {!hasKey && (
            <span className="warn-pill" onClick={() => setSettingsOpen(true)}>
              ⚠ Add API key & model
            </span>
          )}
          <button className="btn ghost" onClick={() => setSettingsOpen(true)}>
            ⚙ Settings
          </button>
        </div>
      </header>

      {error && (
        <div className="banner error" role="alert">
          <span>{error}</span>
          <button className="btn ghost icon" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      <main className="app-main">
        <div className="setup-row">
          <ThemePanel />
          <Uploader />
        </div>

        {slides.length > 0 && (
          <>
            <div className="review-header">
              <h2>3 · Review &amp; refine</h2>
            </div>
            <Toolbar />
            <div className="slides-grid">
              {slides.map((slide) => (
                <SlideCard key={slide.id} slide={slide} />
              ))}
            </div>
          </>
        )}
      </main>

      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

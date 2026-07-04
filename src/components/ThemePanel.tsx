import { useState } from 'react';
import { useStore } from '../state/store';
import { generateTheme } from '../lib/theme';
import type { Theme } from '../types';

const SWATCH_FIELDS: Array<{ key: keyof Theme; label: string }> = [
  { key: 'primaryColor', label: 'Primary' },
  { key: 'secondaryColor', label: 'Secondary' },
  { key: 'accentColor', label: 'Accent' },
  { key: 'backgroundColor', label: 'Background' },
  { key: 'textColor', label: 'Text' },
];

export function ThemePanel() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const settings = useStore((s) => s.settings);
  const isGenerating = useStore((s) => s.isGeneratingTheme);
  const setIsGenerating = useStore((s) => s.setIsGeneratingTheme);
  const setError = useStore((s) => s.setError);

  const [prompt, setPrompt] = useState('');
  const [expanded, setExpanded] = useState(false);

  async function onGenerate() {
    if (!settings.apiKey || !settings.model) {
      setError('Add your OpenRouter API key and select a model in Settings first.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const next = await generateTheme({
        apiKey: settings.apiKey,
        model: settings.model,
        prompt: prompt || 'a clean, modern, professional academic presentation',
      });
      setTheme(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  }

  function updateField<K extends keyof Theme>(key: K, value: Theme[K]) {
    setTheme({ ...theme, [key]: value });
  }

  return (
    <section className="panel theme-panel">
      <div className="panel-header">
        <h2>1 · Theme template</h2>
        <button className="btn ghost small" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide details' : 'Customize'}
        </button>
      </div>

      <div className="theme-generate">
        <input
          placeholder="Describe a style — e.g. 'dark, modern, tech startup with teal accents'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onGenerate()}
        />
        <button className="btn primary" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? 'Designing…' : 'Generate theme'}
        </button>
      </div>

      <div className="theme-preview">
        <div className="theme-swatches">
          {SWATCH_FIELDS.map((f) => (
            <div
              key={f.key}
              className="swatch"
              title={`${f.label}: ${theme[f.key] as string}`}
              style={{ background: theme[f.key] as string }}
            />
          ))}
        </div>
        <div className="theme-meta">
          <strong style={{ fontFamily: `'${theme.headingFont}', sans-serif` }}>
            {theme.name}
          </strong>
          <span style={{ fontFamily: `'${theme.bodyFont}', sans-serif` }}>
            {theme.description}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="theme-editor">
          <label className="field">
            <span>Name</span>
            <input value={theme.name} onChange={(e) => updateField('name', e.target.value)} />
          </label>
          <div className="color-grid">
            {SWATCH_FIELDS.map((f) => (
              <label key={f.key} className="color-field">
                <span>{f.label}</span>
                <input
                  type="color"
                  value={theme[f.key] as string}
                  onChange={(e) => updateField(f.key, e.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="font-grid">
            <label className="field">
              <span>Heading font</span>
              <input
                value={theme.headingFont}
                onChange={(e) => updateField('headingFont', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Body font</span>
              <input
                value={theme.bodyFont}
                onChange={(e) => updateField('bodyFont', e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            <span>Style notes</span>
            <textarea
              rows={2}
              value={theme.styleNotes}
              onChange={(e) => updateField('styleNotes', e.target.value)}
            />
          </label>
        </div>
      )}
    </section>
  );
}

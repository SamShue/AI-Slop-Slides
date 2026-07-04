import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import { generateTheme, generateThemeTemplates, ensureTemplates } from '../lib/theme';
import { downloadThemeFile, parseThemeFile } from '../lib/storage';
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
  const savedThemes = useStore((s) => s.savedThemes);
  const saveCurrentTheme = useStore((s) => s.saveCurrentTheme);
  const loadSavedTheme = useStore((s) => s.loadSavedTheme);
  const deleteSavedTheme = useStore((s) => s.deleteSavedTheme);

  const [prompt, setPrompt] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildProgress, setRebuildProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function onRebuildTemplate() {
    if (!settings.apiKey || !settings.model) {
      setError('Add your OpenRouter API key and select a model in Settings first.');
      return;
    }
    setRebuilding(true);
    setRebuildProgress({ done: 0, total: 0 });
    setError(null);
    try {
      const templates = await generateThemeTemplates({
        apiKey: settings.apiKey,
        model: settings.model,
        theme,
        onProgress: (done, total) => setRebuildProgress({ done, total }),
      });
      setTheme({ ...theme, templates, previewImage: templates[0]?.previewImage });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRebuilding(false);
      setRebuildProgress(null);
    }
  }

  function onSave() {
    const name = window.prompt('Save theme as:', theme.name);
    if (name === null) return;
    saveCurrentTheme(name || theme.name);
  }

  function onLoad() {
    if (!selectedId) return;
    loadSavedTheme(selectedId);
  }

  function onDelete() {
    if (!selectedId) return;
    const entry = savedThemes.find((t) => t.id === selectedId);
    if (entry && window.confirm(`Delete saved theme "${entry.theme.name}"?`)) {
      deleteSavedTheme(selectedId);
      setSelectedId('');
    }
  }

  async function onImportFile(file: File) {
    setError(null);
    try {
      const imported = parseThemeFile(await file.text());
      setTheme(imported);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const templates = ensureTemplates(theme);
  const templateCount = templates.length;

  return (
    <section className="panel theme-panel">
      <div className="panel-header">
        <h2>1 · Theme &amp; layouts</h2>
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
        <div className="theme-preview-info">
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
          <button
            className="btn small ghost rebuild-btn"
            onClick={onRebuildTemplate}
            disabled={rebuilding || isGenerating}
          >
            {rebuilding
              ? rebuildProgress && rebuildProgress.total
                ? `Building layouts ${rebuildProgress.done}/${rebuildProgress.total}…`
                : 'Building layouts…'
              : templateCount
                ? 'Rebuild layouts'
                : 'Build layouts'}
          </button>
        </div>
      </div>

      <div className="theme-templates">
        <div className="theme-templates-label">
          {templateCount
            ? `${templateCount} layout${templateCount > 1 ? 's' : ''} — slides rotate through these for variety`
            : rebuilding
              ? 'Generating layouts…'
              : 'No layouts yet — generate a theme or build layouts'}
        </div>
        {templateCount > 0 && (
          <div className="theme-template-grid">
            {templates.map((t) => (
              <div className="theme-template-item" key={t.id} title={t.label}>
                <div className="theme-template-thumb">
                  {t.previewImage ? (
                    <img src={t.previewImage} alt={`${t.label} layout`} />
                  ) : (
                    <div className="theme-template-empty">{t.label}</div>
                  )}
                </div>
                <span className="theme-template-name">{t.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="theme-library">
        <select
          className="theme-library-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">
            {savedThemes.length ? 'Saved themes…' : 'No saved themes yet'}
          </option>
          {savedThemes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.theme.name}
            </option>
          ))}
        </select>
        <button className="btn small" onClick={onLoad} disabled={!selectedId}>
          Load
        </button>
        <button className="btn small ghost" onClick={onDelete} disabled={!selectedId}>
          Delete
        </button>
        <span className="theme-library-spacer" />
        <button className="btn small primary" onClick={onSave}>
          Save
        </button>
        <button className="btn small ghost" onClick={() => downloadThemeFile(theme)}>
          Export
        </button>
        <button className="btn small ghost" onClick={() => fileInputRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onImportFile(file);
            e.target.value = '';
          }}
        />
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

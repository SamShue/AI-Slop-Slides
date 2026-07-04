import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { fetchModels } from '../lib/openrouter';
import { formatUsd } from '../lib/cost';
import type { Settings as SettingsType } from '../types';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export function Settings({ open, onClose }: SettingsProps) {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const models = useStore((s) => s.models);
  const setModels = useStore((s) => s.setModels);

  const [draft, setDraft] = useState<SettingsType>(settings);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  async function loadModels() {
    setLoadingModels(true);
    setModelError(null);
    try {
      const list = await fetchModels(draft.apiKey);
      setModels(list);
    } catch (err) {
      setModelError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingModels(false);
    }
  }

  // Auto-load models the first time the panel opens with a key present.
  useEffect(() => {
    if (open && models.length === 0 && draft.apiKey) {
      void loadModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const filtered = filter
    ? models.filter(
        (m) =>
          m.name.toLowerCase().includes(filter.toLowerCase()) ||
          m.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : models;

  const selected = models.find((m) => m.id === draft.model);
  // Price per 1M tokens is the common unit shown on OpenRouter.
  const promptPer1M = selected ? selected.pricing.prompt * 1_000_000 : 0;
  const completionPer1M = selected ? selected.pricing.completion * 1_000_000 : 0;
  const imagePrice = selected?.pricing.image ?? 0;
  const isFree = selected && promptPer1M === 0 && completionPer1M === 0 && imagePrice === 0;

  function save() {
    setSettings(draft);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="btn ghost icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <label className="field">
          <span>OpenRouter API Key</span>
          <input
            type="password"
            placeholder="sk-or-…"
            value={draft.apiKey}
            onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
          />
          <small>
            Stored locally in your browser. Get a key at{' '}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">
              openrouter.ai/keys
            </a>
            .
          </small>
        </label>

        <div className="field">
          <span>Model</span>
          <div className="model-row">
            <input
              className="model-filter"
              placeholder="Filter models…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <button className="btn" onClick={loadModels} disabled={loadingModels || !draft.apiKey}>
              {loadingModels ? 'Loading…' : 'Refresh models'}
            </button>
          </div>
          <select
            value={draft.model}
            onChange={(e) => setDraft({ ...draft, model: e.target.value })}
            size={8}
            className="model-select"
          >
            {draft.model && !models.some((m) => m.id === draft.model) && (
              <option value={draft.model}>{draft.model} (current)</option>
            )}
            {filtered.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.inputModalities.includes('image') ? '  · vision' : ''}
              </option>
            ))}
          </select>
          {modelError && <small className="error-text">{modelError}</small>}
          {selected && (
            <div className="model-pricing">
              {isFree ? (
                <span className="pricing-free">Free model — no per-token charge.</span>
              ) : (
                <>
                  <span>
                    Input <strong>{formatUsd(promptPer1M)}</strong> / 1M tok
                  </span>
                  <span className="dot">·</span>
                  <span>
                    Output <strong>{formatUsd(completionPer1M)}</strong> / 1M tok
                  </span>
                  {imagePrice > 0 && (
                    <>
                      <span className="dot">·</span>
                      <span>
                        Image <strong>{formatUsd(imagePrice)}</strong> ea
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          )}
          <small>
            Vision-capable models produce the best redesigns because they can see the
            original slide layout. Cheaper models cut cost on large decks; the estimated
            deck cost is shown on the toolbar before you generate.
          </small>
        </div>

        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

import { create } from 'zustand';
import type { Settings, SlideData, Theme, OpenRouterModel, SavedTheme, Usage } from '../types';
import {
  loadSettings,
  saveSettings,
  loadStoredThemeJson,
  saveStoredThemeJson,
  loadThemeLibrary,
  saveThemeLibrary,
} from '../lib/storage';
import { defaultTheme, applyThemeFonts, ensureTemplates } from '../lib/theme';
import { generateSlide } from '../lib/slides';
import type { ThemeTemplate } from '../types';

/**
 * Choose a layout template for a slide based on its position, so the deck gets
 * variety: the first slide prefers the cover layout, the rest rotate through the
 * remaining content layouts.
 */
function pickTemplateForSlide(
  templates: ThemeTemplate[],
  index: number,
): ThemeTemplate | undefined {
  if (!templates.length) return undefined;
  if (index === 0) {
    return templates.find((t) => t.id === 'cover') ?? templates[0];
  }
  const content = templates.filter((t) => t.id !== 'cover');
  const pool = content.length ? content : templates;
  return pool[(index - 1) % pool.length];
}

/** Resolve the template a slide should use: explicit override, else by position. */
function templateForSlide(
  theme: { templates?: ThemeTemplate[]; templateHtml?: string; previewImage?: string; backgroundColor: string },
  slide: { index: number; templateId?: string },
): ThemeTemplate | undefined {
  const templates = ensureTemplates(theme as never);
  if (slide.templateId) {
    const match = templates.find((t) => t.id === slide.templateId);
    if (match) return match;
  }
  return pickTemplateForSlide(templates, slide.index);
}

function loadInitialTheme(): Theme {
  const raw = loadStoredThemeJson();
  if (raw) {
    try {
      const theme = JSON.parse(raw) as Theme;
      applyThemeFonts(theme);
      return theme;
    } catch {
      /* ignore */
    }
  }
  const t = defaultTheme();
  applyThemeFonts(t);
  return t;
}

/** Simple concurrency-limited task runner. */
async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const runners: Promise<void>[] = [];
  for (let i = 0; i < Math.min(limit, queue.length); i++) {
    runners.push(
      (async () => {
        while (queue.length) {
          const item = queue.shift();
          if (item === undefined) break;
          await worker(item);
        }
      })(),
    );
  }
  await Promise.all(runners);
}

interface AppState {
  settings: Settings;
  models: OpenRouterModel[];
  modelSupportsVision: boolean;
  theme: Theme;
  savedThemes: SavedTheme[];
  slides: SlideData[];
  isGeneratingTheme: boolean;
  busy: boolean;
  exportProgress: { done: number; total: number } | null;
  error: string | null;
  /** Actual USD spent this session, from OpenRouter-reported usage. */
  spentUsd: number;
  /** Number of completions whose usage contributed to spentUsd. */
  billedRequests: number;

  setSettings: (settings: Settings) => void;
  setModels: (models: OpenRouterModel[]) => void;
  setTheme: (theme: Theme) => void;
  setSlides: (slides: SlideData[]) => void;
  setIsGeneratingTheme: (v: boolean) => void;
  setBusy: (v: boolean) => void;
  setExportProgress: (p: { done: number; total: number } | null) => void;
  setError: (e: string | null) => void;

  saveCurrentTheme: (name?: string) => void;
  loadSavedTheme: (id: string) => void;
  deleteSavedTheme: (id: string) => void;

  updateSlide: (id: string, patch: Partial<SlideData>) => void;
  acceptSlide: (id: string) => void;
  setSlideTemplate: (id: string, templateId: string) => void;
  regenerateSlide: (id: string, instruction?: string) => Promise<void>;
  generateAll: () => Promise<void>;
  acceptAll: () => void;
  addUsage: (usage: Usage) => void;
  resetSpend: () => void;
  reset: () => void;
}

function modelSupportsVision(models: OpenRouterModel[], modelId: string): boolean {
  const m = models.find((x) => x.id === modelId);
  if (!m) return true; // assume vision-capable until we know otherwise
  return m.inputModalities.includes('image');
}

export const useStore = create<AppState>((set, get) => ({
  settings: loadSettings(),
  models: [],
  modelSupportsVision: true,
  theme: loadInitialTheme(),
  savedThemes: loadThemeLibrary(),
  slides: [],
  isGeneratingTheme: false,
  busy: false,
  exportProgress: null,
  error: null,
  spentUsd: 0,
  billedRequests: 0,

  setSettings: (settings) => {
    saveSettings(settings);
    set({
      settings,
      modelSupportsVision: modelSupportsVision(get().models, settings.model),
    });
  },
  setModels: (models) =>
    set((s) => ({
      models,
      modelSupportsVision: modelSupportsVision(models, s.settings.model),
    })),
  setTheme: (theme) => {
    applyThemeFonts(theme);
    saveStoredThemeJson(JSON.stringify(theme));
    set({ theme });
  },
  setSlides: (slides) => set({ slides }),
  setIsGeneratingTheme: (v) => set({ isGeneratingTheme: v }),
  setBusy: (v) => set({ busy: v }),
  setExportProgress: (p) => set({ exportProgress: p }),
  setError: (e) => set({ error: e }),

  saveCurrentTheme: (name) => {
    const current = get().theme;
    const theme: Theme = name?.trim() ? { ...current, name: name.trim() } : current;
    const entry: SavedTheme = {
      id: crypto.randomUUID(),
      savedAt: Date.now(),
      theme,
    };
    // Replace an existing saved theme with the same name, otherwise prepend.
    const existing = get().savedThemes.filter(
      (t) => t.theme.name.toLowerCase() !== theme.name.toLowerCase(),
    );
    const library = [entry, ...existing];
    saveThemeLibrary(library);
    set({ savedThemes: library, theme });
  },

  loadSavedTheme: (id) => {
    const found = get().savedThemes.find((t) => t.id === id);
    if (!found) return;
    const theme = found.theme;
    applyThemeFonts(theme);
    saveStoredThemeJson(JSON.stringify(theme));
    set({ theme });
  },

  deleteSavedTheme: (id) => {
    const library = get().savedThemes.filter((t) => t.id !== id);
    saveThemeLibrary(library);
    set({ savedThemes: library });
  },

  updateSlide: (id, patch) =>
    set((s) => ({
      slides: s.slides.map((sl) => (sl.id === id ? { ...sl, ...patch } : sl)),
    })),

  acceptSlide: (id) =>
    set((s) => ({
      slides: s.slides.map((sl) =>
        sl.id === id && sl.generatedHtml ? { ...sl, status: 'accepted' } : sl,
      ),
    })),

  setSlideTemplate: (id, templateId) =>
    set((s) => ({
      slides: s.slides.map((sl) => (sl.id === id ? { ...sl, templateId } : sl)),
    })),

  regenerateSlide: async (id, instruction) => {
    const { settings, theme, slides, modelSupportsVision: vision } = get();
    const slide = slides.find((s) => s.id === id);
    if (!slide) return;
    get().updateSlide(id, { status: 'generating', error: undefined });
    try {
      const html = await generateSlide({
        apiKey: settings.apiKey,
        model: settings.model,
        theme,
        template: templateForSlide(theme, slide),
        originalText: slide.originalText,
        originalImage: slide.originalImage,
        useVision: vision,
        instruction,
        onUsage: (u) => get().addUsage(u),
      });
      get().updateSlide(id, { generatedHtml: html, status: 'done' });
    } catch (err) {
      get().updateSlide(id, {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  generateAll: async () => {
    const { settings, theme, slides, modelSupportsVision: vision } = get();
    if (!settings.apiKey || !settings.model) {
      set({ error: 'Add your OpenRouter API key and select a model in Settings first.' });
      return;
    }
    set({ busy: true, error: null });
    // Mark all non-accepted slides as generating.
    set((s) => ({
      slides: s.slides.map((sl) =>
        sl.status === 'accepted' ? sl : { ...sl, status: 'generating', error: undefined },
      ),
    }));

    const targets = slides.filter((s) => s.status !== 'accepted');
    try {
      await runPool(targets, 3, async (slide) => {
        try {
          const html = await generateSlide({
            apiKey: settings.apiKey,
            model: settings.model,
            theme,
            template: templateForSlide(theme, slide),
            originalText: slide.originalText,
            originalImage: slide.originalImage,
            useVision: vision,
            onUsage: (u) => get().addUsage(u),
          });
          get().updateSlide(slide.id, { generatedHtml: html, status: 'done' });
        } catch (err) {
          get().updateSlide(slide.id, {
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
    } finally {
      set({ busy: false });
    }
  },

  acceptAll: () =>
    set((s) => ({
      slides: s.slides.map((sl) =>
        sl.generatedHtml ? { ...sl, status: 'accepted' } : sl,
      ),
    })),

  addUsage: (usage) =>
    set((s) => ({
      spentUsd: s.spentUsd + (usage.costUsd || 0),
      billedRequests: s.billedRequests + 1,
    })),

  resetSpend: () => set({ spentUsd: 0, billedRequests: 0 }),

  reset: () => set({ slides: [], error: null, exportProgress: null }),
}));

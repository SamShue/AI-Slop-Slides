import type { Settings, SavedTheme, Theme } from '../types';

const SETTINGS_KEY = 'ai-slop-slides:settings';
const THEME_KEY = 'ai-slop-slides:theme';
const THEME_LIBRARY_KEY = 'ai-slop-slides:theme-library';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return {
        apiKey: parsed.apiKey ?? '',
        model: parsed.model ?? '',
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { apiKey: '', model: '' };
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadStoredThemeJson(): string | null {
  return localStorage.getItem(THEME_KEY);
}

export function saveStoredThemeJson(json: string): void {
  localStorage.setItem(THEME_KEY, json);
}

/** Load the user's library of saved themes, newest first. */
export function loadThemeLibrary(): SavedTheme[] {
  try {
    const raw = localStorage.getItem(THEME_LIBRARY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedTheme[];
      if (Array.isArray(parsed)) {
        return parsed
          .filter((t) => t && t.theme && typeof t.id === 'string')
          .sort((a, b) => b.savedAt - a.savedAt);
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return [];
}

export function saveThemeLibrary(library: SavedTheme[]): void {
  localStorage.setItem(THEME_LIBRARY_KEY, JSON.stringify(library));
}

/** Trigger a browser download of a theme as a JSON file. */
export function downloadThemeFile(theme: Theme): void {
  const safeName = theme.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'theme';
  const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.theme.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Parse and validate a theme from an uploaded JSON file's text. */
export function parseThemeFile(text: string): Theme {
  const raw = JSON.parse(text) as Partial<Theme>;
  const required: Array<keyof Theme> = [
    'name',
    'primaryColor',
    'secondaryColor',
    'accentColor',
    'backgroundColor',
    'textColor',
    'headingFont',
    'bodyFont',
  ];
  for (const key of required) {
    if (typeof raw[key] !== 'string') {
      throw new Error(`Invalid theme file: missing "${key}".`);
    }
  }
  return {
    name: raw.name!,
    description: raw.description ?? '',
    primaryColor: raw.primaryColor!,
    secondaryColor: raw.secondaryColor!,
    accentColor: raw.accentColor!,
    backgroundColor: raw.backgroundColor!,
    textColor: raw.textColor!,
    headingFont: raw.headingFont!,
    bodyFont: raw.bodyFont!,
    styleNotes: raw.styleNotes ?? '',
    templates: raw.templates,
    templateHtml: raw.templateHtml,
    previewImage: raw.previewImage,
  };
}

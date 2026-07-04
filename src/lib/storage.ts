import type { Settings } from '../types';

const SETTINGS_KEY = 'ai-slop-slides:settings';
const THEME_KEY = 'ai-slop-slides:theme';

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

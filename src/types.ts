export interface Theme {
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  /** Optional extra guidance describing the visual style (shadows, shapes, mood). */
  styleNotes: string;
  /**
   * A set of distinct layout templates that all share this theme's visual
   * system (colors, fonts, motifs) but differ in structure — e.g. title,
   * bulleted content, two-column, big statement, quote. Slides are assigned
   * different layouts to give the deck variety while staying cohesive.
   */
  templates?: ThemeTemplate[];
  /**
   * @deprecated Legacy single reference slide. Kept so older saved themes still
   * load; migrated into `templates` on use.
   */
  templateHtml?: string;
  /** A rendered thumbnail (PNG data URL) used in the theme library. */
  previewImage?: string;
}

/** One layout variant within a theme. */
export interface ThemeTemplate {
  /** Stable id/key for the layout (e.g. "cover", "bulleted"). */
  id: string;
  /** Human-readable label shown in the UI (e.g. "Title", "Bulleted content"). */
  label: string;
  /** Self-contained 1280x720 HTML fragment demonstrating the layout. */
  html: string;
  /** Rendered thumbnail (PNG data URL) of `html`. */
  previewImage?: string;
}

/** A theme stored in the user's saved-theme library. */
export interface SavedTheme {
  id: string;
  /** Millisecond timestamp of when it was saved. */
  savedAt: number;
  theme: Theme;
}

export type SlideStatus =
  | 'pending'
  | 'generating'
  | 'done'
  | 'accepted'
  | 'error';

export interface SlideData {
  id: string;
  index: number;
  /** Original slide rendered to a PNG data URL. */
  originalImage: string;
  /** Text extracted from the original slide. */
  originalText: string;
  /** AI-redesigned slide as a self-contained HTML fragment. */
  generatedHtml: string | null;
  status: SlideStatus;
  error?: string;
  /** Id of the theme layout template assigned to this slide, if any. */
  templateId?: string;
}

export interface Settings {
  apiKey: string;
  model: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  /** Modalities the model accepts, e.g. ["text", "image"]. */
  inputModalities: string[];
  /** Per-unit USD pricing from OpenRouter (strings converted to numbers). */
  pricing: ModelPricing;
}

/** USD pricing for a model. Token prices are per-token; image is per-image. */
export interface ModelPricing {
  /** USD per input (prompt) token. */
  prompt: number;
  /** USD per output (completion) token. */
  completion: number;
  /** USD per input image, if the model prices images separately. */
  image: number;
  /** Flat USD charged per request, if any. */
  request: number;
}

/** Token/cost usage reported by a single completion. */
export interface Usage {
  promptTokens: number;
  completionTokens: number;
  /** Actual USD cost reported by OpenRouter, when available. */
  costUsd: number;
}

/** Standard 16:9 slide dimensions used for rendering and export. */
export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

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
}

/** Standard 16:9 slide dimensions used for rendering and export. */
export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

import type { Theme } from '../types';
import { chat } from './openrouter';
import { loadGoogleFont } from './fonts';

const DEFAULT_THEME: Theme = {
  name: 'Clean Academic',
  description: 'A clean, modern academic look with strong hierarchy.',
  primaryColor: '#1e3a8a',
  secondaryColor: '#2563eb',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  headingFont: 'Poppins',
  bodyFont: 'Inter',
  styleNotes:
    'Generous whitespace, clear headings, subtle accent underlines, minimal flat design.',
};

export function defaultTheme(): Theme {
  return { ...DEFAULT_THEME };
}

/** Extract the first JSON object found in a model response. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response.');
  return candidate.slice(start, end + 1);
}

function coerceTheme(raw: unknown): Theme {
  const t = raw as Partial<Theme>;
  return {
    name: t.name || DEFAULT_THEME.name,
    description: t.description || DEFAULT_THEME.description,
    primaryColor: t.primaryColor || DEFAULT_THEME.primaryColor,
    secondaryColor: t.secondaryColor || DEFAULT_THEME.secondaryColor,
    accentColor: t.accentColor || DEFAULT_THEME.accentColor,
    backgroundColor: t.backgroundColor || DEFAULT_THEME.backgroundColor,
    textColor: t.textColor || DEFAULT_THEME.textColor,
    headingFont: t.headingFont || DEFAULT_THEME.headingFont,
    bodyFont: t.bodyFont || DEFAULT_THEME.bodyFont,
    styleNotes: t.styleNotes || DEFAULT_THEME.styleNotes,
  };
}

/** Ensure the theme's fonts are available in the document. */
export function applyThemeFonts(theme: Theme): void {
  loadGoogleFont(theme.headingFont);
  loadGoogleFont(theme.bodyFont);
}

export interface GenerateThemeArgs {
  apiKey: string;
  model: string;
  prompt: string;
  signal?: AbortSignal;
}

/** Ask the model to design a slide theme from a natural-language prompt. */
export async function generateTheme(args: GenerateThemeArgs): Promise<Theme> {
  const { apiKey, model, prompt, signal } = args;
  const system = `You are a senior presentation designer. Design a cohesive slide theme.
Respond with ONLY a JSON object (no prose, no markdown) matching this TypeScript type:
{
  "name": string,
  "description": string,
  "primaryColor": string,   // hex, main brand color
  "secondaryColor": string, // hex, supporting color
  "accentColor": string,    // hex, highlight color
  "backgroundColor": string,// hex, slide background
  "textColor": string,      // hex, body text on background
  "headingFont": string,    // a real Google Fonts family name
  "bodyFont": string,       // a real Google Fonts family name
  "styleNotes": string      // short description of visual style, shapes, mood
}
Ensure strong contrast between textColor and backgroundColor. Use real Google Fonts.`;

  const user = `Design a slide theme for: ${prompt}`;

  const response = await chat({
    apiKey,
    model,
    temperature: 0.8,
    signal,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const theme = coerceTheme(JSON.parse(extractJson(response)));
  applyThemeFonts(theme);
  return theme;
}

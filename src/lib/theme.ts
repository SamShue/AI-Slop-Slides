import type { Theme } from '../types';
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '../types';
import { chat } from './openrouter';
import { loadGoogleFont } from './fonts';
import { renderHtmlToPng } from './render';

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

/** Strip markdown code fences and isolate an HTML fragment from a response. */
function extractHtmlFragment(text: string): string {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  let html = (fenced ? fenced[1] : text).trim();
  const firstTag = html.indexOf('<');
  if (firstTag > 0) html = html.slice(firstTag);
  return html.trim();
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

/**
 * Ask the model to build a concrete reference slide that demonstrates the
 * theme's visual system. This template is stored on the theme and used as the
 * authoritative layout every slide must match, keeping reused themes visually
 * consistent.
 */
export async function generateTemplateHtml(args: {
  apiKey: string;
  model: string;
  theme: Theme;
  signal?: AbortSignal;
}): Promise<string> {
  const { apiKey, model, theme, signal } = args;
  applyThemeFonts(theme);

  const system = `You are an expert presentation designer. Build ONE reusable master slide that DEFINES a theme's visual system. Later slides will be generated to match this template exactly, so it must clearly establish every reusable element.

THEME "${theme.name}" — ${theme.description}
Colors: primary=${theme.primaryColor}, secondary=${theme.secondaryColor}, accent=${theme.accentColor}, background=${theme.backgroundColor}, text=${theme.textColor}
Fonts: headings="${theme.headingFont}", body="${theme.bodyFont}"
Style: ${theme.styleNotes}

The template must visibly establish: the background treatment, a title/header area, a body area with a sample bulleted list, an accent/callout element, decorative shapes, and a footer with a slide-number position.

OUTPUT RULES — follow exactly:
- Output ONLY a single self-contained HTML fragment. No markdown, no explanations, no <html>/<head>/<body> tags.
- The root MUST be one <div> sized exactly ${SLIDE_WIDTH}px by ${SLIDE_HEIGHT}px:
  <div style="width:${SLIDE_WIDTH}px;height:${SLIDE_HEIGHT}px;box-sizing:border-box;position:relative;overflow:hidden;...">
- Use INLINE styles ONLY (no <style>, no classes, no external CSS, no <script>).
- Use font-family: '${theme.headingFont}', sans-serif for headings and '${theme.bodyFont}', sans-serif for body.
- Do NOT use external images or background-image urls. You may use inline SVG and CSS shapes/gradients for decoration.
- Use representative placeholder text (e.g. a sample title and three bullet points). High contrast, nothing clipped.`;

  const response = await chat({
    apiKey,
    model,
    temperature: 0.7,
    signal,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: 'Create the master template slide now. Return only the HTML fragment.' },
    ],
  });

  return extractHtmlFragment(response);
}

/** Render a theme's template to a thumbnail PNG data URL for the library. */
export async function renderThemePreview(theme: Theme): Promise<string | undefined> {
  if (!theme.templateHtml) return undefined;
  try {
    // Half scale keeps the data URL small enough for localStorage.
    return await renderHtmlToPng(theme.templateHtml, theme.backgroundColor, 0.5);
  } catch {
    return undefined;
  }
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

  // Build the concrete visual template so the theme is reproducible, then
  // render a preview thumbnail for the library.
  theme.templateHtml = await generateTemplateHtml({ apiKey, model, theme, signal });
  theme.previewImage = await renderThemePreview(theme);

  return theme;
}


import type { Theme, ThemeTemplate } from '../types';
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
 * The set of distinct slide layouts generated for each theme. They all share
 * the theme's visual system but differ in structure, giving a deck variety.
 */
export interface LayoutBrief {
  id: string;
  label: string;
  brief: string;
}

export const LAYOUT_BRIEFS: LayoutBrief[] = [
  {
    id: 'cover',
    label: 'Title / cover',
    brief:
      'A title/cover slide: a large prominent title with a subtitle and minimal supporting text. Bold, spacious, strong focal point. No bullet list.',
  },
  {
    id: 'bulleted',
    label: 'Bulleted content',
    brief:
      'A standard content slide: a section heading at top and a vertical list of 3–5 bullet points with clear spacing and readable body text.',
  },
  {
    id: 'twoColumn',
    label: 'Two-column',
    brief:
      'A two-column slide: a heading on top, then two side-by-side content areas (e.g. text + supporting panel, or two grouped lists / cards).',
  },
  {
    id: 'statement',
    label: 'Big statement',
    brief:
      'A key-takeaway slide: one short, bold statement or a large highlighted statistic centered as the focal point, with small supporting text. No bullet list.',
  },
  {
    id: 'quote',
    label: 'Quote',
    brief:
      'A pull-quote slide: a large stylized quotation with an attribution line and an accent decorative element.',
  },
  {
    id: 'comparison',
    label: 'Comparison',
    brief:
      'A comparison slide: a heading with two contrasting sides (e.g. before/after, pros/cons) shown as side-by-side cards or a simple compact table.',
  },
];

function templateSystemPrompt(theme: Theme, brief: LayoutBrief, siblings: string[]): string {
  const varietyNote = siblings.length
    ? `\nThis is the "${brief.label}" layout in a family that also includes: ${siblings.join(', ')}. Make THIS layout structurally DISTINCT from those while sharing the same colors, fonts, and decorative motifs.`
    : '';
  return `You are an expert presentation designer. Build ONE reusable slide LAYOUT that belongs to a theme's visual system. Slides using this layout will copy its structure, so establish it clearly.

THEME "${theme.name}" — ${theme.description}
Colors: primary=${theme.primaryColor}, secondary=${theme.secondaryColor}, accent=${theme.accentColor}, background=${theme.backgroundColor}, text=${theme.textColor}
Fonts: headings="${theme.headingFont}", body="${theme.bodyFont}"
Style: ${theme.styleNotes}

LAYOUT TO BUILD — "${brief.label}": ${brief.brief}${varietyNote}

OUTPUT RULES — follow exactly:
- Output ONLY a single self-contained HTML fragment. No markdown, no explanations, no <html>/<head>/<body> tags.
- The root MUST be one <div> sized exactly ${SLIDE_WIDTH}px by ${SLIDE_HEIGHT}px:
  <div style="width:${SLIDE_WIDTH}px;height:${SLIDE_HEIGHT}px;box-sizing:border-box;position:relative;overflow:hidden;...">
- Use INLINE styles ONLY (no <style>, no classes, no external CSS, no <script>).
- Use font-family: '${theme.headingFont}', sans-serif for headings and '${theme.bodyFont}', sans-serif for body.
- Keep the SAME background treatment, accent colors, decorative motifs and footer/slide-number style as the rest of the theme, but arrange the content per this layout.
- Do NOT use external images or background-image urls. You may use inline SVG and CSS shapes/gradients for decoration.
- Use representative placeholder text appropriate to this layout. High contrast, nothing clipped.`;
}

/** Generate a single layout template's HTML for a theme. */
async function generateOneTemplate(args: {
  apiKey: string;
  model: string;
  theme: Theme;
  brief: LayoutBrief;
  siblingLabels: string[];
  signal?: AbortSignal;
}): Promise<string> {
  const { apiKey, model, theme, brief, siblingLabels, signal } = args;
  const response = await chat({
    apiKey,
    model,
    temperature: 0.8,
    signal,
    messages: [
      { role: 'system', content: templateSystemPrompt(theme, brief, siblingLabels) },
      {
        role: 'user',
        content: `Create the "${brief.label}" layout slide now. Return only the HTML fragment.`,
      },
    ],
  });
  return extractHtmlFragment(response);
}

export interface GenerateTemplatesArgs {
  apiKey: string;
  model: string;
  theme: Theme;
  /** Which layout ids to build. Defaults to all LAYOUT_BRIEFS. */
  layoutIds?: string[];
  signal?: AbortSignal;
  /** Progress callback (completed, total). */
  onProgress?: (done: number, total: number) => void;
}

/**
 * Build the full set of distinct layout templates for a theme, each rendered to
 * a preview thumbnail. This is what gives generated decks visual variety.
 */
export async function generateThemeTemplates(
  args: GenerateTemplatesArgs,
): Promise<ThemeTemplate[]> {
  const { apiKey, model, theme, layoutIds, signal, onProgress } = args;
  applyThemeFonts(theme);

  const briefs = layoutIds
    ? LAYOUT_BRIEFS.filter((b) => layoutIds.includes(b.id))
    : LAYOUT_BRIEFS;
  const total = briefs.length;
  const templates: ThemeTemplate[] = [];

  // Generated sequentially so each layout can be told what its siblings are and
  // deliberately differ from them.
  for (const brief of briefs) {
    const html = await generateOneTemplate({
      apiKey,
      model,
      theme,
      brief,
      siblingLabels: briefs.filter((b) => b.id !== brief.id).map((b) => b.label),
      signal,
    });
    const previewImage = await renderTemplatePreview(theme, html);
    templates.push({ id: brief.id, label: brief.label, html, previewImage });
    onProgress?.(templates.length, total);
  }

  return templates;
}

/** Render a template's HTML to a thumbnail PNG data URL for the library. */
export async function renderTemplatePreview(
  theme: Theme,
  html: string,
): Promise<string | undefined> {
  try {
    // Half scale keeps the data URL small enough for localStorage.
    return await renderHtmlToPng(html, theme.backgroundColor, 0.5);
  } catch {
    return undefined;
  }
}

/**
 * Return a theme's layout templates, migrating a legacy single-template theme
 * into a one-element array so older saved themes keep working.
 */
export function ensureTemplates(theme: Theme): ThemeTemplate[] {
  if (theme.templates && theme.templates.length) return theme.templates;
  if (theme.templateHtml) {
    return [
      {
        id: 'master',
        label: 'Master',
        html: theme.templateHtml,
        previewImage: theme.previewImage,
      },
    ];
  }
  return [];
}

/** Render a theme's library thumbnail from its first template. */
export async function renderThemePreview(theme: Theme): Promise<string | undefined> {
  const templates = ensureTemplates(theme);
  if (!templates.length) return undefined;
  if (templates[0].previewImage) return templates[0].previewImage;
  return renderTemplatePreview(theme, templates[0].html);
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

  // Build the family of distinct layout templates that give decks variety,
  // then set the library thumbnail from the first one.
  theme.templates = await generateThemeTemplates({ apiKey, model, theme, signal });
  theme.previewImage = theme.templates[0]?.previewImage;
  // Drop the legacy single-template field now that we have a family.
  delete theme.templateHtml;

  return theme;
}



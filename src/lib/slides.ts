import type { Theme } from '../types';
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '../types';
import { chat } from './openrouter';
import type { ChatMessage } from './openrouter';
import { applyThemeFonts } from './theme';

/** Strip markdown code fences and isolate the HTML fragment. */
export function extractHtml(text: string): string {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  let html = (fenced ? fenced[1] : text).trim();
  // Keep from the first tag onward if the model added a prose preamble.
  const firstTag = html.indexOf('<');
  if (firstTag > 0) html = html.slice(firstTag);
  return html.trim();
}

function themeContext(theme: Theme): string {
  return `THEME "${theme.name}" — ${theme.description}
Colors: primary=${theme.primaryColor}, secondary=${theme.secondaryColor}, accent=${theme.accentColor}, background=${theme.backgroundColor}, text=${theme.textColor}
Fonts: headings="${theme.headingFont}", body="${theme.bodyFont}"
Style: ${theme.styleNotes}`;
}

function buildSystemPrompt(theme: Theme): string {
  return `You are an expert presentation designer that redesigns slides into clean, beautiful, professional layouts.

${themeContext(theme)}

OUTPUT RULES — follow exactly:
- Output ONLY a single self-contained HTML fragment. No markdown, no explanations, no <html>/<head>/<body> tags.
- The root MUST be one <div> sized exactly ${SLIDE_WIDTH}px by ${SLIDE_HEIGHT}px:
  <div style="width:${SLIDE_WIDTH}px;height:${SLIDE_HEIGHT}px;box-sizing:border-box;position:relative;overflow:hidden;...">
- Use INLINE styles ONLY on every element (no <style> tag, no classes, no external CSS, no <script>).
- Use the theme colors and fonts. Reference fonts via font-family: '${theme.headingFont}', sans-serif for headings and '${theme.bodyFont}', sans-serif for body.
- Do NOT use external images, background-image urls, or icon fonts. You may use inline SVG and CSS shapes/gradients for decoration.
- Preserve ALL meaningful text/content from the original slide. Improve wording lightly for clarity, but never invent facts, data, or citations.
- Improve visual hierarchy, spacing, alignment, and readability. Use bullet lists, columns, cards, callouts, or simple tables where appropriate.
- Ensure high contrast and that no content is clipped within the ${SLIDE_WIDTH}x${SLIDE_HEIGHT} bounds.`;
}

export interface GenerateSlideArgs {
  apiKey: string;
  model: string;
  theme: Theme;
  originalText: string;
  originalImage: string;
  /** Whether to attach the slide image (requires a vision-capable model). */
  useVision: boolean;
  /** Optional user guidance for a regeneration. */
  instruction?: string;
  signal?: AbortSignal;
}

/** Redesign a single slide, returning a self-contained HTML fragment. */
export async function generateSlide(args: GenerateSlideArgs): Promise<string> {
  const {
    apiKey,
    model,
    theme,
    originalText,
    originalImage,
    useVision,
    instruction,
    signal,
  } = args;

  applyThemeFonts(theme);

  const guidance = instruction?.trim()
    ? `\n\nADDITIONAL INSTRUCTIONS FROM USER: ${instruction.trim()}`
    : '';

  const userText = `Redesign this slide using the theme.

ORIGINAL SLIDE TEXT:
"""
${originalText || '(no extractable text — infer content from the image)'}
"""${guidance}

Return only the HTML fragment.`;

  const userMessage: ChatMessage = useVision
    ? {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: originalImage } },
        ],
      }
    : { role: 'user', content: userText };

  const response = await chat({
    apiKey,
    model,
    temperature: 0.7,
    signal,
    messages: [
      { role: 'system', content: buildSystemPrompt(theme) },
      userMessage,
    ],
  });

  return extractHtml(response);
}

import type { OpenRouterModel, SlideData, Theme } from '../types';

/**
 * Cost estimation for slide generation. These are approximations: token counts
 * are estimated from text length (≈4 chars/token) plus a fixed allowance for
 * the image attached to vision models. Actual cost is tracked separately from
 * the usage OpenRouter reports on each completion.
 */

const CHARS_PER_TOKEN = 4;

/** Approximate size of the fixed system-prompt instructions (excluding the template). */
const SYSTEM_OVERHEAD_CHARS = 1800;

/** Wrapper text around each slide's content in the user message. */
const USER_WRAPPER_CHARS = 200;

/** Typical number of output tokens for one slide's HTML fragment. */
const EST_COMPLETION_TOKENS = 900;

/**
 * Approximate prompt tokens charged for attaching one slide image to a vision
 * model that counts images as tokens (used only when the model has no separate
 * per-image price).
 */
const EST_IMAGE_TOKENS = 1100;

/** Estimated output tokens for a theme generation (JSON + template slide). */
const EST_THEME_COMPLETION_TOKENS = 1400;

function estTokens(chars: number): number {
  return Math.ceil(chars / CHARS_PER_TOKEN);
}

export interface SlideCostBreakdown {
  promptTokens: number;
  completionTokens: number;
  usd: number;
}

export interface DeckCostEstimate {
  /** Number of slides included in the estimate. */
  slideCount: number;
  totalUsd: number;
  /** Average per-slide cost. */
  perSlideUsd: number;
  promptTokens: number;
  completionTokens: number;
  /** True when the model prices images separately (per image) rather than as tokens. */
  imagesPricedSeparately: boolean;
  /** Whether the estimate assumes the slide image is attached (vision). */
  useVision: boolean;
}

function estimateSlide(
  pricing: OpenRouterModel['pricing'],
  templateChars: number,
  slideTextChars: number,
  useVision: boolean,
): SlideCostBreakdown {
  const separateImage = useVision && pricing.image > 0;

  let promptTokens =
    estTokens(SYSTEM_OVERHEAD_CHARS + templateChars + slideTextChars + USER_WRAPPER_CHARS);
  if (useVision && !separateImage) {
    promptTokens += EST_IMAGE_TOKENS;
  }

  const completionTokens = EST_COMPLETION_TOKENS;

  let usd =
    promptTokens * pricing.prompt +
    completionTokens * pricing.completion +
    pricing.request;
  if (separateImage) usd += pricing.image;

  return { promptTokens, completionTokens, usd };
}

/**
 * Estimate the cost of generating (redesigning) an entire deck with the given
 * model and theme.
 */
export function estimateDeckCost(
  model: OpenRouterModel | undefined,
  slides: SlideData[],
  theme: Theme,
  useVision: boolean,
): DeckCostEstimate | null {
  if (!model) return null;

  // Only one layout template is included per slide prompt, so use the average
  // template length as the representative overhead.
  const templateLengths = theme.templates?.length
    ? theme.templates.map((t) => t.html.length)
    : theme.templateHtml
      ? [theme.templateHtml.length]
      : [];
  const templateChars = templateLengths.length
    ? Math.round(templateLengths.reduce((a, b) => a + b, 0) / templateLengths.length)
    : 0;
  let totalUsd = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  for (const slide of slides) {
    const b = estimateSlide(model.pricing, templateChars, slide.originalText.length, useVision);
    totalUsd += b.usd;
    promptTokens += b.promptTokens;
    completionTokens += b.completionTokens;
  }

  const count = slides.length || 1;
  return {
    slideCount: slides.length,
    totalUsd,
    perSlideUsd: totalUsd / count,
    promptTokens,
    completionTokens,
    imagesPricedSeparately: useVision && model.pricing.image > 0,
    useVision,
  };
}

/**
 * Estimate the cost of generating a new theme: the JSON design plus one chat
 * call per layout template in the family.
 */
export function estimateThemeCost(
  model: OpenRouterModel | undefined,
  templateCount = 6,
): number | null {
  if (!model) return null;
  const designCost =
    estTokens(SYSTEM_OVERHEAD_CHARS) * model.pricing.prompt +
    EST_THEME_COMPLETION_TOKENS * model.pricing.completion +
    model.pricing.request;
  const perTemplate =
    estTokens(SYSTEM_OVERHEAD_CHARS) * model.pricing.prompt +
    EST_COMPLETION_TOKENS * model.pricing.completion +
    model.pricing.request;
  return designCost + perTemplate * templateCount;
}

/** Format a USD amount with sensible precision for small values. */
export function formatUsd(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

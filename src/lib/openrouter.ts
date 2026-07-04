import type { OpenRouterModel, Usage } from '../types';

const BASE_URL = 'https://openrouter.ai/api/v1';

export interface ChatMessageContentText {
  type: 'text';
  text: string;
}

export interface ChatMessageContentImage {
  type: 'image_url';
  image_url: { url: string };
}

export type ChatMessageContent = ChatMessageContentText | ChatMessageContentImage;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatMessageContent[];
}

function headers(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    // Optional attribution headers recommended by OpenRouter.
    'HTTP-Referer': window.location.origin,
    'X-Title': 'AI Slop Slides',
  };
}

/** Fetch the list of available models from OpenRouter. */
export async function fetchModels(apiKey: string): Promise<OpenRouterModel[]> {
  const res = await fetch(`${BASE_URL}/models`, {
    headers: apiKey ? headers(apiKey) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch models (${res.status})`);
  }
  const data = (await res.json()) as {
    data: Array<{
      id: string;
      name?: string;
      architecture?: { input_modalities?: string[] };
      pricing?: {
        prompt?: string;
        completion?: string;
        image?: string;
        request?: string;
      };
    }>;
  };
  return data.data
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      inputModalities: m.architecture?.input_modalities ?? ['text'],
      pricing: {
        prompt: Number(m.pricing?.prompt ?? 0) || 0,
        completion: Number(m.pricing?.completion ?? 0) || 0,
        image: Number(m.pricing?.image ?? 0) || 0,
        request: Number(m.pricing?.request ?? 0) || 0,
      },
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface ChatOptions {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  signal?: AbortSignal;
  /** Called with token/cost usage reported by the completion, when available. */
  onUsage?: (usage: Usage) => void;
}

/** Run a chat completion and return the assistant's text content. */
export async function chat(options: ChatOptions): Promise<string> {
  const { apiKey, model, messages, temperature, signal, onUsage } = options;
  if (!apiKey) throw new Error('Missing OpenRouter API key. Open Settings to add one.');
  if (!model) throw new Error('No model selected. Open Settings to choose a model.');

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      model,
      messages,
      temperature: temperature ?? 0.7,
      // Ask OpenRouter to include actual token counts and cost in the response.
      usage: { include: true },
    }),
    signal,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message ?? JSON.stringify(err);
    } catch {
      detail = await res.text();
    }
    throw new Error(`OpenRouter request failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      cost?: number;
    };
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Model returned an empty response.');

  if (onUsage && data.usage) {
    onUsage({
      promptTokens: data.usage.prompt_tokens ?? 0,
      completionTokens: data.usage.completion_tokens ?? 0,
      costUsd: data.usage.cost ?? 0,
    });
  }

  return content;
}

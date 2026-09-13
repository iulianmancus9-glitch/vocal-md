/**
 * Apelul către Gemini prin OpenRouter. Întoarce versurile validate sau un refuz.
 */
import { env } from '@/lib/env';
import { REGEN_HINT, SYSTEM_PROMPT } from './prompt';
import type { LyricsOutcome, SongBrief } from './types';

const URL = 'https://openrouter.ai/api/v1/chat/completions';

/** Scoate gardurile de markdown dacă modelul le adaugă totuși. */
function stripFences(text: string): string {
  return text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

/** Caută primul obiect JSON complet din text, ca plasă de siguranță. */
function extractJson(text: string): Record<string, unknown> {
  const clean = stripFences(text);
  try {
    return JSON.parse(clean) as Record<string, unknown>;
  } catch {
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start === -1 || end === -1) {
      throw new Error('Răspunsul nu conține JSON:\n' + clean.slice(0, 500));
    }
    return JSON.parse(clean.slice(start, end + 1)) as Record<string, unknown>;
  }
}

export interface GenerateLyricsOptions {
  /** La regenerare cerem explicit un alt unghi, altfel modelul repetă aceeași variantă. */
  regenerate?: boolean;
  /** Textele deja respinse, ca modelul să nu se întoarcă la ele. */
  previousLyrics?: string[];
  signal?: AbortSignal;
}

export async function generateLyrics(
  brief: SongBrief,
  opts: GenerateLyricsOptions = {},
): Promise<LyricsOutcome> {
  const messages: { role: 'system' | 'user'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(brief, null, 2) },
  ];

  if (opts.regenerate) {
    const seen = (opts.previousLyrics ?? []).slice(-2);
    messages.push({
      role: 'user',
      content: seen.length
        ? `${REGEN_HINT}\n\nVariante deja respinse:\n\n${seen.join('\n\n---\n\n')}`
        : REGEN_HINT,
    });
  }

  const res = await fetch(URL, {
    method: 'POST',
    signal: opts.signal ?? AbortSignal.timeout(120_000),
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.APP_URL,
      'X-Title': 'Vocal MD',
    },
    body: JSON.stringify({
      model: env.GEMINI_MODEL,
      temperature: env.GEMINI_TEMPERATURE,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter a răspuns ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('OpenRouter a răspuns fără conținut: ' + JSON.stringify(data).slice(0, 500));
  }

  const out = extractJson(text);

  if (out.ok === false) {
    return { ok: false, reason: String(out.reason ?? 'Comanda nu poate fi procesată.') };
  }
  if (!out.lyrics || !out.title) {
    throw new Error('Răspunsul nu conține titlu sau versuri: ' + JSON.stringify(out).slice(0, 500));
  }

  return {
    ok: true,
    title: String(out.title).slice(0, 90),
    lyrics: String(out.lyrics),
    styleHint: String(out.style_hint ?? ''),
  };
}

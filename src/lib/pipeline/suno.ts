/**
 * Clientul pentru sunoapi.org: creează taskul, așteaptă rezultatul, descarcă piesele.
 *
 * În producție primim rezultatul prin callback (`SUNO_CALLBACK_URL`), dar păstrăm și
 * polling-ul: callback-urile se pierd, iar o comandă plătită nu are voie să rămână
 * blocată pentru că un webhook n-a ajuns.
 */
import { writeFile } from 'node:fs/promises';
import { env } from '@/lib/env';
import { GENDER_MAP } from './prompt';
import type { SunoTrack } from './types';

const BASE = 'https://api.sunoapi.org';

const FINAL_OK = ['SUCCESS'];
const FINAL_BAD = [
  'CREATE_TASK_FAILED',
  'GENERATE_AUDIO_FAILED',
  'CALLBACK_EXCEPTION',
  'SENSITIVE_WORD_ERROR',
];

/** Erori pe care are rost să le reîncercăm; restul sunt definitive. */
const RETRYABLE_CODES = new Set([430, 455, 500, 502, 503]);

export class SunoError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'SunoError';
  }
}

async function apiCall<T>(
  path: string,
  { method = 'GET', body }: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    signal: AbortSignal.timeout(60_000),
    headers: {
      Authorization: `Bearer ${env.SUNO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json: { code: number; msg: string; data: T };
  try {
    json = JSON.parse(text);
  } catch {
    throw new SunoError(
      `Suno a răspuns ${res.status}, conținut necitibil: ${text.slice(0, 300)}`,
      res.status,
      true,
    );
  }

  if (json.code !== 200) {
    const explicatii: Record<number, string> = {
      401: 'cheia API e greșită sau lipsește',
      405: 'ai depășit limita de apeluri',
      413: 'versurile sau stilul sunt prea lungi',
      429: 'nu mai ai credite',
      430: 'prea multe cereri într-un timp scurt',
      455: 'sunoapi e în mentenanță',
    };
    const extra = explicatii[json.code] ? ` (${explicatii[json.code]})` : '';
    throw new SunoError(
      `Suno: cod ${json.code}${extra} — ${json.msg}`,
      json.code,
      RETRYABLE_CODES.has(json.code),
    );
  }
  return json.data;
}

export interface CreateTaskInput {
  lyrics: string;
  style: string;
  title: string;
  voice: string;
  callBackUrl?: string;
}

/**
 * Lansează generarea. Întoarce taskId.
 * customMode + instrumental:false înseamnă că versurile noastre sunt cântate exact.
 */
export async function createTask(input: CreateTaskInput): Promise<string> {
  const body = {
    customMode: true,
    instrumental: false,
    prompt: input.lyrics.slice(0, 5000),
    style: input.style.slice(0, 1000),
    title: input.title.slice(0, 90),
    model: env.SUNO_MODEL,
    callBackUrl: input.callBackUrl ?? env.SUNO_CALLBACK_URL,
    vocalGender: GENDER_MAP[input.voice] ?? 'm',
  };

  const data = await apiCall<{ taskId?: string }>('/api/v1/generate', { method: 'POST', body });
  if (!data?.taskId) throw new Error('Suno nu a returnat taskId: ' + JSON.stringify(data));
  return data.taskId;
}

interface RecordInfo {
  status?: string;
  errorMessage?: string;
  response?: { sunoData?: { id: string; audio_url: string; duration?: number; title?: string }[] };
}

/** Starea curentă a unui task, fără să aștepte. Folosită și de callback. */
export async function getTask(taskId: string): Promise<RecordInfo> {
  return apiCall<RecordInfo>(
    `/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
  );
}

function toTracks(info: RecordInfo): SunoTrack[] {
  return (info.response?.sunoData ?? []).map((p) => ({
    id: p.id,
    audioUrl: p.audio_url,
    duration: p.duration,
    title: p.title,
  }));
}

export interface WaitOptions {
  timeoutMs?: number;
  everyMs?: number;
  onTick?: (status: string, elapsedSeconds: number) => void;
}

/** Interoghează starea până la final. */
export async function waitForTask(taskId: string, opts: WaitOptions = {}): Promise<SunoTrack[]> {
  const { timeoutMs = 8 * 60 * 1000, everyMs = 8000, onTick } = opts;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const info = await getTask(taskId);
    const status = info.status ?? 'UNKNOWN';
    onTick?.(status, Math.round((Date.now() - start) / 1000));

    if (FINAL_OK.includes(status)) {
      const tracks = toTracks(info);
      if (!tracks.length) throw new Error('Task încheiat cu SUCCESS dar fără piese.');
      return tracks;
    }

    if (FINAL_BAD.includes(status)) {
      const motiv = info.errorMessage || 'fără detalii';
      // Filtrul de conținut nu se rezolvă prin reîncercare; comanda trebuie refuzată.
      throw new SunoError(
        `Generarea a eșuat, stare ${status}: ${motiv}`,
        status === 'SENSITIVE_WORD_ERROR' ? 451 : 500,
        false,
      );
    }

    await new Promise((r) => setTimeout(r, everyMs));
  }

  throw new Error(
    `Timp expirat după ${Math.round(timeoutMs / 1000)}s. Taskul ${taskId} încă rulează.`,
  );
}

/** Descarcă un fișier audio pe disc. Linkurile Suno expiră în 14 zile. */
export async function downloadTrack(url: string, destPath: string): Promise<number> {
  const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new Error(`Descărcarea a eșuat (${res.status}) pentru ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
  return buf.length;
}

/** Câte credite mai avem. Verificat înainte de fiecare generare. */
export async function getCredits(): Promise<unknown> {
  return apiCall('/api/v1/generate/credit');
}

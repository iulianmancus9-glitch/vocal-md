/**
 * Ajutoare pentru rutele API.
 *
 * Regula pentru mesajele de eroare: spun ce s-a întâmplat și ce poate face omul,
 * în română, fără detalii tehnice. Detaliile tehnice merg în log, nu în browser.
 */
import { ZodError } from 'zod';

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function fail(message: string, status = 400, extra: Record<string, unknown> = {}): Response {
  return Response.json({ error: message, ...extra }, { status });
}

/** Prinde ce scapă dintr-o rută, loghează tehnic și răspunde omenește. */
export async function guard(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return fail(first?.message ?? 'Datele trimise nu sunt complete.', 422);
    }
    console.error('Eroare în rută:', err);
    return fail('Ceva n-a mers la noi. Încearcă din nou în câteva momente.', 500);
  }
}

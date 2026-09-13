/**
 * Vorbirea cu serverul, dinspre browser.
 *
 * Erorile vin de la server deja formulate pentru om („Ai cerut multe versuri
 * astăzi…"), deci le lăsăm să treacă neatinse. Doar când cade rețeaua punem noi
 * un mesaj, pentru că atunci serverul n-a apucat să spună nimic.
 */

async function call(url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      credentials: 'same-origin',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      ...options,
    });
  } catch {
    throw new Error('Nu am putut ajunge la server. Verifică conexiunea și încearcă din nou.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ceva n-a mers. Încearcă din nou.');
  return data;
}

export const api = {
  create: (payload) => call('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  get: (id) => call(`/api/orders/${id}`),
  list: () => call('/api/orders'),
  regenerate: (id) => call(`/api/orders/${id}/lyrics`, { method: 'POST' }),
  saveLyrics: (id, lyrics) =>
    call(`/api/orders/${id}/lyrics`, { method: 'PATCH', body: JSON.stringify({ lyrics }) }),
  approve: (id) => call(`/api/orders/${id}/approve`, { method: 'POST' }),
  newRecording: (id) => call(`/api/orders/${id}/render`, { method: 'POST' }),
  chooseRecording: (id, renderId) =>
    call(`/api/orders/${id}/recording`, { method: 'POST', body: JSON.stringify({ renderId }) }),
  restoreLyrics: (id, version) =>
    call(`/api/orders/${id}/lyrics/restore`, { method: 'POST', body: JSON.stringify({ version }) }),
};

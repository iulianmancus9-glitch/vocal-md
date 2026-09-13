/**
 * Forma comenzii așa cum o vede pipeline-ul.
 *
 * Cheile sunt în română pentru că exact acest obiect ajunge în promptul lui Gemini,
 * iar promptul a fost reglat pe el. Baza de date folosește nume englezești;
 * traducerea se face o singură dată, în `briefFromOrder`.
 */
export interface SongBrief {
  stil: string;           // Romantic, Manele, Pop...
  directie?: string;      // Baladă, Trap, Bossa nova...
  stare?: string;         // Tandră, De chef...
  voce: 'Femeie' | 'Bărbat';
  destinatar: string;     // Soție, Mamă, un text liber dacă e „Altcineva"
  nume: string[];
  ocazie: string;
  limba: string;          // Română, Engleză, Italiană, Rusă
  titlu_dorit?: string;
  poveste: string;
}

export interface LyricsResult {
  ok: true;
  title: string;
  lyrics: string;
  styleHint: string;
}

export interface LyricsRefusal {
  ok: false;
  /** Motivul, formulat neutru — ajunge la client ca atare. */
  reason: string;
}

export type LyricsOutcome = LyricsResult | LyricsRefusal;

export interface SunoTrack {
  id: string;
  audioUrl: string;
  duration?: number;
  title?: string;
}

/**
 * Ce acceptăm de la formular.
 *
 * Alegerile trebuie să fie din listele noastre, nu text liber: ajung în promptul
 * lui Gemini și în șirul de stil al lui Suno, iar un câmp liber acolo ar fi o
 * ușă deschisă. Textul liber e permis doar unde chiar e nevoie — povestea,
 * numele, titlul — și e limitat ca lungime.
 */
import { z } from 'zod';
import { STYLE_NAMES } from '@/lib/pipeline/brief';
import { LANG_MAP, MOOD_MAP } from '@/lib/pipeline/prompt';

const RECIPIENTS = [
  'Iubită', 'Iubit', 'Soție', 'Soț', 'Mamă', 'Tată', 'Părinți', 'Fiică',
  'Fiu', 'Soră', 'Frate', 'Prietenă', 'Prieten', 'Bunici', 'Altcineva',
] as const;

const OCCASIONS = [
  'Zi de naștere', 'Aniversare de cuplu', 'Nuntă', 'Cerere în căsătorie',
  'Cumătrie', '8 Martie', 'Ziua Îndrăgostiților', 'Sărbători de iarnă',
  'Absolvire', 'Pensionare', 'Îmi cer scuze', 'Fără ocazie anume', 'Altă ocazie',
] as const;

const shortText = (max: number) => z.string().trim().min(1).max(max);

export const orderInput = z
  .object({
    style: z.enum(Object.keys(STYLE_NAMES) as [string, ...string[]]),
    sub: shortText(60),
    mood: z.enum(Object.keys(MOOD_MAP) as [string, ...string[]]),
    voice: z.enum(['Femeie', 'Bărbat']),

    recipient: z.enum(RECIPIENTS),
    recipientOther: z.string().trim().max(60).optional().default(''),
    names: z.array(z.string().trim().max(40)).min(1).max(4),
    occasion: z.enum(OCCASIONS),
    occasionOther: z.string().trim().max(60).optional().default(''),

    mode: z.enum(['ai', 'own']),
    title: shortText(60),
    story: shortText(2000),
    lang: z.enum(Object.keys(LANG_MAP) as [string, ...string[]]),

    email: z.email().max(160),
    newsletter: z.boolean().optional().default(false),
    /** Bifa de acceptare a Termenilor. Fără ea nu se creează comanda. */
    terms: z.literal(true),
  })
  .refine((d) => d.names.some((n) => n.length > 0), {
    message: 'Cel puțin un nume trebuie completat.',
    path: ['names'],
  })
  .refine((d) => d.recipient !== 'Altcineva' || d.recipientOther.length > 0, {
    message: 'Spune cine este persoana.',
    path: ['recipientOther'],
  })
  .refine((d) => d.occasion !== 'Altă ocazie' || d.occasionOther.length > 0, {
    message: 'Spune ce ocazie este.',
    path: ['occasionOther'],
  });

export type OrderInput = z.infer<typeof orderInput>;

export const lyricsEdit = z.object({
  lyrics: z.string().trim().min(20).max(5000),
});

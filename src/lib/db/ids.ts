/**
 * Identificatorii publici.
 *
 * `publicId` apare în URL, deci e scurt și fără caractere ambigue — omul îl poate
 * citi la telefon fără să confunde O cu 0. `accessToken` nu apare niciodată la
 * vedere, deci e lung și din alfabetul complet.
 */
import { customAlphabet, nanoid } from 'nanoid';

/** Fără 0/O și 1/l/I, ca să poată fi dictat. 12 caractere ≈ 4.7e17 combinații. */
const readable = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 12);

export const newPublicId = () => readable();
export const newAccessToken = () => nanoid(40);

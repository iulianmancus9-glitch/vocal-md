-- Plățile trec de la Paddle la Lemon Squeezy.
--
-- Paddle a refuzat domeniul de cinci ori: politica lor începe cu „Paddle is
-- built to serve software companies", iar noi vindem fișiere audio. Lemon
-- Squeezy acceptă explicit „photos, audio, video".
--
-- Rândurile vechi rămân cum sunt: o plată făcută prin Paddle a fost făcută prin
-- Paddle, iar `provider` spune adevărul despre ea. Se schimbă doar ce se scrie
-- de acum înainte, când coloana nu e completată explicit.
ALTER TABLE "payments" ALTER COLUMN "provider" SET DEFAULT 'lemon';

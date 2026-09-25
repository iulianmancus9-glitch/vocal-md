-- Din ce țară a venit comanda.
--
-- Codul de două litere pus de Cloudflare la fiecare cerere, citit o dată, la
-- creare. Antetul nu mai există când te uiți în panou peste o lună, deci
-- trebuie păstrat pe rând.
--
-- Comenzile de dinainte rămân cu NULL: nu avem de unde ști de unde au venit,
-- iar o ghicire după adresa IP păstrată ar fi fost o presupunere scrisă ca
-- adevăr. În panou apar ca „necunoscută", ceea ce chiar sunt.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "country" text;
--> statement-breakpoint
-- Statistica grupează după coloana asta, pe toate comenzile.
CREATE INDEX IF NOT EXISTS "orders_country_idx" ON "orders" ("country");

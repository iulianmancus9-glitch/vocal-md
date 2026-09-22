/**
 * VOCAL MD — schema bazei de date.
 *
 * Firul unei comenzi, de la stânga la dreapta:
 *
 *   orders ──┬── lyrics_versions   fiecare generare sau editare a versurilor
 *            ├── order_tracks      cele două variante cântate, plus previzualizările
 *            ├── payments          tranzacția, așa cum a fost confirmată
 *            ├── emails            ce i-am trimis clientului și dacă a plecat
 *            └── order_events      urma auditabilă: ce s-a întâmplat și când
 *
 *   jobs             coada de lucru a worker-ului (Postgres, fără Redis)
 *   webhook_events    idempotență pentru Telegram și Suno
 *   rate_limits       apărarea previzualizării gratuite, care ne costă credite reale
 *
 * Două reguli de care atârnă partea juridică:
 *  · `withdrawal_waived_at` și `terms_accepted_at` se scriu o singură dată, la checkout.
 *    Fără ele nu putem susține renunțarea la dreptul de retragere de 14 zile.
 *  · `expires_at` traduce în coloană politica de retenție: 30 de zile pentru comenzile
 *    neplătite, 24 de luni pentru cele plătite.
 */
import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/* ══════════════════════════════════════════════════════════════
   TIPURI
   ══════════════════════════════════════════════════════════════ */

/**
 * Drumul normal al unei comenzi:
 *   draft → lyrics_ready → rendering → preview_ready → payment_claimed → paid → delivered
 * Ramurile scurte: failed (eroare tehnică), refused (filtru de conținut), expired (retenție).
 *
 * `payment_claimed` e starea în care clientul **spune** că a plătit, dar noi n-am
 * văzut încă banii. Linkul MAIB e fix și nu ne anunță nimic, deci cineva
 * trebuie să se uite în cont și să confirme. Până atunci comanda nu e plătită:
 * melodia rămâne închisă, iar retenția rămâne cea de comandă neplătită. Dacă
 * plata nu se confirmă, comanda se întoarce la `preview_ready`, de unde a venit.
 */
export const orderStatus = pgEnum('order_status', [
  'draft',
  'lyrics_pending',
  'lyrics_ready',
  'rendering',
  'preview_ready',
  'payment_claimed',
  'paid',
  'delivered',
  'failed',
  'refused',
  'expired',
]);

export const lyricsSource = pgEnum('lyrics_source', [
  'ai',            // generate de Gemini
  'ai_regen',      // o variantă nouă cerută de client
  'user_edit',     // clientul a modificat textul primit
  'user_provided', // clientul și-a adus propriile versuri
]);

export const jobType = pgEnum('job_type', [
  'lyrics',   // cere versurile de la Gemini
  'render',   // trimite la Suno, descarcă, taie previzualizările
  'deliver',  // trimite emailul cu melodia completă
  'cleanup',  // șterge comenzile expirate și fișierele lor
]);

export const jobStatus = pgEnum('job_status', [
  'queued',
  'running',
  'done',
  'failed',
  'canceled',
]);

export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'completed',
  'refunded',
  'partially_refunded',
  'failed',
  'disputed',
  'canceled',
]);

export const emailStatus = pgEnum('email_status', ['queued', 'sent', 'failed']);

export const renderStatus = pgEnum('render_status', ['pending', 'running', 'done', 'failed']);

/* ══════════════════════════════════════════════════════════════
   COMENZI
   ══════════════════════════════════════════════════════════════ */

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Apare în URL: /comanda/<public_id>. Scurt, dar imposibil de ghicit prin numărare. */
    publicId: text('public_id').notNull(),
    /** Secretul care dovedește că e comanda ta. Stă în cookie și în linkurile din email. */
    accessToken: text('access_token').notNull(),

    status: orderStatus('status').notNull().default('draft'),
    locale: text('locale').notNull().default('ro'),

    /* ─── clientul ─── */
    email: text('email'),
    newsletterOptIn: boolean('newsletter_opt_in').notNull().default(false),

    /* ─── formularul, pasul cu pasul ─── */
    styleId: text('style_id'),                 // romantic, manele, pop...
    direction: text('direction'),              // sub-stilul: Baladă, Trap...
    mood: text('mood'),                        // Tandră, De chef...
    voice: text('voice'),                      // Femeie | Bărbat
    recipient: text('recipient'),              // Soție, Mamă...
    recipientOther: text('recipient_other'),   // completat doar dacă recipient = Altcineva
    names: text('names').array().notNull().default(sql`'{}'::text[]`),
    occasion: text('occasion'),
    occasionOther: text('occasion_other'),
    lyricsMode: text('lyrics_mode').notNull().default('ai'), // ai | own
    titleWanted: text('title_wanted'),
    story: text('story'),
    language: text('language').notNull().default('Română'),

    /* ─── rezultatul generării ─── */
    songTitle: text('song_title'),
    lyrics: text('lyrics'),
    /** Șirul trimis efectiv la Suno; îl păstrăm ca să putem reproduce o generare. */
    styleString: text('style_string'),
    lyricsVersion: integer('lyrics_version').notNull().default(0),
    /** Câte variante noi de versuri mai poate cere clientul, gratuit. */
    regensLeft: integer('regens_left').notNull().default(2),
    /**
     * Câte înregistrări în plus mai poate cere, după prima.
     *
     * Fiecare costă credite Suno reale, deci e o manetă de business, nu doar de
     * interfață: se reglează din MAX_EXTRA_RENDERS fără a atinge codul.
     */
    rendersLeft: integer('renders_left').notNull().default(2),
    /** Înregistrarea pe care o ascultă acum clientul. */
    currentRenderId: uuid('current_render_id'),
    sunoModel: text('suno_model'),

    /* ─── consimțăminte, pentru partea juridică ─── */
    termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
    /** Bifa prin care clientul cere livrarea imediată și pierde retragerea de 14 zile. */
    withdrawalWaivedAt: timestamp('withdrawal_waived_at', { withTimezone: true }),
    legalVersion: text('legal_version'),
    consentIp: text('consent_ip'),
    consentUserAgent: text('consent_user_agent'),

    /* ─── eșec ─── */
    failureCode: text('failure_code'),
    failureMessage: text('failure_message'),

    /* ─── timpi ─── */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lyricsReadyAt: timestamp('lyrics_ready_at', { withTimezone: true }),
    previewReadyAt: timestamp('preview_ready_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    /** Politica de retenție, scrisă ca dată: 30 de zile neplătit, 24 de luni plătit. */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('orders_public_id_key').on(t.publicId),
    index('orders_status_idx').on(t.status),
    index('orders_email_idx').on(t.email),
    index('orders_expires_at_idx').on(t.expiresAt),
    index('orders_created_at_idx').on(t.createdAt),
  ],
);

/* ══════════════════════════════════════════════════════════════
   VERSURI
   ══════════════════════════════════════════════════════════════ */

/**
 * Fiecare versiune a versurilor rămâne, inclusiv cele refuzate de client.
 * Ne trebuie ca să putem reveni la o variantă anterioară și ca să vedem,
 * peste o lună, ce fel de texte cer regenerare.
 */
export const lyricsVersions = pgTable(
  'lyrics_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    source: lyricsSource('source').notNull(),
    title: text('title'),
    lyrics: text('lyrics').notNull(),
    /** Sugestia de producție întoarsă de model, intră în șirul de stil pentru Suno. */
    styleHint: text('style_hint'),
    model: text('model'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('lyrics_versions_order_version_key').on(t.orderId, t.version),
    index('lyrics_versions_order_idx').on(t.orderId),
  ],
);

/* ══════════════════════════════════════════════════════════════
   ÎNREGISTRĂRI
   ══════════════════════════════════════════════════════════════ */

/**
 * O înregistrare = un task Suno = două interpretări cântate.
 *
 * Clientul poate cere mai multe înregistrări ale aceluiași text, sau ale unui
 * text modificat între timp. Fiecare rămâne, cu piesele ei, ca să se poată
 * întoarce la ea dacă i-a plăcut mai mult decât ce a venit după.
 *
 * `lyricsVersion` leagă înregistrarea de textul exact care a fost cântat —
 * altfel, după o editare a versurilor, n-am mai ști ce s-a auzit în fiecare.
 */
export const renders = pgTable(
  'renders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    /** 1, 2, 3… în ordinea în care au fost cerute. */
    generation: integer('generation').notNull(),
    lyricsVersion: integer('lyrics_version').notNull(),
    sunoTaskId: text('suno_task_id'),
    sunoModel: text('suno_model'),
    styleString: text('style_string'),
    status: renderStatus('status').notNull().default('pending'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('renders_order_generation_key').on(t.orderId, t.generation),
    uniqueIndex('renders_suno_task_key')
      .on(t.sunoTaskId)
      .where(sql`${t.sunoTaskId} is not null`),
    index('renders_order_idx').on(t.orderId),
  ],
);

/* ══════════════════════════════════════════════════════════════
   PIESE
   ══════════════════════════════════════════════════════════════ */

/**
 * Cele două interpretări pe care le întoarce Suno pentru o înregistrare.
 * `source_url` expiră la ei în 14 zile, de asta descărcăm fișierele la noi imediat.
 */
export const orderTracks = pgTable(
  'order_tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    renderId: uuid('render_id')
      .notNull()
      .references(() => renders.id, { onDelete: 'cascade' }),
    variant: smallint('variant').notNull(), // 1 sau 2
    sunoAudioId: text('suno_audio_id'),

    /** Căi relative la STORAGE_DIR. Fișierele nu sunt niciodată servite direct. */
    fullPath: text('full_path'),
    previewPath: text('preview_path'),
    fullBytes: bigint('full_bytes', { mode: 'number' }),
    previewBytes: bigint('preview_bytes', { mode: 'number' }),
    durationSeconds: real('duration_seconds'),

    sourceUrl: text('source_url'),
    sourceExpiresAt: timestamp('source_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('order_tracks_render_variant_key').on(t.renderId, t.variant),
    index('order_tracks_order_idx').on(t.orderId),
  ],
);

/* ══════════════════════════════════════════════════════════════
   PLĂȚI
   ══════════════════════════════════════════════════════════════ */

/**
 * Plățile. Răspund la o singură întrebare: are dreptul acest client la fișierele
 * integrale?
 *
 * Cu linkul fix de la MAIB nu primim niciun identificator de tranzacție de la
 * bancă, deci `transaction_id` e construit de noi, ca `manual:<comandă>`.
 * Rămâne unic pe comandă, așa că o a doua apăsare pe butonul de deblocare nu
 * scrie un al doilea rând. Când vine Paynet, acolo va intra identificatorul lor.
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    provider: text('provider').notNull().default('maib'),
    transactionId: text('transaction_id').notNull(),
    customerId: text('customer_id'),
    status: paymentStatus('status').notNull().default('pending'),

    /** În cenți, ca să nu existe niciodată o rotunjire în virgulă mobilă. */
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('EUR'),
    refundedCents: integer('refunded_cents').notNull().default(0),
    invoiceNumber: text('invoice_number'),

    /** Ultimul payload primit de la procesator, pentru când ceva nu se potrivește. */
    rawPayload: jsonb('raw_payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('payments_provider_transaction_key').on(t.provider, t.transactionId),
    index('payments_order_idx').on(t.orderId),
    index('payments_status_idx').on(t.status),
  ],
);

/* ══════════════════════════════════════════════════════════════
   WEBHOOK-URI
   ══════════════════════════════════════════════════════════════ */

/**
 * Telegram retrimite o apăsare până îi răspunzi 200, iar Suno poate apela callback-ul
 * de două ori. Cheia unică (provider, event_id) face ca a doua livrare să nu producă
 * nimic: o inserăm, prinde conflictul, ieșim.
 */
export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(), // telegram | suno
    eventId: text('event_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    error: text('error'),
  },
  (t) => [
    uniqueIndex('webhook_events_provider_event_key').on(t.provider, t.eventId),
    index('webhook_events_unprocessed_idx')
      .on(t.receivedAt)
      .where(sql`${t.processedAt} is null`),
  ],
);

/* ══════════════════════════════════════════════════════════════
   COADA DE LUCRU
   ══════════════════════════════════════════════════════════════ */

/**
 * Coada stă în Postgres, nu în Redis: la volumul acestui site, `FOR UPDATE SKIP LOCKED`
 * e suficient și scade cu un serviciu ce trebuie supravegheat pe VPS.
 *
 * Indexul parțial `jobs_active_key` garantează că aceeași comandă nu poate avea două
 * joburi de același tip în lucru — protecția împotriva unui dublu-click care ar
 * consuma de două ori credite Suno.
 */
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: jobType('type').notNull(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }),
    status: jobStatus('status').notNull().default('queued'),
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),

    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    /** Reîncercările folosesc acest câmp pentru pauza exponențială. */
    runAfter: timestamp('run_after', { withTimezone: true }).notNull().defaultNow(),

    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: text('locked_by'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    lastError: text('last_error'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('jobs_pickup_idx')
      .on(t.runAfter)
      .where(sql`${t.status} = 'queued'`),
    index('jobs_order_idx').on(t.orderId),
    uniqueIndex('jobs_active_key')
      .on(t.orderId, t.type)
      .where(sql`${t.status} in ('queued', 'running')`),
  ],
);

/* ══════════════════════════════════════════════════════════════
   EMAIL
   ══════════════════════════════════════════════════════════════ */

/**
 * „Nu am primit melodia" este reclamația numărul unu la acest tip de serviciu.
 * Tabelul răspunde în două secunde dacă emailul a plecat și când.
 */
export const emails = pgTable(
  'emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    toEmail: text('to_email').notNull(),
    template: text('template').notNull(), // lyrics_ready | preview_ready | delivery | refund
    subject: text('subject'),
    providerMessageId: text('provider_message_id'),
    status: emailStatus('status').notNull().default('queued'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (t) => [
    index('emails_order_idx').on(t.orderId),
    index('emails_to_idx').on(t.toEmail),
  ],
);

/* ══════════════════════════════════════════════════════════════
   URMA AUDITABILĂ
   ══════════════════════════════════════════════════════════════ */

/**
 * Un rând per lucru important care s-a întâmplat cu o comandă. Servește la două
 * scopuri: să înțelegem unde abandonează oamenii formularul și să putem răspunde
 * la o solicitare de acces la date fără să reconstituim nimic din memorie.
 */
export const orderEvents = pgTable(
  'order_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // step_completed | lyrics_generated | paid | ...
    data: jsonb('data').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('order_events_order_idx').on(t.orderId, t.createdAt)],
);

/* ══════════════════════════════════════════════════════════════
   LIMITE
   ══════════════════════════════════════════════════════════════ */

/**
 * Previzualizarea de 60 de secunde e gratuită pentru client, dar fiecare apăsare
 * consumă credite Suno plătite de noi. Fără o limită pe IP și pe email, o singură
 * persoană poate goli contul într-o după-amiază.
 *
 * `bucket` arată așa: "render:ip:81.180.0.1:2026-09-13".
 */
export const rateLimits = pgTable(
  'rate_limits',
  {
    bucket: text('bucket').primaryKey(),
    count: integer('count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('rate_limits_expires_idx').on(t.expiresAt)],
);

/* ══════════════════════════════════════════════════════════════
   TIPURI DERIVATE
   ══════════════════════════════════════════════════════════════ */

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderStatus = Order['status'];
export type LyricsVersion = typeof lyricsVersions.$inferSelect;
export type OrderTrack = typeof orderTracks.$inferSelect;
export type Render = typeof renders.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type JobType = Job['type'];
export type OrderEvent = typeof orderEvents.$inferSelect;

/* ══════════════════════════════════════════════════════════════
   RELAȚII  (pentru db.query.orders.findFirst({ with: { tracks: true } }))
   ══════════════════════════════════════════════════════════════ */

export const ordersRelations = relations(orders, ({ many }) => ({
  lyricsVersions: many(lyricsVersions),
  renders: many(renders),
  tracks: many(orderTracks),
  payments: many(payments),
  emails: many(emails),
  events: many(orderEvents),
  jobs: many(jobs),
}));

export const lyricsVersionsRelations = relations(lyricsVersions, ({ one }) => ({
  order: one(orders, { fields: [lyricsVersions.orderId], references: [orders.id] }),
}));

export const rendersRelations = relations(renders, ({ one, many }) => ({
  order: one(orders, { fields: [renders.orderId], references: [orders.id] }),
  tracks: many(orderTracks),
}));

export const orderTracksRelations = relations(orderTracks, ({ one }) => ({
  order: one(orders, { fields: [orderTracks.orderId], references: [orders.id] }),
  render: one(renders, { fields: [orderTracks.renderId], references: [renders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const emailsRelations = relations(emails, ({ one }) => ({
  order: one(orders, { fields: [emails.orderId], references: [orders.id] }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  order: one(orders, { fields: [jobs.orderId], references: [orders.id] }),
}));

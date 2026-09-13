/**
 * Pagina de start. Interfața în șase pași se portează din prototip în pasul următor;
 * până atunci pagina arată doar că aplicația și baza de date sunt în picioare.
 */
export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '64px 20px' }}>
      <h1 style={{ fontSize: 28, letterSpacing: '-0.02em', margin: '0 0 12px' }}>Vocal MD</h1>
      <p style={{ color: 'var(--ink-2)', lineHeight: 1.65, margin: 0 }}>
        Melodii personalizate. Spui povestea, noi scriem versurile și le cântăm.
        Asculți un minut gratuit și plătești doar dacă îți place.
      </p>
      <p style={{ color: 'var(--ink-2)', lineHeight: 1.65, marginTop: 24 }}>
        Site-ul este în construcție.
      </p>
    </main>
  );
}

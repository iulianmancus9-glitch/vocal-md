/**
 * Stilul panoului.
 *
 * Scris de mână, nu adus dintr-o bibliotecă: panoul are cinci feluri de
 * elemente, iar un pachet de componente ar aduce trei sute de kiloocteți ca să
 * deseneze un tabel.
 *
 * Aceleași culori ca site-ul, ca să nu pară altă firmă, dar mai dens: aici
 * omul caută informație, nu e convins să cumpere. Rânduri strânse, cifre
 * aliniate, stările colorate ca să se vadă dintr-o privire care comandă stă.
 */
export const CSS = `
:root {
  --ink: #16161d; --ink-1: #33333d; --ink-2: #4c4c57; --gray: #8a8a96;
  --line: #e7e7ee; --line-2: #d6d6e0; --page: #fff; --tile: #f5f5fa;
  --violet: #6C5CE7; --violet-l: #efedfd; --violet-t: #f7f6ff;
  --green: #0a7d52; --green-l: #e6f6ee;
  --amber: #9a5b0b; --amber-l: #fff3e0;
  --red: #b3261e; --red-l: #fdecea;
}
* { box-sizing: border-box; }
body { margin: 0; background: #fafafd; color: var(--ink);
  font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased; }
a { color: var(--violet); }

.p-head { position: sticky; top: 0; z-index: 10; background: rgba(255,255,255,.88);
  backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
.p-headIn { max-width: 1120px; margin: 0 auto; padding: 12px 20px;
  display: flex; align-items: center; gap: 14px; }
.p-brand { font-weight: 800; letter-spacing: -.02em; font-size: 15px; text-decoration: none; color: var(--ink); }
.p-brand span { color: var(--violet); }
.p-headNote { font-size: 12.5px; color: var(--gray); }
.p-headRight { margin-left: auto; display: flex; align-items: center; gap: 10px; }

.p-wrap { max-width: 1120px; margin: 0 auto; padding: 22px 20px 60px; }
.p-h1 { font-size: 21px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 3px; }
.p-sub { font-size: 13px; color: var(--gray); margin: 0 0 18px; }

/* ─── cifrele de sus ─── */
.p-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 18px; }
@media (min-width: 720px) { .p-stats { grid-template-columns: repeat(4, 1fr); } }
.p-stat { background: var(--page); border: 1px solid var(--line); border-radius: 13px; padding: 13px 14px; }
.p-statNum { font-size: 22px; font-weight: 800; letter-spacing: -.02em; line-height: 1.1; }
.p-statLabel { font-size: 12px; color: var(--gray); margin-top: 2px; }
.p-stat[data-accent="1"] .p-statNum { color: var(--violet); }

/* ─── filtre și căutare ─── */
.p-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; }
.p-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.p-filter { font-size: 12.5px; font-weight: 600; text-decoration: none; color: var(--ink-2);
  background: var(--tile); border: 1px solid transparent; padding: 6px 11px; border-radius: 999px; white-space: nowrap; }
.p-filter:hover { background: var(--violet-l); color: var(--violet); }
.p-filter[data-on="1"] { background: var(--violet); color: #fff; }
.p-search { margin-left: auto; display: flex; gap: 6px; }
.p-input { font: inherit; font-size: 13px; padding: 7px 11px; border: 1px solid var(--line-2);
  border-radius: 9px; background: var(--page); color: var(--ink); min-width: 210px; }
.p-input:focus { outline: 2px solid var(--violet); outline-offset: 1px; border-color: transparent; }
.p-btn { font: inherit; font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 9px;
  border: 1px solid var(--line-2); background: var(--page); color: var(--ink-1); cursor: pointer; text-decoration: none;
  display: inline-flex; align-items: center; gap: 6px; }
.p-btn:hover { border-color: var(--violet); color: var(--violet); }
.p-btn[data-primary="1"] { background: var(--violet); border-color: var(--violet); color: #fff; }
.p-btn[data-primary="1"]:hover { opacity: .92; color: #fff; }

/* ─── tabelul ─── */
.p-card { background: var(--page); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
.p-scroll { overflow-x: auto; }
table.p-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.p-table th { text-align: left; font-size: 11.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .04em; color: var(--gray); padding: 11px 14px; border-bottom: 1px solid var(--line);
  white-space: nowrap; background: #fcfcfe; }
.p-table td { padding: 12px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
.p-table tr:last-child td { border-bottom: 0; }
.p-table tr:hover td { background: #fbfbff; }
.p-num { font-variant-numeric: tabular-nums; }
.p-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
.p-strong { font-weight: 600; }
.p-muted { color: var(--gray); font-size: 12px; }
.p-cut { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ─── stările, colorate ─── */
.p-pill { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 3px 9px;
  border-radius: 999px; white-space: nowrap; background: var(--tile); color: var(--ink-2); }
.p-pill[data-t="paid"] { background: var(--green-l); color: var(--green); }
.p-pill[data-t="wait"] { background: var(--amber-l); color: var(--amber); }
.p-pill[data-t="bad"]  { background: var(--red-l); color: var(--red); }
.p-pill[data-t="work"] { background: var(--violet-l); color: var(--violet); }

/* ─── pagina unei comenzi ─── */
.p-back { font-size: 12.5px; color: var(--gray); text-decoration: none; }
.p-back:hover { color: var(--violet); }
.p-grid { display: grid; gap: 14px; }
@media (min-width: 900px) { .p-grid { grid-template-columns: 1.15fr .85fr; align-items: start; } }
.p-box { background: var(--page); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
.p-boxTitle { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  color: var(--gray); margin: 0 0 12px; }
.p-rows { display: grid; gap: 0; }
.p-row { display: flex; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
.p-row:last-child { border-bottom: 0; }
.p-row dt { color: var(--gray); min-width: 128px; flex: none; margin: 0; }
.p-row dd { margin: 0; flex: 1; min-width: 0; word-break: break-word; }
.p-story { font-size: 13.5px; line-height: 1.65; white-space: pre-wrap; margin: 0;
  background: var(--tile); border-radius: 11px; padding: 13px; }
.p-lyrics { font-size: 13px; line-height: 1.7; white-space: pre-wrap; margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.p-ver { border: 1px solid var(--line); border-radius: 11px; padding: 12px; margin-bottom: 9px; }
.p-ver[data-cur="1"] { border-color: var(--violet); background: var(--violet-t); }
.p-verTop { display: flex; gap: 8px; align-items: center; margin-bottom: 9px; flex-wrap: wrap; }
.p-audio { width: 100%; margin-top: 7px; }
.p-take { border: 1px solid var(--line); border-radius: 11px; padding: 11px; margin-bottom: 9px; }
.p-timeline { display: grid; gap: 0; }
.p-ev { display: flex; gap: 11px; padding: 7px 0; border-bottom: 1px solid var(--line); font-size: 12.5px; }
.p-ev:last-child { border-bottom: 0; }
.p-evTime { color: var(--gray); flex: none; width: 118px; font-variant-numeric: tabular-nums; }
.p-evData { color: var(--gray); font-size: 11.5px; word-break: break-all; }

/* ─── intrarea ─── */
.p-login { min-height: 100dvh; display: grid; place-items: center; padding: 22px; }
.p-loginBox { width: 100%; max-width: 340px; background: var(--page); border: 1px solid var(--line);
  border-radius: 16px; padding: 24px; box-shadow: 0 8px 30px rgba(22,22,29,.06); }
.p-loginTitle { font-size: 18px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 4px; }
.p-loginSub { font-size: 13px; color: var(--gray); margin: 0 0 18px; }
.p-field { width: 100%; font: inherit; padding: 11px 13px; border: 1px solid var(--line-2);
  border-radius: 11px; background: var(--page); color: var(--ink); }
.p-field:focus { outline: 2px solid var(--violet); outline-offset: 1px; border-color: transparent; }
.p-submit { width: 100%; margin-top: 10px; font: inherit; font-weight: 700; padding: 11px;
  border: 0; border-radius: 11px; background: var(--violet); color: #fff; cursor: pointer; }
.p-submit:hover { opacity: .93; }
.p-err { font-size: 12.5px; color: var(--red); background: var(--red-l); border-radius: 9px;
  padding: 9px 11px; margin: 0 0 14px; }
.p-empty { text-align: center; padding: 48px 20px; color: var(--gray); font-size: 13.5px; }
`;
